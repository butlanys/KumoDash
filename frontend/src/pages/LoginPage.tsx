import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import NotFoundPage from './NotFoundPage'

export const LoginPage = () => {
  const { t } = useTranslation()
  const { prefix } = useParams<{ prefix: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [validating, setValidating] = useState(true)
  const [isValidPath, setIsValidPath] = useState(false)

  useEffect(() => {
    const validateLoginPath = async () => {
      if (!prefix) {
        setValidating(false)
        setIsValidPath(false)
        return
      }

      try {
        const response = await fetch('/api/v1/auth/validate-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix })
        })
        const data = await response.json()
        setIsValidPath(data.success && data.data?.valid === true)
      } catch {
        setIsValidPath(false)
      } finally {
        setValidating(false)
      }
    }

    validateLoginPath()
  }, [prefix])

  useEffect(() => {
    if (!authLoading && isValidPath) {
      const timer = setTimeout(() => setShowLoginForm(true), 300)
      return () => clearTimeout(timer)
    }
  }, [authLoading, isValidPath])

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isValidPath) {
    return <NotFoundPage />
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t('kumodash')}
            </CardTitle>
            <p className="text-muted-foreground">{t('sign-in-to-your-account')}</p>
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: showLoginForm ? 1 : 0, height: showLoginForm ? 'auto' : 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <LoginForm />
            </motion.div>
            
            {(!showLoginForm || authLoading) && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default LoginPage
