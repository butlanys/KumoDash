import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Cloud
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@heroui/react'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  isMobile: boolean
}

export function Sidebar({ isOpen, onToggle, isMobile }: SidebarProps) {
  const { t } = useTranslation()

  const links = [
    { to: '/', icon: LayoutDashboard, label: t('sidebar.overview') },
    // Future routes
    // { to: '/servers', icon: Server, label: t('sidebar.servers') },
    // { to: '/settings', icon: Settings, label: t('sidebar.settings') },
  ]

  const sidebarVariants = {
    expanded: { width: 240 },
    collapsed: { width: 64 },
  }

  return (
    <motion.aside
      initial={false}
      animate={isOpen ? 'expanded' : 'collapsed'}
      variants={isMobile ? undefined : sidebarVariants}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-default-200 bg-background transition-all",
        isMobile && (isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full")
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 min-w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Cloud size={20} />
          </div>
          <motion.span
            animate={{ opacity: isOpen ? 1 : 0, display: isOpen ? "block" : "none" }}
            className="font-bold text-lg whitespace-nowrap"
          >
            KumoDash
          </motion.span>
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-2 px-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-default-600 hover:bg-default-100"
              )
            }
          >
            <link.icon size={20} className="min-w-[20px]" />
            <motion.span
              animate={{ opacity: isOpen ? 1 : 0, display: isOpen ? "block" : "none" }}
              className="whitespace-nowrap"
            >
              {link.label}
            </motion.span>
          </NavLink>
        ))}
      </nav>

      {!isMobile && (
        <div className="absolute bottom-4 right-[-12px]">
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            radius="full"
            className="bg-background border border-default-200 shadow-sm"
            onPress={onToggle}
            aria-label={isOpen ? t('sidebar.collapse') : t('sidebar.expand')}
          >
            {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </Button>
        </div>
      )}
    </motion.aside>
  )
}
