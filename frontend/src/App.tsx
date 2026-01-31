import { BrowserRouter as Router, Routes, Route, useNavigate, useHref } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'
import SetupPage from './pages/setup/SetupPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import { AuthProvider } from './features/auth/hooks/useAuth'

function AppRoutes() {
  const navigate = useNavigate()

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      <AuthProvider>
        <Routes>
          <Route path="/setup/:token" element={<SetupPage />} />
          <Route path="/:prefix" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </HeroUIProvider>
  )
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

export default App
