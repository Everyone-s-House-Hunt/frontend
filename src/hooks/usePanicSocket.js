import { useState, useRef, useCallback, useEffect } from 'react'

// CLAUDE.mdのWS仕様書に準拠したイノシシパニック用WebSocketロジック
const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8080'
const CREATE_RETRY_MAX = 3

function randomRoomId() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function usePanicSocket() {
  const wsRef = useRef(null)
  const retryRef = useRef(0)

  // 接続状態: 'idle' | 'connecting' | 'lobby'(入室済み) | 'destroyed'(ルーム解散) | 'error'
  const [connection, setConnection] = useState('idle')
  const [errorMessage, setErrorMessage] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState([])

  // ゲーム進行はすべてサーバー駆動
  const [round, setRound] = useState(null)         // game:round_start payload
  const [votedInfo, setVotedInfo] = useState(null) // { voted, total }
  const [myVote, setMyVote] = useState(null)       // 自分が投票した choice_index
  const [roundResult, setRoundResult] = useState(null) // game:round_result payload
  const [gameOver, setGameOver] = useState(null)   // game:over payload
  const [gameClear, setGameClear] = useState(null) // game:clear payload

  const send = useCallback((type, payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  const openSocket = useCallback((id, create, nickname) => {
    setConnection('connecting')
    setErrorMessage(null)
    setRoomId(id)

    const ws = new WebSocket(`${WS_BASE}/ws/rooms/${id}${create ? '?create=1' : ''}`)
    wsRef.current = ws

    ws.onopen = () => {
      // 接続できたら最初に room:join を送る（仕様）
      ws.send(JSON.stringify({ type: 'room:join', payload: { nickname } }))
    }

    ws.onmessage = (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      const { type, payload } = msg

      switch (type) {
        case 'room:joined':
          setPlayerId(payload.player_id)
          setIsHost(payload.is_host)
          setPlayers(payload.players)
          setConnection('lobby')
          break
        case 'room:player_joined':
          setPlayers(payload.players)
          break
        case 'room:destroyed':
          setConnection('destroyed')
          break
        case 'game:round_start':
          setRound(payload)
          setMyVote(null)
          setVotedInfo(null)
          setRoundResult(null)
          break
        case 'game:vote_received':
          setVotedInfo({ voted: payload.voted_count, total: payload.total_count })
          break
        case 'game:round_result':
          setRoundResult(payload)
          break
        case 'game:over':
          setGameOver(payload)
          break
        case 'game:clear':
          setGameClear(payload)
          break
        case 'error':
          // ルームID衝突はIDを振り直して自動再試行（仕様: サーバーが接続を閉じるため再接続）
          if (payload.message === 'room already exists' && create && retryRef.current < CREATE_RETRY_MAX) {
            retryRef.current += 1
            setTimeout(() => openSocket(randomRoomId(), true, nickname), 100)
          } else {
            setErrorMessage(payload.message)
            setConnection('error')
          }
          break
        default:
          break
      }
    }

    ws.onerror = () => {
      setErrorMessage('サーバーに接続できません')
      setConnection('error')
    }

    // 想定外の切断（誰かの離脱によるルーム破棄含む）は destroyed 扱い
    ws.onclose = () => {
      setConnection((prev) => (prev === 'connecting' || prev === 'lobby' ? 'destroyed' : prev))
    }
  }, [])

  // ルーム作成（ホスト）: フロントが6桁IDを生成する（仕様）
  const createRoom = useCallback(
    (nickname) => {
      retryRef.current = 0
      openSocket(randomRoomId(), true, nickname)
    },
    [openSocket],
  )

  const joinRoom = useCallback(
    (id, nickname) => {
      openSocket(id, false, nickname)
    },
    [openSocket],
  )

  const startGame = useCallback(() => send('game:start', { game_mode: 'panic' }), [send])

  const vote = useCallback(
    (choiceIndex) => {
      setMyVote(choiceIndex)
      send('game:vote', { choice_index: choiceIndex })
    },
    [send],
  )

  useEffect(
    () => () => {
      if (wsRef.current) wsRef.current.close()
    },
    [],
  )

  return {
    connection,
    errorMessage,
    roomId,
    playerId,
    isHost,
    players,
    round,
    votedInfo,
    myVote,
    roundResult,
    gameOver,
    gameClear,
    createRoom,
    joinRoom,
    startGame,
    vote,
  }
}
