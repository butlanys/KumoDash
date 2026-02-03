import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardBody, CardHeader, Input, Button } from '@heroui/react'
import { ShieldCheckIcon, ClockIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { useSettings, useUpdateSettings } from '../hooks/useSettings'
import { useEffect } from 'react'

export function SecuritySettings() {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const securitySchema = z.object({
    auth_path_prefix: z
      .string()
      .min(3, t('settings.security.pathMinError'))
      .startsWith('/', t('settings.security.pathStartError')),
    session_timeout_minutes: z
      .number()
      .min(5, t('settings.security.timeoutMinError'))
      .max(60, t('settings.security.timeoutMaxError')),
  })

  type SecurityFormData = z.infer<typeof securitySchema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      auth_path_prefix: '',
      session_timeout_minutes: 15,
    },
  })

  useEffect(() => {
    if (settings) {
      reset({
        auth_path_prefix: settings.auth_path_prefix,
        session_timeout_minutes: settings.session_timeout_minutes,
      })
    }
  }, [settings, reset])

  const onSubmit = (data: SecurityFormData) => {
    updateSettings.mutate(data, {
      onSuccess: () => {
        toast.success(t('settings.saveSuccess'))
      },
      onError: () => {
        toast.error(t('settings.saveError'))
      },
    })
  }

  if (isLoading) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex gap-3">
                  <ShieldCheckIcon className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <p className="text-md font-semibold">{t('settings.security.title')}</p>
          <p className="text-small text-default-500">{t('settings.security.description')}</p>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('settings.security.loginPath')}
            placeholder="/login"
            variant="bordered"
            isInvalid={!!errors.auth_path_prefix}
            errorMessage={errors.auth_path_prefix?.message}
            description={t('settings.security.loginPathHint')}
            startContent={<ShieldCheckIcon className="h-4 w-4 text-default-400" />}
            {...register('auth_path_prefix')}
          />

          <Input
            label={t('settings.security.sessionTimeout')}
            type="number"
            min={5}
            max={60}
            variant="bordered"
            isInvalid={!!errors.session_timeout_minutes}
            errorMessage={errors.session_timeout_minutes?.message}
            description={t('settings.security.sessionTimeoutHint')}
            startContent={<ClockIcon className="h-4 w-4 text-default-400" />}
            {...register('session_timeout_minutes', { valueAsNumber: true })}
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              color="primary"
              isLoading={updateSettings.isPending}
              isDisabled={!isDirty}
              startContent={!updateSettings.isPending && <ArrowDownTrayIcon className="h-4 w-4" />}
            >
              {t('settings.save')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
