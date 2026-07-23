import { useCallback, useEffect, useRef, useState } from 'react'
import { RoomContext } from './roomContext'
import { derivePlayers, updateRoomPlayers } from './roomState'
import { RoomConnection } from '../services/wsRoomClient'

// ルーム情報・ゲーム設定・WS接続を、ルート（画面）をまたいで共有するProvider。
const INITIAL_SETTINGS = {
  gameMode: 'boarPanic',
  questionSource: 'random',
}

// フロントの gameMode 値 → バックエンドの game_mode 値
const BACKEND_GAME_MODE = {
  zombieBullet: 'bullet',
  wordPiece: 'piece',
  fiveTours: 'order',
  boarPanic: 'panic',
}

// ゲーム開始を告げる最初のメッセージ type → フロントの gameMode 値。
// バックエンドは「開始しました」を送らず、いきなり各ゲームの開始メッセージを流すため、
// これを受け取ったら全員をゲーム画面へ遷移させる。
const GAME_START_TO_MODE = {
  'game:bullet_start': 'zombieBullet',
  'game:piece_round_start': 'wordPiece',
  'game:turn_start': 'fiveTours',
  'game:round_start': 'boarPanic',
}

// 6桁のルームID（バックエンドの想定に合わせてフロントで生成する）
function generateRoomId() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// ルーム破棄の理由を、ロビーで表示するユーザー向けの通知文にする。
// reason: サーバーの room:destroyed の reason（player_disconnected 等）か、
// 接続断の保険で使う connection_closed。
function buildDestroyedNotice(room, reason, disconnectedPlayerId) {
  if (reason === 'player_disconnected') {
    const who = room?.players?.find((p) => p.player_id === disconnectedPlayerId)
    if (who?.is_host) return 'ホストが退出したため、ルームが解散されました'
    if (who?.nickname) return `${who.nickname}さんが退出したため、ルームが解散されました`
    return 'メンバーが退出したため、ルームが解散されました'
  }
  return 'サーバーとの接続が切れたため、ルームが解散されました'
}

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null)
  const [settings, setSettings] = useState(INITIAL_SETTINGS)
  const [activeGame, setActiveGame] = useState(null) // { mode, startType, startPayload, startedAt }
  const [serverError, setServerError] = useState('')
  const [roomNotice, setRoomNotice] = useState('') // ルーム解散の通知（ロビーで表示）
  const [roomEventNotice, setRoomEventNotice] = useState('') // 退出・ゲーム中断の通知
  const connectionRef = useRef(null)
  const gameSubscribersRef = useRef(new Set())
  const lastLeftPlayerRef = useRef(null)

  // onDestroyed（接続時に一度だけ作るハンドラ）から最新のルーム情報を参照するための ref
  const roomRef = useRef(null)
  useEffect(() => {
    roomRef.current = room
  }, [room])

  const getConnection = useCallback(() => {
    if (!connectionRef.current) {
      connectionRef.current = new RoomConnection({
        onPlayersUpdate: (players) => {
          setRoom((prev) => updateRoomPlayers(prev, players))
        },
        onPlayerLeft: ({ player_id: playerId, nickname, players }) => {
          lastLeftPlayerRef.current = { playerId, nickname }
          setRoom((prev) => updateRoomPlayers(prev, players))
          setRoomEventNotice(`${nickname || 'メンバー'}さんが退出しました`)
        },
        onDestroyed: (reason, disconnectedPlayerId) => {
          // ルーム破棄（誰かの切断など）。room を消せば各ページのガードがロビーへ戻す。
          // 「突然タイトルに戻された」ように見えないよう、理由をロビーに表示する。
          setRoomNotice(buildDestroyedNotice(roomRef.current, reason, disconnectedPlayerId))
          setRoom(null)
          setActiveGame(null)
        },
        onServerError: (message) => setServerError(message),
        onGameMessage: (type, payload) => {
          if (type === 'game:cancelled') {
            // 参加者退出で中断された場合は接続とルームを残し、ゲーム画面だけ閉じる。
            const leftPlayer = lastLeftPlayerRef.current
            const nickname =
              leftPlayer?.playerId === payload.disconnected_player_id
                ? leftPlayer.nickname
                : 'メンバー'
            setRoomEventNotice(`${nickname || 'メンバー'}さんが退出したためゲームを中断しました`)
            setServerError('')
            setActiveGame(null)
          }

          const mode = GAME_START_TO_MODE[type]
          if (mode) {
            const startedAt = Date.now()
            const nextGame = { mode, startType: type, startPayload: payload, startedAt }
            // bullet_start は1ゲームにつき1回だけなので、結果画面に残っている参加者も
            // 再戦開始へ確実に追従させる。他ゲームのラウンド開始は既存状態を維持する。
            setActiveGame((prev) => (type === 'game:bullet_start' ? nextGame : (prev ?? nextGame)))
          }
          gameSubscribersRef.current.forEach((cb) => cb(type, payload))
        },
      })
    }
    return connectionRef.current
  }, [])

  // 接続〜入室の共通処理。成功したら room:joined の payload を返す。
  // create: true はルーム作成（ホスト）、無しは既存ルームへの参加のみ。
  const connectAndJoin = useCallback(
    async ({ roomId, nickname, create = false }) => {
      setServerError('')
      setRoomNotice('') // 新しいルームに入るので前回の解散通知は消す
      setRoomEventNotice('')
      lastLeftPlayerRef.current = null
      const joined = await getConnection().join({ roomId, nickname, create })
      setActiveGame(null)
      setRoom({
        roomId,
        playerId: joined.player_id,
        isHost: joined.is_host,
        ...derivePlayers(joined.players),
      })
      return joined
    },
    [getConnection],
  )

  const createRoom = useCallback(
    async ({ userName }) => {
      // 6桁IDはフロント生成なので稀に既存ルームと衝突する。その時だけ振り直して再試行する。
      for (let attempt = 0; ; attempt++) {
        const roomId = generateRoomId()
        try {
          await connectAndJoin({ roomId, nickname: userName || 'ホスト', create: true })
          return roomId
        } catch (err) {
          if (attempt >= 2 || err?.message !== 'room already exists') throw err
        }
      }
    },
    [connectAndJoin],
  )

  const joinRoom = useCallback(
    async ({ roomId, userName }) => {
      await connectAndJoin({ roomId, nickname: userName })
      return roomId
    },
    [connectAndJoin],
  )

  // 招待URLからの参加。名前入力なしで参加できるよう「メンバーN」を自動採番する
  // （入室時の人数ベースの暫定実装。同時参加で重複し得るが、後から自分で変更できる）。
  // モック: 今は招待トークン＝ルームID。バックエンドにトークン検証ができたら差し替える。
  const joinByInvite = useCallback(
    async ({ inviteToken }) => {
      if (!inviteToken) throw new Error('invalid invite token')
      const joined = await connectAndJoin({ roomId: inviteToken, nickname: 'メンバー' })
      const guestNumber = joined.players.filter((p) => p.nickname && !p.is_host).length
      getConnection().send('room:join', { nickname: `メンバー${guestNumber}` })
      return inviteToken
    },
    [connectAndJoin, getConnection],
  )

  // 自分のニックネーム変更。room:join を再送するとバックエンドが上書きして
  // 全員に room:player_joined（更新済み一覧）をブロードキャストする。
  const renameSelf = useCallback(
    (nickname) => {
      const name = nickname.trim()
      if (!name) return
      getConnection().send('room:join', { nickname: name })
    },
    [getConnection],
  )

  // ゲーム開始（ホストのみ有効）。結果はWSのブロードキャスト（activeGame）かエラーで返る。
  const startGame = useCallback(() => {
    setServerError('')
    setRoomEventNotice('')
    return getConnection().sendGameStart(BACKEND_GAME_MODE[settings.gameMode])
  }, [getConnection, settings.gameMode])

  const leaveRoom = useCallback(() => {
    getConnection().close()
    setRoom(null)
    setActiveGame(null)
    setRoomEventNotice('')
    lastLeftPlayerRef.current = null
  }, [getConnection])

  // ゲーム終了後に「ルームに戻る」で使う（接続は維持したままゲーム状態だけ消す）
  const clearActiveGame = useCallback(() => setActiveGame(null), [])

  // ロビー画面（ルーム管理画面）に戻ったことをサーバーへ知らせる。
  // これを全員が送るまで、ホストは次のゲームを開始できない。
  const confirmBackToLobby = useCallback(() => {
    getConnection().sendBackToLobby()
  }, [getConnection])

  // ゲーム画面がゲーム中メッセージを購読するためのAPI（戻り値は購読解除関数）
  const subscribeGame = useCallback((callback) => {
    gameSubscribersRef.current.add(callback)
    return () => gameSubscribersRef.current.delete(callback)
  }, [])

  const sendGameMessage = useCallback(
    (type, payload) => getConnection().send(type, payload),
    [getConnection],
  )

  return (
    <RoomContext.Provider
      value={{
        room,
        settings,
        setSettings,
        activeGame,
        serverError,
        roomNotice,
        roomEventNotice,
        createRoom,
        joinRoom,
        joinByInvite,
        renameSelf,
        startGame,
        leaveRoom,
        clearActiveGame,
        confirmBackToLobby,
        subscribeGame,
        sendGameMessage,
      }}
    >
      {children}
    </RoomContext.Provider>
  )
}
