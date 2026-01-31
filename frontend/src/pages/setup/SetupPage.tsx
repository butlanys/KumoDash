import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { Card, CardBody, CardHeader, Spinner } from '@heroui/react'
import { cn } from '@/lib/utils'
import { getApiHeaders } from '@/lib/api'
import SetupWelcome from './steps/SetupWelcome'
import SetupSecurity from './steps/SetupSecurity'
import SetupAdmin from './steps/SetupAdmin'
import SetupComplete from './steps/SetupComplete'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

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
  allowWeakPassword?: boolean
}

export const SetupPage = () => {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.WELCOME)
  const [setupData, setSetupData] = useState<SetupData>({
    authPathPrefix: '/login',
    sessionTimeout: 15,
    username: '',
    password: '',
    allowWeakPassword: false,
  })
  const [tokenValid, setTokenValid] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch('/api/setup/validate-token', {
          method: 'POST',
          headers: getApiHeaders(),
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-col items-center text-center pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
              <h2 className="text-2xl font-semibold text-danger">
                {t('invalid-setup-link')}
              </h2>
              <p className="text-default-500 mt-2">
                {t('setup-link-expired')}
              </p>
            </CardHeader>
            <CardBody className="text-center">
              <p className="text-sm text-default-500">
                {t('contact-admin')}
              </p>
            </CardBody>
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 p-4">
      {/* Language Switcher */}
      <div className="fixed top-4 right-4">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-lg w-full">
          <CardHeader className="flex flex-col items-center text-center pb-2 pt-6 px-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t('kumodash')}
            </h1>
            <p className="text-small text-default-400 font-medium">{t('setup-wizard')}</p>

            {/* Step Indicator */}
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const stepNumber = i + 1
                const isActive = stepNumber === currentStep
                const isCompleted = stepNumber < currentStep

                return (
                  <div key={stepNumber} className="flex items-center">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isActive ? 1.05 : 1,
                      }}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors border-2',
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : isCompleted
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-default-200 bg-transparent text-default-400'
                      )}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        stepNumber
                      )}
                    </motion.div>
                    {stepNumber < TOTAL_STEPS && (
                      <div
                        className={cn(
                          'mx-1 h-0.5 w-8 rounded-full transition-colors',
                          isCompleted ? 'bg-primary' : 'bg-default-100'
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </CardHeader>

          <CardBody className="px-6 pb-6 pt-2 overflow-x-hidden min-h-[300px]">
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
          </CardBody>
        </Card>
      </motion.div>
    </div>
  )
}

export default SetupPage
