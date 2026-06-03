import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Mansion } from './pages/games/Mansion'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Mansion />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
