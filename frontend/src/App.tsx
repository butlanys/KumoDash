import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SetupPage from './pages/setup/SetupPage'
import LoginPage from './pages/LoginPage'
import { AuthProvider } from './features/auth/hooks/useAuth'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/setup/:token" element={<SetupPage />} />
          <Route path="/:prefix" element={<LoginPage />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
