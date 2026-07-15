import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Inosishi } from './pages/games/Inosishi'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inosishi />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
