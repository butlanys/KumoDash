import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRestartPanel, useRestartServer } from '@/features/settings/hooks/useSettings'
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  User,
  Button,
  Navbar,
  NavbarContent,
  NavbarItem
} from '@heroui/react'
import { Menu, Sun, Moon, Laptop, LogOut, RotateCcw, Power } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface HeaderProps {
  onMenuClick: () => void
  isMobile: boolean
}

export function Header({ onMenuClick, isMobile }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const restartPanel = useRestartPanel()
  const restartServer = useRestartServer()

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

    const handleChange = () => {
      if (theme === 'system') applyTheme('system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'zh' : 'en'
    i18n.changeLanguage(nextLang)
  }

  const handleRestartPanel = () => {
    if (confirm(t('header.confirmRestartPanel'))) {
      restartPanel.mutate(undefined, {
        onSuccess: () => {
          toast.success(t('header.restartPanelSuccess'))
        },
        onError: () => {
          toast.error(t('header.restartPanelError'))
        },
      })
    }
  }

  const handleRestartServer = () => {
    if (confirm(t('header.confirmRestartServer'))) {
      restartServer.mutate(undefined, {
        onSuccess: () => {
          toast.success(t('header.restartServerSuccess'))
        },
        onError: () => {
          toast.error(t('header.restartServerError'))
        },
      })
    }
  }

  return (
    <Navbar 
      maxWidth="full" 
      className="h-16 border-b border-default-200 bg-background/80 backdrop-blur-md"
      classNames={{
        wrapper: "px-4"
      }}
    >
      <NavbarContent justify="start">
        {isMobile && (
          <Button isIconOnly variant="light" onPress={onMenuClick}>
            <Menu size={24} />
          </Button>
        )}
      </NavbarContent>

      <NavbarContent justify="end" className="gap-4">
        <NavbarItem>
          <Button 
            variant="light" 
            size="sm" 
            onPress={toggleLanguage}
            className="font-medium"
          >
            {i18n.language === 'en' ? '中文' : 'English'}
          </Button>
        </NavbarItem>

        <Dropdown>
          <DropdownTrigger>
            <Button isIconOnly variant="light">
              {theme === 'light' ? <Sun size={20} /> : 
               theme === 'dark' ? <Moon size={20} /> : <Laptop size={20} />}
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

        <Dropdown>
          <DropdownTrigger>
            <Button isIconOnly variant="light">
              <Power size={20} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label="Power actions">
            <DropdownItem 
              key="restart-panel" 
              startContent={<RotateCcw size={16} />}
              onPress={handleRestartPanel}
            >
              {t('header.restartPanel')}
            </DropdownItem>
            <DropdownItem 
              key="restart-server" 
              color="danger"
              startContent={<Power size={16} />}
              onPress={handleRestartServer}
            >
              {t('header.restartServer')}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>

        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <User
              as="button"
              avatarProps={{
                isBordered: true,
                color: "primary",
                size: "sm",
                src: `https://ui-avatars.com/api/?name=${user?.username}&background=random`
              }}
              className="transition-transform"
              description={user?.role === 'admin' ? 'Administrator' : 'User'}
              name={user?.username}
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="User Actions" variant="flat">
            <DropdownItem key="logout" color="danger" startContent={<LogOut size={16} />} onPress={logout}>
              {t('header.logout')}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </NavbarContent>
    </Navbar>
  )
}
