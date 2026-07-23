import { createContext } from 'react'

// ルーム情報とゲーム設定を共有するコンテキスト本体。
// Provider は contexts/RoomProvider.jsx、参照側は hooks/useRoom.js を使う。
export const RoomContext = createContext(null)
