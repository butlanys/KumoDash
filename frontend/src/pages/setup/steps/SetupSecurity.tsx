import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Shield, Clock, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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
        <p className="text-sm text-muted-foreground mt-1">
          {t('security-settings-desc')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="authPathPrefix" className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {t('auth-path-prefix')}
          </Label>
          <Input
            id="authPathPrefix"
            placeholder={t('auth-path-prefix-placeholder')}
            {...register('authPathPrefix')}
            className={cn(errors.authPathPrefix && 'border-destructive')}
          />
          {errors.authPathPrefix && (
            <p className="text-xs text-destructive">
              {errors.authPathPrefix.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('auth-path-prefix-hint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sessionTimeout" className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t('session-timeout')}
          </Label>
          <Input
            id="sessionTimeout"
            type="number"
            min={5}
            max={60}
            {...register('sessionTimeout', { valueAsNumber: true })}
            className={cn(errors.sessionTimeout && 'border-destructive')}
          />
          {errors.sessionTimeout && (
            <p className="text-xs text-destructive">
              {errors.sessionTimeout.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('session-timeout-hint')}
          </p>
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('back')}
          </Button>
          <Button type="submit" size="sm">
            {t('next')}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

export default SetupSecurity
