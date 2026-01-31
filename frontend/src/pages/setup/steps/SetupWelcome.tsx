import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Cloud, Shield, User, CheckCircle } from 'lucide-react'
import { Button } from '@heroui/react'

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
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center space-y-3"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Cloud className="h-7 w-7 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-default-900">{t('welcome-to-kumodash')}</h2>
          <p className="text-sm text-default-500 mx-auto">
            {t('setup-description')}
          </p>
        </div>
      </motion.div>

      <div className="space-y-2.5">
        {setupSteps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
            className="group flex items-center gap-3 rounded-xl border border-default-200 bg-content1/50 p-3 transition-all hover:bg-content2 hover:border-default-300"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-default-100 text-default-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <step.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-default-900 truncate" title={step.label}>{step.label}</p>
              <p className="text-xs text-default-500">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="pt-2"
      >
        <Button 
          color="primary" 
          size="lg" 
          fullWidth 
          onPress={onNext}
          className="font-medium"
        >
          {t('start-setup')}
        </Button>
      </motion.div>
    </div>
  )
}

export default SetupWelcome
