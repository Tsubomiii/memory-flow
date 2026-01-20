import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Input from './pages/Input'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/input" element={<Input />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App