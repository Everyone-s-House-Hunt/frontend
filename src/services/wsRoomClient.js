// バックエンドの WS ルームプロトコル（/ws/rooms/:roomID）を扱う接続クライアント。
// 接続〜入室〜メッセージ振り分けだけを担当し、状態管理は RoomProvider 側で行う。
// 認証（招待トークン検証・ゲストトークン）はバックエンド未実装のためまだ付けていない。
// 実装されたら join 時の接続URLにトークンを付与する。

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

export class RoomConnection {
  // handlers: { onPlayersUpdate, onDestroyed, onServerError, onGameMessage }
  constructor(handlers) {
    this.handlers = handlers
    this.current = null // { roomId, ws, joined, reject }
  }

  // 接続して room:join まで行い、room:joined の payload を resolve で返す。
  // create: true はルーム作成（ホスト）。無しは既存ルームへの参加のみで、
  // 存在しないIDだとサーバーが "room not found" を返して接続を閉じる。
  // React StrictMode の effect 二重実行で二重接続しないよう、
  // 同じルームへ join 中／済みなら同じ Promise を返す。
  join({ roomId, nickname, create = false }) {
    if (this.current?.roomId === roomId) {
      return this.current.promise
    }
    this.close()

    const ws = new WebSocket(`${WS_BASE_URL}/ws/rooms/${roomId}${create ? '?create=1' : ''}`)
    const entry = { roomId, ws, joined: false, reject: null }

    entry.promise = new Promise((resolve, reject) => {
      entry.reject = reject

      ws.onopen = () => {
        this.#send(ws, 'room:join', { nickname })
      }

      ws.onmessage = (event) => {
        this.#handleMessage(entry, event.data, resolve)
      }

      ws.onclose = () => {
        if (this.current !== entry) return
        this.current = null
        if (!entry.joined) {
          reject(new Error('failed to join room'))
        } else {
          // サーバー都合の切断（room:destroyed を受け取れなかった場合の保険）
          this.handlers.onDestroyed?.('connection_closed')
        }
      }
    })

    this.current = entry
    return entry.promise
  }

  // ゲーム中メッセージの送信にも使う汎用送信
  send(type, payload) {
    const ws = this.current?.ws
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    this.#send(ws, type, payload)
    return true
  }

  sendGameStart(gameMode) {
    this.send('game:start', { game_mode: gameMode })
  }

  // 自分から切断する（画面遷移や新しいルームへの入り直し時）。ハンドラへの通知はしない。
  close() {
    const entry = this.current
    if (!entry) return
    this.current = null
    entry.ws.onclose = null
    if (!entry.joined) {
      entry.reject?.(new Error('connection closed'))
    }
    entry.ws.close()
  }

  #send(ws, type, payload) {
    ws.send(JSON.stringify({ type, payload }))
  }

  #handleMessage(entry, data, resolveJoin) {
    let msg
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }
    const { type, payload } = msg

    switch (true) {
      case type === 'room:joined':
        entry.joined = true
        resolveJoin(payload)
        break
      case type === 'room:player_joined':
        this.handlers.onPlayersUpdate?.(payload.players)
        break
      case type === 'room:destroyed':
        // サーバーが続けて接続を閉じるので、こちらも後始末して通知する
        this.current = null
        entry.ws.onclose = null
        entry.ws.close()
        this.handlers.onDestroyed?.(payload.reason, payload.disconnected_player_id)
        break
      case type === 'error':
        if (!entry.joined) {
          // 入室前のエラー（room not found など）は join の失敗として理由つきで返す
          if (this.current === entry) this.current = null
          entry.ws.onclose = null
          entry.ws.close()
          entry.reject?.(new Error(payload.message))
        } else {
          this.handlers.onServerError?.(payload.message)
        }
        break
      case type.startsWith('game:'):
        this.handlers.onGameMessage?.(type, payload)
        break
    }
  }
}
