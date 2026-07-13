const MIN_GAIN = 1e-4;
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;
  const audioWindow = window;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}
class SoundManager {
  constructor(options = {}) {
    this.context = null;
    this.masterGain = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.activeSources = /* @__PURE__ */ new Set();
    this.mutedState = options.muted ?? false;
    this.volumeState = clamp(options.volume ?? 0.72, 0, 1);
  }
  /** Whether this browser exposes Web Audio. Safe during SSR. */
  get isSupported() {
    return getAudioContextConstructor() !== null;
  }
  /** True after audio has been created and unlocked by the browser. */
  get isReady() {
    return this.context?.state === "running";
  }
  get isMuted() {
    return this.mutedState;
  }
  get muted() {
    return this.mutedState;
  }
  get volume() {
    return this.volumeState;
  }
  /**
   * Create/resume audio. Invoke from a user gesture such as the Start button.
   * Resolves to false instead of throwing when audio is unavailable or denied.
   */
  async init() {
    const context = this.ensureContext();
    if (!context) return false;
    try {
      if (context.state === "suspended") await context.resume();
      return context.state === "running";
    } catch {
      return false;
    }
  }
  /** Alias that reads naturally in click/touch handlers. */
  unlock() {
    return this.init();
  }
  setMuted(muted) {
    this.mutedState = muted;
    this.applyMasterGain();
    return this.mutedState;
  }
  /** Toggle mute and return the new muted state. */
  toggleMuted() {
    return this.setMuted(!this.mutedState);
  }
  /** Set master volume in the 0..1 range and return the clamped value. */
  setVolume(volume) {
    this.volumeState = clamp(Number.isFinite(volume) ? volume : 0, 0, 1);
    this.applyMasterGain();
    return this.volumeState;
  }
  play(effect, countdownStep = 1) {
    if (this.mutedState || this.volumeState <= 0) return false;
    const context = this.ensureContext();
    if (!context) return false;
    if (context.state === "suspended") {
      void context.resume().catch(() => void 0);
    }
    try {
      switch (effect) {
        case "shot":
          this.synthShot(context);
          break;
        case "hit":
          this.synthHit(context);
          break;
        case "error":
          this.synthError(context);
          break;
        case "countdown":
          this.synthCountdown(context, countdownStep);
          break;
        case "win":
          this.synthWin(context);
          break;
        case "lose":
          this.synthLose(context);
          break;
      }
      return true;
    } catch {
      return false;
    }
  }
  shot() {
    return this.play("shot");
  }
  hit() {
    return this.play("hit");
  }
  error() {
    return this.play("error");
  }
  /** `step` is normally 3, 2, then 1; the last beep is the highest. */
  countdown(step = 1) {
    return this.play("countdown", step);
  }
  win() {
    return this.play("win");
  }
  lose() {
    return this.play("lose");
  }
  /** Stop scheduled sounds without closing the AudioContext. */
  stopAll() {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // A source that already ended cannot be stopped again.
      }
    }
    this.activeSources.clear();
  }
  /** Stop sounds, release Web Audio resources, and allow a later re-init. */
  async dispose() {
    this.stopAll();
    const context = this.context;
    this.masterGain?.disconnect();
    this.compressor?.disconnect();
    this.context = null;
    this.masterGain = null;
    this.compressor = null;
    this.noiseBuffer = null;
    if (context && context.state !== "closed") {
      try {
        await context.close();
      } catch {
        // Closing audio is best-effort and must not block navigation.
      }
    }
  }
  ensureContext() {
    if (this.context?.state === "closed") {
      this.context = null;
      this.masterGain = null;
      this.compressor = null;
      this.noiseBuffer = null;
      this.activeSources.clear();
    }
    if (this.context) return this.context;
    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) return null;
    try {
      const context = new AudioContextClass({ latencyHint: "interactive" });
      const masterGain = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 16;
      compressor.ratio.value = 8;
      compressor.attack.value = 2e-3;
      compressor.release.value = 0.16;
      masterGain.gain.value = this.mutedState ? 0 : this.volumeState;
      masterGain.connect(compressor);
      compressor.connect(context.destination);
      this.context = context;
      this.masterGain = masterGain;
      this.compressor = compressor;
      return context;
    } catch {
      return null;
    }
  }
  applyMasterGain() {
    const context = this.context;
    const masterGain = this.masterGain;
    if (!context || !masterGain || context.state === "closed") return;
    const now = context.currentTime;
    const target = this.mutedState ? 0 : this.volumeState;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(target, now, 0.012);
  }
  synthShot(context) {
    const now = context.currentTime + 6e-3;
    this.noise(context, now, 0.095, 0.95, "highpass", 680);
    this.tone(context, now, 0.12, 190, 42, "sawtooth", 0.7, 1e-3);
    this.tone(context, now, 0.042, 1450, 170, "square", 0.2, 1e-3);
  }
  synthHit(context) {
    const now = context.currentTime + 6e-3;
    this.noise(context, now, 0.14, 0.5, "lowpass", 1050);
    this.tone(context, now, 0.19, 118, 34, "sine", 0.95, 2e-3);
    this.tone(context, now, 0.08, 72, 45, "square", 0.32, 1e-3);
  }
  synthError(context) {
    const now = context.currentTime + 6e-3;
    this.tone(context, now, 0.13, 210, 145, "square", 0.34, 3e-3);
    this.tone(context, now + 0.13, 0.19, 174, 82, "sawtooth", 0.42, 3e-3);
    this.tone(context, now + 0.13, 0.19, 181, 86, "square", 0.2, 3e-3);
  }
  synthCountdown(context, step) {
    const safeStep = clamp(Math.round(step), 1, 3);
    const frequency = safeStep === 1 ? 1046.5 : safeStep === 2 ? 784 : 659.25;
    const now = context.currentTime + 5e-3;
    this.tone(context, now, 0.085, frequency, frequency * 0.96, "square", 0.28, 2e-3);
    this.tone(context, now, 0.11, frequency / 2, frequency / 2, "sine", 0.18, 2e-3);
  }
  synthWin(context) {
    const now = context.currentTime + 8e-3;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((frequency, index) => {
      const start = now + index * 0.09;
      this.tone(context, start, 0.15, frequency, frequency * 1.015, "square", 0.23, 4e-3);
      this.tone(context, start, 0.18, frequency / 2, frequency / 2, "sine", 0.17, 4e-3);
    });
    const blast = now + 0.35;
    this.noise(context, blast, 0.48, 0.95, "bandpass", 820, 0.7);
    this.noise(context, blast + 0.025, 0.34, 0.42, "highpass", 1900);
    this.tone(context, blast, 0.52, 126, 28, "sine", 1, 2e-3);
    this.tone(context, blast, 0.24, 980, 95, "sawtooth", 0.25, 1e-3);
  }
  synthLose(context) {
    const now = context.currentTime + 8e-3;
    this.noise(context, now, 0.68, 0.88, "lowpass", 920, 0.65);
    this.tone(context, now, 0.72, 410, 48, "sawtooth", 0.36, 4e-3);
    this.tone(context, now, 0.58, 92, 24, "sine", 1, 2e-3);
    this.tone(context, now + 0.42, 0.14, 68, 38, "sine", 0.7, 2e-3);
    this.tone(context, now + 0.61, 0.19, 62, 28, "sine", 0.62, 2e-3);
  }
  tone(context, start, duration, startFrequency, endFrequency, type, peak, attack) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const end = start + duration;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, startFrequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      end
    );
    envelope.gain.setValueAtTime(MIN_GAIN, start);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(MIN_GAIN, peak),
      start + Math.min(attack, duration * 0.25)
    );
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    oscillator.connect(envelope);
    envelope.connect(this.masterGain);
    this.scheduleSource(oscillator, start, end + 0.015, [envelope]);
  }
  noise(context, start, duration, peak, filterType, frequency, q = 0.85) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const end = start + duration;
    source.buffer = this.getNoiseBuffer(context);
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.value = q;
    envelope.gain.setValueAtTime(MIN_GAIN, start);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(MIN_GAIN, peak),
      start + Math.min(4e-3, duration * 0.15)
    );
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, end);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.masterGain);
    this.scheduleSource(source, start, end + 0.015, [filter, envelope]);
  }
  getNoiseBuffer(context) {
    if (this.noiseBuffer) return this.noiseBuffer;
    const frameCount = Math.ceil(context.sampleRate);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < channel.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.32 + white * 0.68;
      channel[index] = previous;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }
  scheduleSource(source, start, stop, extraNodes) {
    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      source.disconnect();
      extraNodes.forEach((node) => node.disconnect());
    };
    source.start(start);
    source.stop(stop);
  }
}
const soundManager = new SoundManager();
export {
  SoundManager,
  soundManager
};
