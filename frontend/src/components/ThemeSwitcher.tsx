import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button
} from '@heroui/react'
import { Sun, Moon, Laptop } from 'lucide-react'

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
          {theme === 'light' ? <Sun size={18} /> : 
           theme === 'dark' ? <Moon size={18} /> : <Laptop size={18} />}
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Theme actions" onAction={(key) => setTheme(key as 'light' | 'dark' | 'system')}>
        <DropdownItem key="light" startContent={<Sun size={16} />}>
          {t('header.themeLight')}
        </DropdownItem>
        <DropdownItem key="dark" startContent={<Moon size={16} />}>
          {t('header.themeDark')}
        </DropdownItem>
        <DropdownItem key="system" startContent={<Laptop size={16} />}>
          {t('header.themeSystem')}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

export default ThemeSwitcher
