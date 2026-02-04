import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardBody, CardHeader, Input, Button } from '@heroui/react'
import { ChartBarIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { useSettings, useUpdateSettings } from '../hooks/useSettings'

export function MonitoringSettings() {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const schema = z.object({
    metrics_sample_interval_seconds: z
      .number()
      .min(10, t('settings.monitoring.sampleIntervalMin'))
      .max(3600, t('settings.monitoring.sampleIntervalMax')),
    metrics_retention_days: z
      .number()
      .min(1, t('settings.monitoring.retentionMin'))
      .max(90, t('settings.monitoring.retentionMax')),
    alert_cpu_percent: z
      .number()
      .min(1, t('settings.monitoring.alertMin'))
      .max(100, t('settings.monitoring.alertMax')),
    alert_memory_percent: z
      .number()
      .min(1, t('settings.monitoring.alertMin'))
      .max(100, t('settings.monitoring.alertMax')),
    alert_disk_percent: z
      .number()
      .min(1, t('settings.monitoring.alertMin'))
      .max(100, t('settings.monitoring.alertMax')),
  })

  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      metrics_sample_interval_seconds: 60,
      metrics_retention_days: 7,
      alert_cpu_percent: 85,
      alert_memory_percent: 85,
      alert_disk_percent: 90,
    },
  })

  useEffect(() => {
    if (settings) {
      reset({
        metrics_sample_interval_seconds: settings.metrics_sample_interval_seconds,
        metrics_retention_days: settings.metrics_retention_days,
        alert_cpu_percent: settings.alert_cpu_percent,
        alert_memory_percent: settings.alert_memory_percent,
        alert_disk_percent: settings.alert_disk_percent,
      })
    }
  }, [settings, reset])

  const onSubmit = (data: FormData) => {
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
        <ChartBarIcon className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <p className="text-md font-semibold">{t('settings.monitoring.title')}</p>
          <p className="text-small text-default-500">{t('settings.monitoring.description')}</p>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('settings.monitoring.sampleInterval')}
              type="number"
              min={10}
              max={3600}
              variant="bordered"
              isInvalid={!!errors.metrics_sample_interval_seconds}
              errorMessage={errors.metrics_sample_interval_seconds?.message}
              description={t('settings.monitoring.sampleIntervalHint')}
              {...register('metrics_sample_interval_seconds', { valueAsNumber: true })}
            />

            <Input
              label={t('settings.monitoring.retentionDays')}
              type="number"
              min={1}
              max={90}
              variant="bordered"
              isInvalid={!!errors.metrics_retention_days}
              errorMessage={errors.metrics_retention_days?.message}
              description={t('settings.monitoring.retentionHint')}
              {...register('metrics_retention_days', { valueAsNumber: true })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label={t('settings.monitoring.cpuAlert')}
              type="number"
              min={1}
              max={100}
              variant="bordered"
              isInvalid={!!errors.alert_cpu_percent}
              errorMessage={errors.alert_cpu_percent?.message}
              description={t('settings.monitoring.cpuAlertHint')}
              {...register('alert_cpu_percent', { valueAsNumber: true })}
            />

            <Input
              label={t('settings.monitoring.memoryAlert')}
              type="number"
              min={1}
              max={100}
              variant="bordered"
              isInvalid={!!errors.alert_memory_percent}
              errorMessage={errors.alert_memory_percent?.message}
              description={t('settings.monitoring.memoryAlertHint')}
              {...register('alert_memory_percent', { valueAsNumber: true })}
            />

            <Input
              label={t('settings.monitoring.diskAlert')}
              type="number"
              min={1}
              max={100}
              variant="bordered"
              isInvalid={!!errors.alert_disk_percent}
              errorMessage={errors.alert_disk_percent?.message}
              description={t('settings.monitoring.diskAlertHint')}
              {...register('alert_disk_percent', { valueAsNumber: true })}
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
