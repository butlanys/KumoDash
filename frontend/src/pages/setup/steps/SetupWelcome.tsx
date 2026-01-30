import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Cloud, Shield, User, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SetupWelcomeProps {
  onNext: () => void
}

export const SetupWelcome = ({ onNext }: SetupWelcomeProps) => {
  const { t } = useTranslation()

  const setupSteps = [
    { icon: Shield, label: t('configure-security'), description: t('configure-security-desc') },
    { icon: User, label: t('create-admin'), description: t('create-admin-desc') },
    { icon: CheckCircle, label: t('complete-installation'), description: t('complete-installation-desc') },
  ]

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center space-y-3"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Cloud className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">{t('welcome-to-kumodash')}</h2>
        <p className="text-center text-sm text-muted-foreground">
          {t('setup-description')}
        </p>
      </motion.div>

      <div className="space-y-3">
        {setupSteps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3',
              'transition-colors hover:bg-accent/50'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <step.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Button className="w-full" size="lg" onClick={onNext}>
          {t('start-setup')}
        </Button>
      </motion.div>
    </div>
  )
}

export default SetupWelcome
