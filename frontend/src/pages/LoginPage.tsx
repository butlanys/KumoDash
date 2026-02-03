import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { Card, CardHeader, CardBody, Spinner } from '@heroui/react'
import { motion } from 'framer-motion'
import { CloudIcon } from '@heroicons/react/24/outline'
import { getApiHeaders } from '@/lib/api'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import NotFoundPage from './NotFoundPage'

export const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { prefix } = useParams<{ prefix: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [validating, setValidating] = useState(true)
  const [isValidPath, setIsValidPath] = useState(false)

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

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
          headers: getApiHeaders(),
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  if (!isValidPath) {
    return <NotFoundPage />
  }

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 p-4">
      {/* Language & Theme Switcher */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border border-default-100 dark:border-default-200">
          <CardHeader className="flex flex-col gap-3 items-center pt-8 pb-6">
            <div className="p-3 bg-primary/10 rounded-2xl mb-2 ring-1 ring-primary/20">
              <CloudIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t('kumodash')}
            </h1>
            <p className="text-default-500 text-sm">{t('sign-in-to-your-account')}</p>
          </CardHeader>
          <CardBody className="px-8 pb-8">
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
                <Spinner size="lg" color="primary" />
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>
    </div>
  )
}

export default LoginPage
