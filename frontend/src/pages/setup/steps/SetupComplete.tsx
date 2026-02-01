import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button, Spinner } from '@heroui/react'
import { cn } from '@/lib/utils'
import { getApiHeaders } from '@/lib/api'

interface SetupCompleteProps {
  setupData: {
    authPathPrefix: string
    sessionTimeout: number
    username: string
    password: string
    token: string
    allowWeakPassword?: boolean
  }
}

export const SetupComplete = ({ setupData }: SetupCompleteProps) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const hasCalledRef = useRef(false)

  const completeSetup = async () => {
    if (hasCalledRef.current) return
    hasCalledRef.current = true

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/setup/init', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          token: setupData.token,
          security: {
            auth_path_prefix: setupData.authPathPrefix,
            session_timeout_minutes: setupData.sessionTimeout
          },
          admin: {
            username: setupData.username,
            password: setupData.password,
            allow_weak_password: setupData.allowWeakPassword
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        // Save tokens returned from setup
        const { access_token, refresh_token } = data.data
        if (access_token && refresh_token) {
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          localStorage.setItem('user', JSON.stringify({
            username: setupData.username,
            role: 'admin'
          }))
        }
        setSuccess(true)
      } else {
        setError(data.error?.message || data.message || t('setup-failed'))
        hasCalledRef.current = false
      }
    } catch {
      setError(t('setup-failed'))
      hasCalledRef.current = false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    completeSetup()
  }, [])

  useEffect(() => {
    if (!success) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Redirect to dashboard since user is already logged in
          window.location.href = '/'
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [success])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Spinner color="primary" className="mb-4" />
        <p className="text-sm text-default-500">{t('completing-setup')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="bg-danger/10 rounded-full p-3 mb-4">
          <XCircle className="h-8 w-8 text-danger" />
        </div>
        <h3 className="font-semibold mb-1">{t('setup-failed')}</h3>
        <p className="text-sm text-danger text-center mb-4">{error}</p>
        <Button variant="bordered" size="sm" onPress={completeSetup}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('retry')}
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="bg-green-100 dark:bg-green-900/30 rounded-full p-3 mb-4"
        >
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl font-semibold mb-1"
        >
          {t('setup-complete')}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-default-500 text-center mb-4"
        >
          {t('redirecting-in', { seconds: countdown })}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-xs"
        >
          <div className="w-full bg-default-200 rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 3, ease: 'linear' }}
              className={cn('h-full rounded-full bg-green-500')}
            />
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return null
}

export default SetupComplete
