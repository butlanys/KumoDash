import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { User, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Button, Input, Checkbox } from '@heroui/react'
import { cn } from '@/lib/utils'

interface SetupAdminProps {
  initialData: {
    username: string
    password: string
  }
  onNext: (data: { username: string; password: string }) => void
  onBack: () => void
}

interface FieldErrors {
  username?: string
  password?: string
  confirmPassword?: string
}

function calculatePasswordStrength(password: string): number {
  let strength = 0
  if (password.length >= 8) strength += 1
  if (/[A-Z]/.test(password)) strength += 1
  if (/[a-z]/.test(password)) strength += 1
  if (/[0-9]/.test(password)) strength += 1
  if (/[^A-Za-z0-9]/.test(password)) strength += 1
  return strength
}

export const SetupAdmin = ({ initialData, onNext, onBack }: SetupAdminProps) => {
  const { t } = useTranslation()
  const [username, setUsername] = useState(initialData.username)
  const [password, setPassword] = useState(initialData.password)
  const [confirmPassword, setConfirmPassword] = useState(initialData.password)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [allowWeakPassword, setAllowWeakPassword] = useState(initialData.allowWeakPassword || false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const passwordStrength = calculatePasswordStrength(password)

  const getStrengthInfo = (strength: number) => {
    if (strength <= 2) {
      return { label: t('password-strength-weak'), color: 'text-danger', bgColor: 'bg-danger', width: '33%' }
    }
    if (strength === 3) {
      return { label: t('password-strength-medium'), color: 'text-yellow-600', bgColor: 'bg-yellow-500', width: '66%' }
    }
    return { label: t('password-strength-strong'), color: 'text-green-600', bgColor: 'bg-green-500', width: '100%' }
  }

  const strengthInfo = getStrengthInfo(passwordStrength)

  const validateUsername = (value: string): string | undefined => {
    if (value.length < 3 || value.length > 50) {
      return t('username-error-length')
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return t('username-error-format')
    }
    return undefined
  }

  const validatePassword = (value: string): string | undefined => {
    if (value.length < 8) {
      return t('password-error-length')
    }

    if (allowWeakPassword) {
      return undefined
    }

    if (!/[A-Z]/.test(value)) {
      return t('password-error-uppercase')
    }
    if (!/[a-z]/.test(value)) {
      return t('password-error-lowercase')
    }
    if (!/[0-9]/.test(value)) {
      return t('password-error-number')
    }
    return undefined
  }

  const validateConfirmPassword = (value: string): string | undefined => {
    if (value !== password) {
      return t('password-error-match')
    }
    return undefined
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    
    let error: string | undefined
    switch (field) {
      case 'username':
        error = validateUsername(username)
        break
      case 'password':
        error = validatePassword(password)
        break
      case 'confirmPassword':
        error = validateConfirmPassword(confirmPassword)
        break
    }
    
    setErrors((prev) => ({ ...prev, [field]: error }))
  }

  const handleSubmit = () => {
    const usernameError = validateUsername(username)
    const passwordError = validatePassword(password)
    const confirmPasswordError = validateConfirmPassword(confirmPassword)

    const newErrors: FieldErrors = {
      username: usernameError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    }

    setErrors(newErrors)
    setTouched({ username: true, password: true, confirmPassword: true })

    if (!usernameError && !passwordError && !confirmPasswordError) {
      onNext({ username, password, allowWeakPassword })
    }
  }

  const passwordRequirements = allowWeakPassword 
    ? [{ met: password.length >= 8, label: t('password-req-length') }]
    : [
        { met: password.length >= 8, label: t('password-req-length') },
        { met: /[A-Z]/.test(password), label: t('password-req-uppercase') },
        { met: /[a-z]/.test(password), label: t('password-req-lowercase') },
        { met: /[0-9]/.test(password), label: t('password-req-number') },
      ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-xl font-semibold">{t('create-admin-account')}</h2>
        <p className="text-sm text-default-500 mt-1">
          {t('create-admin-account-desc')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Input
            label={t('username')}
            type="text"
            value={username}
            onValueChange={setUsername}
            onBlur={() => handleBlur('username')}
            placeholder={t('enter-username')}
            maxLength={50}
            isInvalid={touched.username && !!errors.username}
            errorMessage={touched.username && errors.username}
            startContent={<User className="h-4 w-4 text-default-500" />}
          />
          <p className="text-xs text-default-500">{t('username-hint')}</p>
        </div>

        <div className="space-y-2">
          <Input
            label={t('password')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onValueChange={setPassword}
            onBlur={() => handleBlur('password')}
            placeholder={t('enter-password')}
            isInvalid={touched.password && !!errors.password}
            errorMessage={touched.password && errors.password}
            startContent={<Lock className="h-4 w-4 text-default-500" />}
            endContent={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-default-500 hover:text-foreground focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <div className="flex flex-col gap-1">
            <Checkbox
              isSelected={allowWeakPassword}
              onValueChange={(next) => {
                setAllowWeakPassword(next)
                if (touched.password) {
                  setErrors((prev) => ({ ...prev, password: validatePassword(password) }))
                }
              }}
              size="sm"
            >
              {t('allow-weak-password')}
            </Checkbox>
            {allowWeakPassword && (
              <p className="text-xs text-warning px-1">
                {t('allow-weak-password-warning')}
              </p>
            )}
          </div>

          {password && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-default-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: strengthInfo.width }}
                    transition={{ duration: 0.3 }}
                    className={cn('h-full rounded-full', strengthInfo.bgColor)}
                  />
                </div>
                <span className={cn('text-xs font-medium', strengthInfo.color)}>
                  {strengthInfo.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {passwordRequirements.map((req, index) => (
                  <span
                    key={index}
                    className={cn(
                      'inline-flex items-center gap-1 text-xs',
                      req.met ? 'text-green-600' : 'text-default-500'
                    )}
                  >
                    {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {req.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Input
            label={t('confirm-password')}
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onValueChange={setConfirmPassword}
            onBlur={() => handleBlur('confirmPassword')}
            placeholder={t('enter-password')}
            isInvalid={touched.confirmPassword && !!errors.confirmPassword}
            errorMessage={touched.confirmPassword && errors.confirmPassword}
            startContent={<Lock className="h-4 w-4 text-default-500" />}
            endContent={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-default-500 hover:text-foreground focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          {confirmPassword && !errors.confirmPassword && password === confirmPassword && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              {t('passwords-match')}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="light" size="sm" onPress={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('back')}
        </Button>
        <Button color="primary" size="sm" onPress={handleSubmit}>
          {t('next')}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}

export default SetupAdmin
