import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardBody, CardHeader, Input, Button, Switch } from '@heroui/react'
import { ServerIcon, ExclamationTriangleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { useSettings, useUpdateSettings } from '../hooks/useSettings'
import { useEffect } from 'react'

export function ServerSettings() {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const serverSchema = z.object({
    https_port: z
      .number()
      .min(1024, t('settings.server.portMinError'))
      .max(65535, t('settings.server.portMaxError')),
    debug_mode: z.boolean(),
  })

  type ServerFormData = z.infer<typeof serverSchema>

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      https_port: 8443,
      debug_mode: false,
    },
  })

  const debugMode = watch('debug_mode')

  useEffect(() => {
    if (settings) {
      reset({
        https_port: settings.https_port,
        debug_mode: settings.debug_mode,
      })
    }
  }, [settings, reset])

  const onSubmit = (data: ServerFormData) => {
    updateSettings.mutate(data, {
      onSuccess: (response) => {
        if (response.requires_restart) {
          toast.success(t('settings.server.savedRestartRequired'))
        } else {
          toast.success(t('settings.saveSuccess'))
        }
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
                  <ServerIcon className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <p className="text-md font-semibold">{t('settings.server.title')}</p>
          <p className="text-small text-default-500">{t('settings.server.description')}</p>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                        <ExclamationTriangleIcon className="h-4 w-4 text-warning" />
            <span className="text-sm text-warning-600 dark:text-warning-400">
              {t('settings.server.restartRequired')}
            </span>
          </div>

          <Input
            label={t('settings.server.httpsPort')}
            type="number"
            min={1024}
            max={65535}
            variant="bordered"
            isInvalid={!!errors.https_port}
            errorMessage={errors.https_port?.message}
            description={t('settings.server.httpsPortHint')}
            startContent={<ServerIcon className="h-4 w-4 text-default-400" />}
            {...register('https_port', { valueAsNumber: true })}
          />

          <div className="flex items-center justify-between p-3 border rounded-lg border-default-200">
            <div>
              <p className="text-sm font-medium">{t('settings.server.debugMode')}</p>
              <p className="text-xs text-default-500">{t('settings.server.debugModeHint')}</p>
            </div>
            <Switch
              isSelected={debugMode}
              onValueChange={(value) => setValue('debug_mode', value, { shouldDirty: true })}
              color="warning"
            />
          </div>

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
