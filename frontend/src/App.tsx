import { BrowserRouter as Router, Routes, Route, useNavigate, useHref } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SetupPage from './pages/setup/SetupPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import TerminalPage from './pages/TerminalPage'
import FilesPage from './pages/FilesPage'

import { AuthProvider } from './features/auth/hooks/useAuth'
import { AuthGuard } from './components/shared/AuthGuard'
import { AppLayout } from './layouts/AppLayout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppRoutes() {
  const navigate = useNavigate()

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      <AuthProvider>
        <Routes>
          {/* Setup route - must be before /:prefix */}
          <Route path="/setup/:token" element={<SetupPage />} />
          
          {/* Login route with dynamic prefix */}
          <Route path="/:prefix" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<AuthGuard><AppLayout /></AuthGuard>}>
            <Route index element={<DashboardPage />} />
            <Route path="files" element={<FilesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="terminal" element={<TerminalPage />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </HeroUIProvider>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppRoutes />
      </Router>
    </QueryClientProvider>
  )
}

export default App
