import { Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Spinner } from '@heroui/react'
import NotFoundPage from '@/pages/NotFoundPage'

interface AuthGuardProps {
  children?: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <NotFoundPage />
  }

  return children ? <>{children}</> : <Outlet />
}
