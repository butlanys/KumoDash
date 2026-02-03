import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, RadioGroup, Radio } from '@heroui/react'
import { SwatchIcon, SunIcon, MoonIcon, ComputerDesktopIcon, LanguageIcon } from '@heroicons/react/24/outline'

type Theme = 'light' | 'dark' | 'system'
type Language = 'zh' | 'en'

export function AppearanceSettings() {
  const { t, i18n } = useTranslation()

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system'
    }
    return 'system'
  })

  const currentLang = (i18n.language?.startsWith('zh') ? 'zh' : 'en') as Language

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (t: Theme) => {
      root.classList.remove('light', 'dark')
      if (t === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(t)
      }
    }

    applyTheme(theme)
    localStorage.setItem('theme', theme)

    const handleChange = () => {
      if (theme === 'system') applyTheme('system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex gap-3">
                    <SwatchIcon className="h-5 w-5 text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">{t('settings.appearance.theme')}</p>
            <p className="text-small text-default-500">{t('settings.appearance.themeDescription')}</p>
          </div>
        </CardHeader>
        <CardBody>
          <RadioGroup
            value={theme}
            onValueChange={(v) => setTheme(v as Theme)}
            orientation="horizontal"
            classNames={{
              wrapper: 'gap-4',
            }}
          >
            <Radio
              value="light"
              classNames={{
                base: 'inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between flex-row-reverse max-w-[200px] cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent data-[selected=true]:border-primary',
                label: 'w-full',
              }}
            >
              <div className="flex items-center gap-2">
                                <SunIcon className="h-4 w-4" />
                <span>{t('settings.appearance.light')}</span>
              </div>
            </Radio>
            <Radio
              value="dark"
              classNames={{
                base: 'inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between flex-row-reverse max-w-[200px] cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent data-[selected=true]:border-primary',
                label: 'w-full',
              }}
            >
              <div className="flex items-center gap-2">
                                <MoonIcon className="h-4 w-4" />
                <span>{t('settings.appearance.dark')}</span>
              </div>
            </Radio>
            <Radio
              value="system"
              classNames={{
                base: 'inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between flex-row-reverse max-w-[200px] cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent data-[selected=true]:border-primary',
                label: 'w-full',
              }}
            >
              <div className="flex items-center gap-2">
                                <ComputerDesktopIcon className="h-4 w-4" />
                <span>{t('settings.appearance.system')}</span>
              </div>
            </Radio>
          </RadioGroup>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex gap-3">
                    <LanguageIcon className="h-5 w-5 text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">{t('settings.appearance.language')}</p>
            <p className="text-small text-default-500">{t('settings.appearance.languageDescription')}</p>
          </div>
        </CardHeader>
        <CardBody>
          <RadioGroup
            value={currentLang}
            onValueChange={handleLanguageChange}
            orientation="horizontal"
            classNames={{
              wrapper: 'gap-4',
            }}
          >
            <Radio
              value="zh"
              classNames={{
                base: 'inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between flex-row-reverse max-w-[200px] cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent data-[selected=true]:border-primary',
                label: 'w-full',
              }}
            >
              简体中文
            </Radio>
            <Radio
              value="en"
              classNames={{
                base: 'inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between flex-row-reverse max-w-[200px] cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent data-[selected=true]:border-primary',
                label: 'w-full',
              }}
            >
              English
            </Radio>
          </RadioGroup>
        </CardBody>
      </Card>
    </div>
  )
}
