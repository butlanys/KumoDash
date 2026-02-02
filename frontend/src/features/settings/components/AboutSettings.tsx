import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardHeader, Link, Divider } from '@heroui/react'
import { Info, Github, FileText, Heart } from 'lucide-react'
import { useSystemStatus } from '@/features/dashboard/hooks/useSystemStatus'

const VERSION = '0.1.0'
const GITHUB_URL = 'https://github.com/butlanys/KumoDash'

export function AboutSettings() {
  const { t } = useTranslation()
  const { data: systemStatus } = useSystemStatus()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex gap-3">
          <Info className="h-5 w-5 text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">{t('settings.about.title')}</p>
            <p className="text-small text-default-500">{t('settings.about.description')}</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary">KumoDash</h2>
              <p className="text-sm text-default-500 mt-1">{t('settings.about.tagline')}</p>
            </div>
          </div>

          <Divider />

          <div className="grid gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-default-500">{t('settings.about.version')}</span>
              <span className="text-sm font-medium">{VERSION}</span>
            </div>

            {systemStatus && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-default-500">{t('settings.about.os')}</span>
                  <span className="text-sm font-medium">{systemStatus.os_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-default-500">{t('settings.about.kernel')}</span>
                  <span className="text-sm font-medium">{systemStatus.kernel_version}</span>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">{t('settings.about.license')}</p>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-default-600">
            {t('settings.about.licenseText')}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-row items-center justify-center gap-6 py-4">
          <Link
            href={GITHUB_URL}
            isExternal
            showAnchorIcon
            className="flex items-center gap-2 text-default-600 hover:text-primary"
          >
            <Github className="h-4 w-4" />
            GitHub
          </Link>
          <span className="flex items-center gap-1 text-sm text-default-500">
            {t('settings.about.madeWith')} <Heart className="h-3 w-3 text-danger" />
          </span>
        </CardBody>
      </Card>
    </div>
  )
}
