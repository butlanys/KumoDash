import { Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import type { SystemAlert } from '../types'

interface AlertsCardProps {
  alerts: SystemAlert[]
}

export function AlertsCard({ alerts }: AlertsCardProps) {
  const { t } = useTranslation()

  const metricLabel = (metric: string) => {
    switch (metric) {
      case 'cpu':
        return t('dashboard.alertMetricCpu')
      case 'memory':
        return t('dashboard.alertMetricMemory')
      case 'disk':
        return t('dashboard.alertMetricDisk')
      default:
        return metric
    }
  }

  return (
    <Card>
      <CardHeader className="text-sm font-semibold">{t('dashboard.alertsTitle')}</CardHeader>
      <CardBody className="space-y-3">
        {alerts.length === 0 && (
          <div className="text-sm text-default-500">{t('dashboard.alertsEmpty')}</div>
        )}
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">{metricLabel(alert.metric)}</div>
              <div className="text-xs text-default-500">
                {alert.value.toFixed(1)}% / {alert.threshold.toFixed(1)}%
              </div>
            </div>
            <Chip
              size="sm"
              color={alert.status === 'triggered' ? 'danger' : 'success'}
              variant="flat"
            >
              {alert.status === 'triggered'
                ? t('dashboard.alertStatusTriggered')
                : t('dashboard.alertStatusRecovered')}
            </Chip>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}
