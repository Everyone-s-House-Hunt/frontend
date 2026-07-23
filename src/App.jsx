import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RoomProvider } from './contexts/RoomProvider'
import { Lobby } from './pages/Lobby'
import { JoinByInvite } from './pages/JoinByInvite'
import { Room } from './pages/Room'
import { Game } from './pages/Game'

function App() {
  return (
    <BrowserRouter>
      <RoomProvider>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/join/:inviteToken" element={<JoinByInvite />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/room/:roomId/game" element={<Game />} />
        </Routes>
      </RoomProvider>
    </BrowserRouter>
  )
}

export default App
