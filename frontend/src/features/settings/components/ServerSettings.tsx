import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardHeader, Input, Chip } from '@heroui/react'
import { Server, AlertTriangle } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'

export function ServerSettings() {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useSettings()

  if (isLoading) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex gap-3">
        <Server className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <p className="text-md font-semibold">{t('settings.server.title')}</p>
          <p className="text-small text-default-500">{t('settings.server.description')}</p>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm text-warning-600 dark:text-warning-400">
            {t('settings.server.restartRequired')}
          </span>
        </div>

        <Input
          label={t('settings.server.httpsPort')}
          value={settings?.https_port?.toString() ?? ''}
          variant="bordered"
          isReadOnly
          description={t('settings.server.httpsPortHint')}
          startContent={<Server className="h-4 w-4 text-default-400" />}
        />

        <div className="flex items-center justify-between p-3 border rounded-lg border-default-200">
          <div>
            <p className="text-sm font-medium">{t('settings.server.debugMode')}</p>
            <p className="text-xs text-default-500">{t('settings.server.debugModeHint')}</p>
          </div>
          <Chip
            color={settings?.debug_mode ? 'warning' : 'default'}
            variant="flat"
            size="sm"
          >
            {settings?.debug_mode ? t('settings.server.enabled') : t('settings.server.disabled')}
          </Chip>
        </div>
      </CardBody>
    </Card>
  )
}
