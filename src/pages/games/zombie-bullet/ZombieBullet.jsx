import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import arenaImage from '../../../assets/zombie-bullet/arena-bg.png'
import gunImage from '../../../assets/zombie-bullet/gun.png'
import zombieImage from '../../../assets/zombie-bullet/zombie-final.png'
import zombieLungeImage from '../../../assets/zombie-bullet/zombie-lunge-final.png'
import { useRoom } from '../../../hooks/useRoom'
import { formatClock, laneForPlayerIndex } from './gameUtils'
import { soundManager } from './sound'
import {
  createBulletGame,
  playerName,
  reduceBulletGame,
  remainingBulletTime,
} from './zombieBulletState'
import './zombie-bullet.css'

const CENTER_LANE = 2;
const START_LANE = 0;
const IMAGE_PATHS = {
  arena: arenaImage,
  zombie: zombieImage,
  zombieLunge: zombieLungeImage,
  gun: gunImage
};
function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}
function easeOutCubic(value) {
  return 1 - Math.pow(1 - clamp(value), 3);
}
function easeInOutCubic(value) {
  const safeValue = clamp(value);
  return safeValue < 0.5 ? 4 * safeValue * safeValue * safeValue : 1 - Math.pow(-2 * safeValue + 2, 3) / 2;
}
function visualLaneAt(visual, now) {
  if (now <= visual.moveStartedAt) {
    return visual.fromLane;
  }
  const movement = clamp(
    (now - visual.moveStartedAt) / visual.moveDuration
  );
  return visual.fromLane + (visual.toLane - visual.fromLane) * easeInOutCubic(movement);
}
function zombieGeometry(width, height, lane, approachProgress) {
  const depth = Math.pow(clamp(approachProgress), 1.28);
  const laneSpacing = width * (0.065 + depth * 0.052);
  const zombieHeight = height * (0.41 + depth * 0.49);
  return {
    x: width * 0.5 + (lane - CENTER_LANE) * laneSpacing,
    baseline: height * (0.7 + depth * 0.23),
    width: zombieHeight * 0.72,
    height: zombieHeight
  };
}
function drawImageCover(context, image, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - drawnWidth) / 2,
    (height - drawnHeight) / 2,
    drawnWidth,
    drawnHeight
  );
}
function playerLane(players, playerId) {
  const playerIndex = players.findIndex((player) => player.player_id === playerId);
  return laneForPlayerIndex(playerIndex, players.length);
}
function resetVisualState(visual, lane = START_LANE) {
  visual.fromLane = lane;
  visual.toLane = lane;
  visual.moveStartedAt = 0;
  visual.moveDuration = 210;
  visual.shotAt = Number.NEGATIVE_INFINITY;
  visual.shotLane = lane;
  visual.explosionAt = Number.POSITIVE_INFINITY;
  visual.explosionLane = lane;
  visual.explosionProgress = 0;
  visual.particlesBuilt = false;
  visual.particles = [];
  visual.loseAt = Number.POSITIVE_INFINITY;
  visual.lastFrameAt = performance.now();
  visual.bloodDrops = Array.from({ length: 24 }, () => ({
    x: Math.random(),
    width: 0.012 + Math.random() * 0.04,
    length: 0.08 + Math.random() * 0.38,
    delay: Math.random() * 750,
    speed: 0.65 + Math.random() * 0.75
  })).sort((left, right) => left.x - right.x);
}
function buildExplosionParticles(geometry) {
  const particles = [];
  const centerY = geometry.baseline - geometry.height * 0.52;
  const makeParticle = (kind, index, total) => {
    const angle = index / total * Math.PI * 2 + (Math.random() - 0.5) * 0.65;
    const outward = geometry.height * (kind === "spark" ? 1.05 + Math.random() : 0.36 + Math.random() * 0.68);
    const sourceX = Math.random();
    const sourceY = Math.random();
    const isSmoke = kind === "smoke";
    const isSpark = kind === "spark";
    const isBone = kind === "bone";
    particles.push({
      kind,
      x: geometry.x + (Math.random() - 0.5) * geometry.width * 0.36,
      y: centerY + (Math.random() - 0.5) * geometry.height * 0.52,
      vx: Math.cos(angle) * outward,
      vy: Math.sin(angle) * outward - geometry.height * (isSmoke ? 0.42 : 0.58 + Math.random() * 0.7),
      rotation: Math.random() * Math.PI * 2,
      rotationVelocity: (Math.random() - 0.5) * (isSpark ? 13 : 8),
      size: geometry.height * (isSpark ? 6e-3 + Math.random() * 8e-3 : isSmoke ? 0.03 + Math.random() * 0.07 : isBone ? 0.018 + Math.random() * 0.022 : 0.014 + Math.random() * 0.038),
      age: 0,
      life: isSpark ? 0.35 + Math.random() * 0.5 : isSmoke ? 1.1 + Math.random() * 1.35 : 0.9 + Math.random() * 1.8,
      color: kind === "spark" ? Math.random() > 0.5 ? "#ffef9c" : "#ff7a18" : kind === "bone" ? "#d6c5a5" : kind === "smoke" ? "#3d302d" : Math.random() > 0.45 ? "#9d1018" : "#3f1717",
      sourceX,
      sourceY
    });
  };
  const groups = [
    ["fragment", 30],
    ["gore", 36],
    ["bone", 11],
    ["spark", 34],
    ["smoke", 16]
  ];
  for (const [kind, amount] of groups) {
    for (let index = 0; index < amount; index += 1) {
      makeParticle(kind, index, amount);
    }
  }
  return particles;
}
function ZombieBullet() {
  const navigate = useNavigate();
  const {
    room,
    activeGame,
    serverError,
    clearActiveGame,
    subscribeGame,
    sendGameMessage
  } = useRoom();
  const initialTimeLimitMs = (activeGame?.startPayload?.time_limit_sec ?? 85) * 1000;
  const [initialStartedAt] = useState(() => activeGame?.startedAt ?? Date.now());
  const [game, setGame] = useState(() => createBulletGame(
      activeGame?.startPayload,
      initialStartedAt
  ));
  const [remainingMs, setRemainingMs] = useState(
    () => Math.max(0, initialTimeLimitMs - (Date.now() - initialStartedAt))
  );
  const [inputValue, setInputValue] = useState("");
  const [pendingAnswer, setPendingAnswer] = useState(false);
  const [visibleFeedback, setVisibleFeedback] = useState(null);
  const [muted, setMuted] = useState(soundManager.isMuted);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const gameRef = useRef(game);
  const phaseRef = useRef("playing");
  const questionRef = useRef({ timeLimitMs: initialTimeLimitMs });
  const remainingMsRef = useRef(initialTimeLimitMs);
  const roundStartedAtRef = useRef(0);
  const composingRef = useRef(false);
  const compositionEndedAtRef = useRef(Number.NEGATIVE_INFINITY);
  const submitLockRef = useRef(Number.NEGATIVE_INFINITY);
  const visualRef = useRef({
    fromLane: START_LANE,
    toLane: START_LANE,
    moveStartedAt: 0,
    moveDuration: 210,
    shotAt: Number.NEGATIVE_INFINITY,
    shotLane: START_LANE,
    explosionAt: Number.POSITIVE_INFINITY,
    explosionLane: START_LANE,
    explosionProgress: 0,
    particlesBuilt: false,
    particles: [],
    loseAt: Number.POSITIVE_INFINITY,
    bloodDrops: [],
    lastFrameAt: 0
  });

  const phase = game.phase;
  const targetHits = game.targetHits;
  const answeredCount = game.correctCount;
  const currentPlayer = playerName(game.players, game.currentPlayerId);
  const isMyTurn = phase === "playing" && game.currentPlayerId === room?.playerId;
  const isSubmitting = pendingAnswer && !serverError;

  useEffect(() => {
    roundStartedAtRef.current =
      performance.now() - Math.max(0, Date.now() - initialStartedAt);
    resetVisualState(
      visualRef.current,
      playerLane(gameRef.current.players, gameRef.current.currentPlayerId)
    );
  }, [initialStartedAt]);

  const toggleSound = useCallback(() => {
    void soundManager.init();
    const nextMuted = soundManager.toggleMuted();
    setMuted(nextMuted);
  }, []);

  useEffect(() => {
    gameRef.current = game;
    phaseRef.current = game.phase;
    questionRef.current = { timeLimitMs: game.timeLimitMs };
  }, [game]);

  useEffect(() => {
    const updateTimer = () => {
      const nextRemaining = remainingBulletTime(gameRef.current);
      remainingMsRef.current = nextRemaining;
      setRemainingMs(nextRemaining);
    };
    updateTimer();
    if (phase !== "playing") return undefined;
    const timer = window.setInterval(updateTimer, 50);
    return () => window.clearInterval(timer);
  }, [game.startedAt, game.timeLimitMs, phase]);

  useEffect(() => {
    if (isMyTurn && !isSubmitting && remainingMs > 0) {
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isMyTurn, isSubmitting, remainingMs]);

  useEffect(() => {
    if (!visibleFeedback) return undefined;
    const feedbackTimer = window.setTimeout(() => setVisibleFeedback(null), 1600);
    return () => window.clearTimeout(feedbackTimer);
  }, [visibleFeedback]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat || event.isComposing) {
        return;
      }
      const target = event.target;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || Boolean(target?.isContentEditable);
      const key = event.key.toLocaleLowerCase();
      if (key === "m" && !isTyping) {
        event.preventDefault();
        toggleSound();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSound]);

  useEffect(() => subscribeGame((type, payload) => {
    const event = {
      type,
      payload,
      receivedAt: Date.now()
    };
    const nextGame = reduceBulletGame(gameRef.current, event);
    gameRef.current = nextGame;
    phaseRef.current = nextGame.phase;
    questionRef.current = { timeLimitMs: nextGame.timeLimitMs };
    setGame(nextGame);

    const now = performance.now();

    if (type === "game:bullet_start") {
      roundStartedAtRef.current = now - Math.max(0, Date.now() - nextGame.startedAt);
      remainingMsRef.current = remainingBulletTime(nextGame);
      setRemainingMs(remainingMsRef.current);
      resetVisualState(
        visualRef.current,
        playerLane(nextGame.players, nextGame.currentPlayerId)
      );
      return;
    }

    if (type === "game:bullet_hit") {
      if (payload.player_id === room?.playerId) {
        setPendingAnswer(false);
        setInputValue("");
      }
      setVisibleFeedback(nextGame.feedback);
      const visual = visualRef.current;
      const visualLane = visualLaneAt(visual, now);
      const nextLane = playerLane(nextGame.players, nextGame.currentPlayerId);
      visual.shotAt = now;
      visual.shotLane = visualLane;
      soundManager.shot();
      window.setTimeout(() => soundManager.hit(), 75);
      visual.fromLane = visualLane;
      visual.toLane = nextLane;
      visual.moveStartedAt = now + 55;
      return;
    }

    if (type === "game:bullet_miss") {
      if (payload.player_id === room?.playerId) {
        setPendingAnswer(false);
        setInputValue("");
      }
      setVisibleFeedback(nextGame.feedback);
      soundManager.error();
      return;
    }

    if (type === "game:player_left") {
      setPendingAnswer(false);
      setVisibleFeedback(nextGame.feedback);
      const visual = visualRef.current;
      const visualLane = visualLaneAt(visual, now);
      const nextLane = playerLane(nextGame.players, nextGame.currentPlayerId);
      visual.fromLane = visualLane;
      visual.toLane = nextLane;
      visual.moveStartedAt = now;
      return;
    }

    if (type === "game:clear") {
      setPendingAnswer(false);
      const visual = visualRef.current;
      const visualLane = visualLaneAt(visual, now);
      const finalLane = playerLane(nextGame.players, nextGame.currentPlayerId);
      if (visual.toLane !== finalLane) {
        visual.fromLane = visualLane;
        visual.toLane = finalLane;
        visual.moveStartedAt = now + 55;
      }
      visual.explosionLane = finalLane;
      visual.explosionProgress = clamp(1 - remainingMsRef.current / nextGame.timeLimitMs);
      const movementEndsAt = visual.moveStartedAt + visual.moveDuration;
      visual.explosionAt = Math.max(now + 115, movementEndsAt);
      visual.particlesBuilt = false;
      window.setTimeout(
        () => soundManager.win(),
        Math.max(0, visual.explosionAt - now - 10)
      );
      return;
    }

    if (type === "game:over") {
      setPendingAnswer(false);
      visualRef.current.loseAt = now;
      visualRef.current.explosionAt = Number.POSITIVE_INFINITY;
      soundManager.lose();
    }
  }), [room?.playerId, subscribeGame]);

  const submitAnswer = useCallback(
    (event) => {
      event.preventDefault();
      const now = performance.now();
      const answer = inputValue.trim();
      if (!answer || !isMyTurn || isSubmitting || remainingMsRef.current <= 0 || composingRef.current || now - compositionEndedAtRef.current < 45 || now - submitLockRef.current < 90) {
        return;
      }
      submitLockRef.current = now;
      void soundManager.init();
      if (sendGameMessage("game:bullet_submit", { answer })) {
        setPendingAnswer(true);
      } else {
        setVisibleFeedback({ id: Date.now(), kind: "incorrect", connectionError: true });
      }
    },
    [inputValue, isMyTurn, isSubmitting, sendGameMessage]
  );
  const handleAnswerKeyDown = useCallback(
    (event) => {
      const nativeEvent = event.nativeEvent;
      if (event.key === "Enter" && (composingRef.current || nativeEvent.isComposing || nativeEvent.keyCode === 229)) {
        event.preventDefault();
      }
    },
    []
  );

  const handleExit = useCallback(() => {
    clearActiveGame();
    navigate(`/room/${room?.roomId}`, { replace: true });
  }, [clearActiveGame, navigate, room?.roomId]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const assets = {};
    for (const [name, path] of Object.entries(IMAGE_PATHS)) {
      const image = new Image();
      assets[name] = { image, ready: false };
      image.addEventListener("load", () => {
        assets[name].ready = true;
      });
      image.src = path;
    }
    let cssWidth = 1;
    let cssHeight = 1;
    let animationFrame = 0;
    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
      cssWidth = Math.max(1, bounds.width);
      cssHeight = Math.max(1, bounds.height);
      canvas.width = Math.round(cssWidth * deviceScale);
      canvas.height = Math.round(cssHeight * deviceScale);
      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    };
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    resizeCanvas();
    const drawArena = (now) => {
      if (assets.arena.ready) {
        drawImageCover(context, assets.arena.image, cssWidth, cssHeight);
      } else {
        const background = context.createLinearGradient(0, 0, 0, cssHeight);
        background.addColorStop(0, "#071115");
        background.addColorStop(0.45, "#182026");
        background.addColorStop(1, "#050708");
        context.fillStyle = background;
        context.fillRect(0, 0, cssWidth, cssHeight);
      }
      const darkness = context.createLinearGradient(0, 0, 0, cssHeight);
      darkness.addColorStop(0, "rgba(0, 8, 10, .34)");
      darkness.addColorStop(0.55, "rgba(1, 4, 5, .08)");
      darkness.addColorStop(1, "rgba(0, 0, 0, .62)");
      context.fillStyle = darkness;
      context.fillRect(0, 0, cssWidth, cssHeight);
      context.save();
      context.globalAlpha = 0.2;
      context.lineWidth = Math.max(1, cssWidth * 15e-4);
      for (let line = 0; line <= 5; line += 1) {
        const bottomX = cssWidth * (0.075 + line * 0.17);
        context.strokeStyle = line === 0 || line === 5 ? "#9d211e" : "#d8b861";
        context.beginPath();
        context.moveTo(cssWidth * 0.5, cssHeight * 0.39);
        context.lineTo(bottomX, cssHeight * 1.02);
        context.stroke();
      }
      context.restore();
      if (!reducedMotion) {
        context.save();
        context.globalCompositeOperation = "screen";
        for (let index = 0; index < 26; index += 1) {
          const seed = index * 91.713;
          const x = (Math.sin(seed) * 0.5 + 0.5) * cssWidth;
          const travel = (now * (9e-3 + index % 5 * 2e-3) + seed * 7) % cssHeight;
          const y = cssHeight - travel;
          const size = 0.6 + index % 4 * 0.45;
          context.fillStyle = index % 3 === 0 ? "rgba(255,92,41,.2)" : "rgba(206,210,184,.12)";
          context.beginPath();
          context.arc(x, y, size, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
      }
    };
    const drawFallbackZombie = (geometry, hitStrength) => {
      const { x, baseline, width, height } = geometry;
      context.save();
      context.translate(x, baseline);
      context.fillStyle = hitStrength > 0 ? "#eee2c8" : "#53624c";
      context.beginPath();
      context.ellipse(0, -height * 0.48, width * 0.36, height * 0.42, 0, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.arc(0, -height * 0.86, width * 0.23, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#2d342b";
      context.lineWidth = Math.max(3, width * 0.08);
      context.beginPath();
      context.moveTo(-width * 0.22, -height * 0.65);
      context.lineTo(-width * 0.55, -height * 0.26);
      context.moveTo(width * 0.22, -height * 0.65);
      context.lineTo(width * 0.55, -height * 0.26);
      context.stroke();
      context.fillStyle = "#ff2a1d";
      context.beginPath();
      context.arc(-width * 0.08, -height * 0.89, width * 0.025, 0, Math.PI * 2);
      context.arc(width * 0.08, -height * 0.89, width * 0.025, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };
    const drawZombie = (geometry, approach, now, shouldExplode) => {
      if (shouldExplode) {
        return;
      }
      const hitAge = now - visualRef.current.shotAt;
      const hitStrength = hitAge >= 65 && hitAge <= 260 ? 1 - clamp((hitAge - 65) / 195) : 0;
      context.save();
      context.fillStyle = "rgba(0, 0, 0, .54)";
      context.filter = `blur(${Math.max(2, geometry.width * 0.025)}px)`;
      context.beginPath();
      context.ellipse(
        geometry.x,
        geometry.baseline,
        geometry.width * 0.43,
        geometry.height * 0.045,
        0,
        0,
        Math.PI * 2
      );
      context.fill();
      context.restore();
      const useLunge = phaseRef.current === "lose" || approach > 0.78;
      const zombieAsset = useLunge && assets.zombieLunge.ready ? assets.zombieLunge : assets.zombie;
      if (zombieAsset.ready) {
        context.save();
        context.translate(geometry.x, geometry.baseline);
        const recoil = hitStrength * geometry.width * 0.07;
        context.rotate(Math.sin(now * 0.05) * hitStrength * 0.035);
        context.globalAlpha = 0.96;
        context.drawImage(
          zombieAsset.image,
          -geometry.width / 2 + recoil,
          -geometry.height,
          geometry.width,
          geometry.height
        );
        if (hitStrength > 0) {
          context.globalCompositeOperation = "screen";
          context.globalAlpha = hitStrength * 0.72;
          context.filter = "brightness(2.5) sepia(1) saturate(5)";
          context.drawImage(
            zombieAsset.image,
            -geometry.width / 2 + recoil,
            -geometry.height,
            geometry.width,
            geometry.height
          );
        }
        context.restore();
      } else {
        drawFallbackZombie(geometry, hitStrength);
      }
      if (hitStrength > 0) {
        const flash = context.createRadialGradient(
          geometry.x,
          geometry.baseline - geometry.height * 0.55,
          1,
          geometry.x,
          geometry.baseline - geometry.height * 0.55,
          geometry.width * 0.26
        );
        flash.addColorStop(0, `rgba(255, 250, 190, ${hitStrength})`);
        flash.addColorStop(0.2, `rgba(255, 72, 18, ${hitStrength * 0.85})`);
        flash.addColorStop(1, "rgba(100, 0, 0, 0)");
        context.fillStyle = flash;
        context.beginPath();
        context.arc(
          geometry.x,
          geometry.baseline - geometry.height * 0.55,
          geometry.width * 0.26,
          0,
          Math.PI * 2
        );
        context.fill();
      }
    };
    const drawGunAndShot = (now, approach, zombie) => {
      if (phaseRef.current === "title" || phaseRef.current === "lose") {
        return;
      }
      const visual = visualRef.current;
      const shotAge = now - visual.shotAt;
      const shotActive = shotAge >= 0 && shotAge < 150;
      const gunX = cssWidth * 0.51;
      const gunY = cssHeight * 1.035;
      const shotGeometry = zombieGeometry(
        cssWidth,
        cssHeight,
        visual.shotLane,
        approach
      );
      const aimGeometry = shotActive ? shotGeometry : zombie;
      const targetY = aimGeometry.baseline - aimGeometry.height * 0.52;
      const aimAngle = Math.atan2(aimGeometry.x - gunX, gunY - targetY) * 0.34;
      const muzzleDistance = cssHeight * 0.245;
      const muzzleX = gunX + Math.sin(aimAngle) * muzzleDistance;
      const muzzleY = gunY - Math.cos(aimAngle) * muzzleDistance;
      if (shotActive) {
        const opacity = 1 - shotAge / 150;
        const tracer = context.createLinearGradient(
          muzzleX,
          muzzleY,
          shotGeometry.x,
          shotGeometry.baseline - shotGeometry.height * 0.53
        );
        tracer.addColorStop(0, `rgba(255, 246, 183, ${opacity})`);
        tracer.addColorStop(0.3, `rgba(255, 135, 24, ${opacity * 0.9})`);
        tracer.addColorStop(1, "rgba(255, 48, 16, 0)");
        context.save();
        context.globalCompositeOperation = "screen";
        context.strokeStyle = tracer;
        context.lineWidth = Math.max(2, cssWidth * 4e-3 * opacity);
        context.beginPath();
        context.moveTo(muzzleX, muzzleY);
        context.lineTo(
          shotGeometry.x,
          shotGeometry.baseline - shotGeometry.height * 0.53
        );
        context.stroke();
        context.restore();
      }
      context.save();
      context.translate(gunX, gunY);
      context.rotate(aimAngle);
      if (assets.gun.ready) {
        const desiredHeight = cssHeight * 0.45;
        const aspect = assets.gun.image.naturalWidth / assets.gun.image.naturalHeight;
        const desiredWidth = desiredHeight * aspect;
        context.drawImage(
          assets.gun.image,
          -desiredWidth * 0.5,
          -desiredHeight,
          desiredWidth,
          desiredHeight
        );
      } else {
        context.fillStyle = "#202327";
        context.strokeStyle = "#626b70";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(-cssWidth * 0.04, 0);
        context.lineTo(-cssWidth * 0.027, -cssHeight * 0.25);
        context.lineTo(cssWidth * 0.027, -cssHeight * 0.25);
        context.lineTo(cssWidth * 0.04, 0);
        context.closePath();
        context.fill();
        context.stroke();
      }
      context.restore();
      if (shotActive && shotAge < 85) {
        const flashStrength = 1 - shotAge / 85;
        context.save();
        context.translate(muzzleX, muzzleY);
        context.rotate(aimAngle);
        context.globalCompositeOperation = "screen";
        const muzzleFlash = context.createRadialGradient(0, 0, 0, 0, 0, cssHeight * 0.085);
        muzzleFlash.addColorStop(0, `rgba(255,255,225,${flashStrength})`);
        muzzleFlash.addColorStop(0.24, `rgba(255,193,52,${flashStrength})`);
        muzzleFlash.addColorStop(1, "rgba(255,47,0,0)");
        context.fillStyle = muzzleFlash;
        context.beginPath();
        for (let point = 0; point < 16; point += 1) {
          const angle = point / 16 * Math.PI * 2;
          const radius = cssHeight * (point % 2 === 0 ? 0.09 : 0.026) * flashStrength;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.fill();
        context.restore();
      }
    };
    const drawExplosion = (now, deltaSeconds) => {
      const visual = visualRef.current;
      const explosionAge = now - visual.explosionAt;
      if (explosionAge < 0) {
        return;
      }
      const geometry = zombieGeometry(
        cssWidth,
        cssHeight,
        visual.explosionLane,
        visual.explosionProgress
      );
      if (!visual.particlesBuilt) {
        visual.particles = buildExplosionParticles(geometry);
        if (reducedMotion) {
          visual.particles = visual.particles.slice(0, 32);
        }
        visual.particlesBuilt = true;
      }
      if (explosionAge < 300) {
        const flashStrength = 1 - explosionAge / 300;
        const flash = context.createRadialGradient(
          geometry.x,
          geometry.baseline - geometry.height * 0.5,
          0,
          geometry.x,
          geometry.baseline - geometry.height * 0.5,
          geometry.height * 0.72
        );
        flash.addColorStop(0, `rgba(255,255,226,${flashStrength})`);
        flash.addColorStop(0.18, `rgba(255,154,31,${flashStrength * 0.92})`);
        flash.addColorStop(0.55, `rgba(164,12,8,${flashStrength * 0.66})`);
        flash.addColorStop(1, "rgba(83,0,0,0)");
        context.save();
        context.globalCompositeOperation = "screen";
        context.fillStyle = flash;
        context.fillRect(0, 0, cssWidth, cssHeight);
        context.restore();
      }
      for (const particle of visual.particles) {
        if (particle.age >= particle.life) continue;
        particle.age += deltaSeconds;
        const ageRatio = clamp(particle.age / particle.life);
        if (!reducedMotion) {
          const gravity = particle.kind === "smoke" ? -22 : cssHeight * 1.28;
          particle.vy += gravity * deltaSeconds;
          particle.x += particle.vx * deltaSeconds;
          particle.y += particle.vy * deltaSeconds;
          particle.rotation += particle.rotationVelocity * deltaSeconds;
        }
        if (particle.kind !== "spark" && particle.kind !== "smoke" && particle.y > cssHeight * 0.94) {
          particle.y = cssHeight * 0.94;
          particle.vy *= -0.28;
          particle.vx *= 0.72;
          particle.rotationVelocity *= 0.7;
        }
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = 1 - easeOutCubic(ageRatio);
        if (particle.kind === "fragment" && assets.zombie.ready) {
          const sourceSize = Math.max(
            16,
            Math.min(assets.zombie.image.naturalWidth, assets.zombie.image.naturalHeight) * 0.15
          );
          const sourceX = particle.sourceX * Math.max(1, assets.zombie.image.naturalWidth - sourceSize);
          const sourceY = particle.sourceY * Math.max(1, assets.zombie.image.naturalHeight - sourceSize);
          context.drawImage(
            assets.zombie.image,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            -particle.size,
            -particle.size,
            particle.size * 2.3,
            particle.size * 2.3
          );
        } else if (particle.kind === "spark") {
          context.strokeStyle = particle.color;
          context.lineWidth = Math.max(1, particle.size * 0.46);
          context.beginPath();
          context.moveTo(-particle.size * 3.4, 0);
          context.lineTo(particle.size * 3.4, 0);
          context.stroke();
        } else if (particle.kind === "bone") {
          context.strokeStyle = particle.color;
          context.lineCap = "round";
          context.lineWidth = particle.size * 0.52;
          context.beginPath();
          context.moveTo(-particle.size, 0);
          context.lineTo(particle.size, 0);
          context.stroke();
        } else {
          context.fillStyle = particle.color;
          if (particle.kind === "smoke") {
            context.filter = `blur(${particle.size * 0.22}px)`;
          }
          context.beginPath();
          context.ellipse(
            0,
            0,
            particle.size * (particle.kind === "gore" ? 1.4 : 1),
            particle.size * 0.76,
            0,
            0,
            Math.PI * 2
          );
          context.fill();
        }
        context.restore();
      }
    };
    const drawBlood = (now) => {
      const visual = visualRef.current;
      const age = now - visual.loseAt;
      if (age < 0) return;
      const reveal = easeOutCubic(age / 1100);
      const bloodTint = context.createRadialGradient(
        cssWidth * 0.5,
        cssHeight * 0.45,
        cssHeight * 0.08,
        cssWidth * 0.5,
        cssHeight * 0.45,
        cssWidth * 0.72
      );
      bloodTint.addColorStop(0, `rgba(66,0,0,${0.2 * reveal})`);
      bloodTint.addColorStop(0.55, `rgba(91,0,5,${0.53 * reveal})`);
      bloodTint.addColorStop(1, `rgba(35,0,0,${0.88 * reveal})`);
      context.fillStyle = bloodTint;
      context.fillRect(0, 0, cssWidth, cssHeight);
      context.fillStyle = `rgba(91, 0, 7, ${0.93 * reveal})`;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(cssWidth, 0);
      for (let index = visual.bloodDrops.length - 1; index >= 0; index -= 1) {
        const drop = visual.bloodDrops[index];
        const dropReveal = clamp((age - drop.delay) / 850) * drop.speed;
        const x = drop.x * cssWidth;
        const halfWidth = drop.width * cssWidth;
        const y = Math.min(cssHeight * drop.length, cssHeight * drop.length * dropReveal);
        context.lineTo(x + halfWidth, y * 0.72);
        context.quadraticCurveTo(x, y + halfWidth * 1.3, x - halfWidth, y * 0.72);
      }
      context.closePath();
      context.fill();
      for (let index = 0; index < 12; index += 1) {
        const seed = visual.bloodDrops[index];
        const dropAge = clamp((age - seed.delay - 220) / 900);
        if (dropAge <= 0) continue;
        context.globalAlpha = 0.78 * reveal;
        context.fillStyle = index % 2 === 0 ? "#83000b" : "#4e0004";
        context.beginPath();
        context.ellipse(
          seed.x * cssWidth,
          (0.15 + dropAge * 0.74) * cssHeight,
          seed.width * cssWidth * 0.65,
          seed.width * cssWidth * (0.65 + dropAge * 1.4),
          0,
          0,
          Math.PI * 2
        );
        context.fill();
      }
      context.globalAlpha = 1;
    };
    const drawFrame = (now) => {
      const visual = visualRef.current;
      const deltaSeconds = Math.min(0.034, Math.max(0, (now - visual.lastFrameAt) / 1e3));
      visual.lastFrameAt = now;
      const gamePhase = phaseRef.current;
      const duration = questionRef.current?.timeLimitMs || 85e3;
      const exactRemaining = gamePhase === "playing" ? Math.max(0, duration - (now - roundStartedAtRef.current)) : remainingMsRef.current;
      const approach = gamePhase === "title" ? 0.12 + Math.sin(now * 12e-4) * 0.012 : gamePhase === "countdown" ? 0.15 : gamePhase === "lose" ? 1 : gamePhase === "win" ? visual.explosionProgress : clamp(1 - exactRemaining / duration);
      const lane = visualLaneAt(visual, now);
      const geometry = zombieGeometry(cssWidth, cssHeight, lane, approach);
      const hitAge = now - visual.shotAt;
      const explosionAge = now - visual.explosionAt;
      const loseAge = now - visual.loseAt;
      const hitShake = hitAge >= 0 && hitAge < 240 ? (1 - hitAge / 240) * 8 : 0;
      const explosionShake = explosionAge >= 0 && explosionAge < 650 ? (1 - explosionAge / 650) * 19 : 0;
      const loseShake = loseAge >= 0 && loseAge < 900 ? (1 - loseAge / 900) * 15 : 0;
      const shake = reducedMotion ? 0 : hitShake + explosionShake + loseShake;
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.save();
      if (shake > 0) {
        context.translate(
          Math.sin(now * 0.087) * shake,
          Math.cos(now * 0.113) * shake * 0.62
        );
        context.scale(1.018, 1.018);
        context.translate(-cssWidth * 9e-3, -cssHeight * 9e-3);
      }
      drawArena(now);
      drawZombie(geometry, approach, now, explosionAge >= 0);
      drawGunAndShot(now, approach, geometry);
      drawExplosion(now, deltaSeconds);
      context.restore();
      if (gamePhase === "playing" && approach > 0.72) {
        const danger = clamp((approach - 0.72) / 0.28);
        const dangerVignette = context.createRadialGradient(
          cssWidth * 0.5,
          cssHeight * 0.5,
          cssHeight * 0.2,
          cssWidth * 0.5,
          cssHeight * 0.5,
          cssWidth * 0.68
        );
        dangerVignette.addColorStop(0, "rgba(90,0,0,0)");
        dangerVignette.addColorStop(1, `rgba(124,0,4,${danger * (0.36 + Math.sin(now * 0.011) * 0.08)})`);
        context.fillStyle = dangerVignette;
        context.fillRect(0, 0, cssWidth, cssHeight);
      }
      drawBlood(now);
      animationFrame = window.requestAnimationFrame(drawFrame);
    };
    animationFrame = window.requestAnimationFrame(drawFrame);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      for (const asset of Object.values(assets)) {
        asset.image.src = "";
      }
    };
  }, []);
  const timeRatio = clamp(remainingMs / game.timeLimitMs);
  const timerStyle = { "--time-ratio": timeRatio };
  const isTimerCritical = phase === "playing" && remainingMs <= 1e4;
  const feedbackKind = visibleFeedback?.kind ?? (serverError ? "incorrect" : "");
  const feedbackMessage = visibleFeedback?.connectionError ? "サーバーへ回答を送信できませんでした" : visibleFeedback?.kind === "correct" ? `${playerName(game.players, visibleFeedback.playerId)}「${visibleFeedback.answer}」命中！` : visibleFeedback?.kind === "duplicate" ? `${playerName(game.players, visibleFeedback.playerId)}「${visibleFeedback.answer}」は回答済み` : visibleFeedback?.kind === "incorrect" ? `${playerName(game.players, visibleFeedback.playerId)}「${visibleFeedback.answer}」は不正解。同じ人が続行` : visibleFeedback?.kind === "player_left" ? `${visibleFeedback.nickname}さんが退出。残ったメンバーで続行` : serverError || " ";

  return <div className="zombie-bullet-game">
    <main className={`game-shell phase-${phase}`} data-game-phase={phase}>
      <header className="game-topbar">
        <div className="brand-lockup" aria-label="ZOMBIE BULLET">
          <span className="brand-kicker">QUIZ OR DIE</span>
          <span className="brand-title">ZOMBIE BULLET</span>
        </div>

        <div className="topbar-status" aria-label={`正解数 ${answeredCount} / ${targetHits}`}>
          <span className="status-label">KILLS</span>
          <div className="score-pips" aria-hidden="true">
            {Array.from({ length: targetHits }, (_, index) => <span
    className={`score-pip ${index < answeredCount ? "is-filled" : ""}`}
    key={index}
  />)}
          </div>
          <strong className="score-count">
            {answeredCount}<span>/{targetHits}</span>
          </strong>
        </div>

        <div
    className={`timer-cluster ${isTimerCritical ? "is-critical" : ""}`}
    style={timerStyle}
    aria-label={`\u6B8B\u308A\u6642\u9593 ${formatClock(remainingMs)}\u79D2`}
  >
          <span className="timer-label">TIME</span>
          <strong className="timer-value">{formatClock(remainingMs)}</strong>
          <span className="timer-track" aria-hidden="true">
            <span className="timer-fill" />
          </span>
        </div>

        <button
    className={`sound-button ${muted ? "is-muted" : ""}`}
    type="button"
    onClick={toggleSound}
    aria-pressed={muted}
    aria-label={muted ? "\u97F3\u58F0\u3092\u30AA\u30F3\u306B\u3059\u308B" : "\u97F3\u58F0\u3092\u30DF\u30E5\u30FC\u30C8\u3059\u308B"}
  >
          <span className="sound-icon" aria-hidden="true">{muted ? "\xD7" : "\u266A"}</span>
          <span className="sound-text">{muted ? "MUTED" : "SOUND"}</span>
          <kbd>M</kbd>
        </button>
      </header>

      <section className="game-stage" aria-label="巨大ゾンビ迎撃フィールド">
        <canvas className="game-canvas" ref={canvasRef} aria-hidden="true" />
        <div className="stage-vignette" aria-hidden="true" />
        <div className="stage-scanlines" aria-hidden="true" />

        {phase === "playing" && <div className="play-interface">
            <section className="question-card">
              <div className="question-meta">
                <span className="category-tag">TEAM RELAY</span>
                <span className="question-number">ZOMBIE BULLET</span>
              </div>
              <h2>{game.question}</h2>
              <p>{isMyTurn ? "あなたの番。答えを1つ入力せよ" : `観戦中 — ${currentPlayer}の回答を待機`}</p>
              <div className="player-turn-strip" aria-label="左右を往復する回答順" role="list">
                {game.players.map((player, index) => <div
                  className="turn-step"
                  key={player.player_id}
                  role="listitem"
                  style={{ "--turn-index": index }}
                >
                  <span
                    className={`turn-player ${player.player_id === game.currentPlayerId ? "is-current" : ""} ${player.player_id === room?.playerId ? "is-me" : ""}`}
                    aria-current={player.player_id === game.currentPlayerId ? "step" : undefined}
                  >
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    <strong>{player.nickname}</strong>
                    {player.player_id === room?.playerId && <em>YOU</em>}
                  </span>
                  {index < game.players.length - 1 && <span className="turn-arrow" aria-hidden="true">→</span>}
                </div>)}
                {game.players.length > 1 && <span className="turn-loop" aria-hidden="true">↔</span>}
              </div>
            </section>

            <div className="answer-rack" aria-label="正解した答え">
              {Array.from({ length: targetHits }, (_, index) => {
    const acceptedAnswer = game.used[index];
    return <div
      className={`answer-slot ${acceptedAnswer ? "is-hit" : ""}`}
      key={index}
    >
                    <span className="slot-number">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{acceptedAnswer ?? "—"}</strong>
                  </div>;
  })}
            </div>

            <div className="answer-console">
              <div
    className={`feedback-toast ${feedbackKind ? `is-${feedbackKind}` : ""}`}
    aria-live="polite"
    aria-atomic="true"
  >
                {feedbackMessage}
              </div>
              {isMyTurn ? <>
                <form className="answer-form" onSubmit={submitAnswer}>
                  <label htmlFor="answer-input">回答を入力</label>
                  <div className="input-shell">
                    <span className="prompt-chevron" aria-hidden="true">›</span>
                    <input
    ref={inputRef}
    id="answer-input"
    name="answer"
    type="text"
    value={inputValue}
    onChange={(event) => setInputValue(event.target.value)}
    disabled={!isMyTurn || isSubmitting || remainingMs <= 0}
    onCompositionStart={() => {
      composingRef.current = true;
    }}
    onCompositionEnd={(event) => {
      composingRef.current = false;
      compositionEndedAtRef.current = performance.now();
      setInputValue(event.currentTarget.value);
    }}
    onKeyDown={handleAnswerKeyDown}
    autoComplete="off"
    autoCorrect="off"
    spellCheck={false}
    enterKeyHint="send"
    placeholder={isMyTurn ? isSubmitting ? "判定中…" : "答えを入力…" : `${currentPlayer}の番です`}
    maxLength={64}
  />
                    <button type="submit" disabled={isSubmitting || remainingMs <= 0}>
                      <span>{isSubmitting ? "判定中" : "撃つ"}</span>
                      <kbd>ENTER</kbd>
                    </button>
                  </div>
                </form>
                <p className="no-penalty-note">
                  誤答・重複は同じ人が続行。正解すると次の人へ交代。
                </p>
              </> : <section className="spectator-console" aria-label="観戦モード">
                <span className="spectator-label">STANDBY / SPECTATING</span>
                <strong>{currentPlayer}のターン</strong>
                <p>回答結果と迎撃演出を観戦中。次のターンまで待機してください。</p>
              </section>}
            </div>
          </div>}

        {phase === "win" && <section className="stage-panel result-panel win-panel" aria-live="assertive">
            <p className="result-code">THREAT NEUTRALIZED</p>
            <h2><span>ZOMBIE</span> ELIMINATED</h2>
            <p className="result-lead">チームで{targetHits}発を命中させ、巨大ゾンビを粉砕した。</p>
            <div className="result-stats">
              <span><small>CORRECT</small><strong>{answeredCount}/{targetHits}</strong></span>
              <span><small>TIME LEFT</small><strong>{formatClock(remainingMs)}</strong></span>
            </div>
            <div className="result-actions">
              <button className="primary-action" type="button" onClick={handleExit}>
                <span>ルームへ戻る</span><small>RETURN TO ROOM</small>
              </button>
            </div>
          </section>}

        {phase === "lose" && <section className="stage-panel result-panel lose-panel" aria-live="assertive">
            <p className="result-code">MISSION FAILED / TIME UP</p>
            <h2>YOU <span>DIED</span></h2>
            <p className="result-lead">
              あと{Math.max(0, targetHits - game.finalRound)}発。ゾンビを止められなかった。
            </p>
            <div className="result-stats">
              <span><small>CORRECT</small><strong>{game.finalRound}/{targetHits}</strong></span>
              <span><small>RESULT</small><strong>TIME UP</strong></span>
            </div>
            <div className="result-actions">
              <button className="primary-action danger-action" type="button" onClick={handleExit}>
                <span>ルームへ戻る</span><small>RETURN TO ROOM</small>
              </button>
            </div>
          </section>}
      </section>

      <footer className="game-footer">
        <span>ZOMBIE BULLET CONTROL</span>
        <span className="footer-rule" />
        <span>10-HIT SURVIVAL SYSTEM // CO-OP RELAY</span>
      </footer>
    </main>
  </div>;
}
export default ZombieBullet;
