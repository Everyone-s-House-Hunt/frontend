import { useContext } from 'react'
import { RoomContext } from '../contexts/roomContext'

export function useRoom() {
  const context = useContext(RoomContext)
  if (!context) {
    throw new Error('useRoom は RoomProvider の内側で使ってください')
  }
  return context
}
