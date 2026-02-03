import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { ShieldCheckIcon, ClockIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { Button, Input } from '@heroui/react'

interface SetupSecurityProps {
  initialData: {
    authPathPrefix: string
    sessionTimeout: number
  }
  onNext: (data: { authPathPrefix: string; sessionTimeout: number }) => void
  onBack: () => void
}

export const SetupSecurity = ({ initialData, onNext, onBack }: SetupSecurityProps) => {
  const { t } = useTranslation()

  const securitySchema = z.object({
    authPathPrefix: z
      .string()
      .min(3, t('auth-path-prefix-error-min'))
      .startsWith('/', t('auth-path-prefix-error-start')),
    sessionTimeout: z
      .number()
      .min(5, t('session-timeout-error-min'))
      .max(60, t('session-timeout-error-max')),
  })

  type SecurityFormData = z.infer<typeof securitySchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: initialData,
  })

  const onSubmit = (data: SecurityFormData) => {
    onNext(data)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-xl font-semibold">{t('security-settings')}</h2>
        <p className="text-sm text-default-500 mt-1">
          {t('security-settings-desc')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={
            <span className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-default-500" />
              {t('auth-path-prefix')}
            </span>
          }
          placeholder={t('auth-path-prefix-placeholder')}
          variant="bordered"
          isInvalid={!!errors.authPathPrefix}
          errorMessage={errors.authPathPrefix?.message}
          description={t('auth-path-prefix-hint')}
          {...register('authPathPrefix')}
        />

        <Input
          label={
            <span className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-default-500" />
              {t('session-timeout')}
            </span>
          }
          type="number"
          min={5}
          max={60}
          variant="bordered"
          isInvalid={!!errors.sessionTimeout}
          errorMessage={errors.sessionTimeout?.message}
          description={t('session-timeout-hint')}
          {...register('sessionTimeout', { valueAsNumber: true })}
        />

        <div className="flex justify-between pt-4">
          <Button type="button" variant="light" size="sm" onPress={onBack}>
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            {t('back')}
          </Button>
          <Button type="submit" color="primary" size="sm">
            {t('next')}
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

export default SetupSecurity
