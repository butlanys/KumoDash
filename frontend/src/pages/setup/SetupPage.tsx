import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import SetupWelcome from './steps/SetupWelcome'
import SetupSecurity from './steps/SetupSecurity'
import SetupAdmin from './steps/SetupAdmin'
import SetupComplete from './steps/SetupComplete'

enum SetupStep {
  WELCOME = 1,
  SECURITY = 2,
  ADMIN = 3,
  COMPLETE = 4
}

const TOTAL_STEPS = 4

interface SetupData {
  authPathPrefix: string
  sessionTimeout: number
  username: string
  password: string
}

export const SetupPage = () => {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.WELCOME)
  const [setupData, setSetupData] = useState<SetupData>({
    authPathPrefix: '/login',
    sessionTimeout: 15,
    username: '',
    password: ''
  })
  const [tokenValid, setTokenValid] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch('/api/setup/validate-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        })

        const data = await response.json()
        setTokenValid(data.success && data.data.valid)
      } catch {
        setTokenValid(false)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      validateToken()
    } else {
      setLoading(false)
    }
  }, [token])

  const handleNext = (data?: Partial<SetupData>) => {
    if (data) {
      setSetupData(prev => ({ ...prev, ...data }))
    }
    setCurrentStep(prev => (prev + 1) as SetupStep)
  }

  const handleBack = () => {
    setCurrentStep(prev => (prev - 1) as SetupStep)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!tokenValid) {
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">
                {t('invalid-setup-link')}
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                {t('setup-link-expired')}
              </p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                {t('contact-admin')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case SetupStep.WELCOME:
        return <SetupWelcome onNext={handleNext} />
      case SetupStep.SECURITY:
        return (
          <SetupSecurity
            initialData={setupData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case SetupStep.ADMIN:
        return (
          <SetupAdmin
            initialData={setupData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case SetupStep.COMPLETE:
        return <SetupComplete setupData={{ ...setupData, token: token ?? '' }} />
      default:
        return null
    }
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
            <p className="text-muted-foreground">{t('setup-wizard')}</p>

            {/* Step Indicator */}
            <div className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const stepNumber = i + 1
                const isActive = stepNumber === currentStep
                const isCompleted = stepNumber < currentStep

                return (
                  <div key={stepNumber} className="flex items-center">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isActive ? 1.1 : 1,
                      }}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isCompleted
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {stepNumber}
                    </motion.div>
                    {stepNumber < TOTAL_STEPS && (
                      <div
                        className={cn(
                          'mx-1 h-0.5 w-6 transition-colors',
                          isCompleted ? 'bg-primary/40' : 'bg-muted'
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('step-of', { current: currentStep, total: TOTAL_STEPS })}
            </p>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default SetupPage
