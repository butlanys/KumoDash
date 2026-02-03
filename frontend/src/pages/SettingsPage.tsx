import { useTranslation } from 'react-i18next'
import { Tabs, Tab } from '@heroui/react'
import { ShieldCheckIcon, ServerIcon, SwatchIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { SecuritySettings } from '@/features/settings/components/SecuritySettings'
import { ServerSettings } from '@/features/settings/components/ServerSettings'
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings'
import { AboutSettings } from '@/features/settings/components/AboutSettings'

export default function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <Tabs
        aria-label={t('settings.title')}
        color="primary"
        variant="underlined"
        classNames={{
          tabList: 'gap-6',
          cursor: 'w-full bg-primary',
          tab: 'max-w-fit px-0 h-12',
          tabContent: 'group-data-[selected=true]:text-primary',
        }}
      >
        <Tab
          key="security"
          title={
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4" />
              <span>{t('settings.tabs.security')}</span>
            </div>
          }
        >
          <div className="pt-4">
            <SecuritySettings />
          </div>
        </Tab>

        <Tab
          key="server"
          title={
            <div className="flex items-center gap-2">
              <ServerIcon className="h-4 w-4" />
              <span>{t('settings.tabs.server')}</span>
            </div>
          }
        >
          <div className="pt-4">
            <ServerSettings />
          </div>
        </Tab>

        <Tab
          key="appearance"
          title={
            <div className="flex items-center gap-2">
              <SwatchIcon className="h-4 w-4" />
              <span>{t('settings.tabs.appearance')}</span>
            </div>
          }
        >
          <div className="pt-4">
            <AppearanceSettings />
          </div>
        </Tab>

        <Tab
          key="about"
          title={
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="h-4 w-4" />
              <span>{t('settings.tabs.about')}</span>
            </div>
          }
        >
          <div className="pt-4">
            <AboutSettings />
          </div>
        </Tab>
      </Tabs>
    </div>
  )
}
