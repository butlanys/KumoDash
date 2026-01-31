import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Button, Input } from '@heroui/react'
import { useAuth } from '../hooks/useAuth'

export const LoginForm = () => {
  const { t } = useTranslation()
  const { prefix } = useParams<{ prefix: string }>()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      await login({ username, password, authPath: prefix || '' })
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(t('login-failed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="p-4 text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 border border-danger-100 dark:border-danger-900/30 rounded-medium shadow-sm">
          {error}
        </div>
      )}
      
      <div className="flex flex-col gap-4">
        <Input
          label={t('username')}
          type="text"
          value={username}
          onValueChange={setUsername}
          placeholder={t('enter-username')}
          isRequired
          variant="bordered"
        />
        
        <Input
          label={t('password')}
          type="password"
          value={password}
          onValueChange={setPassword}
          placeholder={t('enter-password')}
          isRequired
          variant="bordered"
        />
      </div>
      
      <Button 
        type="submit" 
        color="primary"
        fullWidth
        isLoading={isLoading}
        size="lg"
      >
        {isLoading ? t('signing-in') : t('sign-in')}
      </Button>
    </form>
  )
}
