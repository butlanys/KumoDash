import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button
} from '@heroui/react'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system'
    }
    return 'system'
  })

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (t: 'light' | 'dark' | 'system') => {
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

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly variant="light" size="sm" className="text-default-500 hover:text-foreground">
          {theme === 'light' ? <SunIcon className="w-[18px] h-[18px]" /> : 
           theme === 'dark' ? <MoonIcon className="w-[18px] h-[18px]" /> : <ComputerDesktopIcon className="w-[18px] h-[18px]" />}
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Theme actions" onAction={(key) => setTheme(key as 'light' | 'dark' | 'system')}>
        <DropdownItem key="light" startContent={<SunIcon className="w-4 h-4" />}>
          {t('header.themeLight')}
        </DropdownItem>
        <DropdownItem key="dark" startContent={<MoonIcon className="w-4 h-4" />}>
          {t('header.themeDark')}
        </DropdownItem>
        <DropdownItem key="system" startContent={<ComputerDesktopIcon className="w-4 h-4" />}>
          {t('header.themeSystem')}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

export default ThemeSwitcher
