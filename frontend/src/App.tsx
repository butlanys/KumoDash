import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <Routes>
        <Route path="/" element={<div className="flex h-screen items-center justify-center text-4xl font-bold">Welcome to KumoDash</div>} />
      </Routes>
    </div>
  )
}

export default App
