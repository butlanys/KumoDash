import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SetupPage from './pages/setup/SetupPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import { AuthProvider } from './features/auth/hooks/useAuth'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/setup/:token" element={<SetupPage />} />
          <Route path="/:prefix" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
