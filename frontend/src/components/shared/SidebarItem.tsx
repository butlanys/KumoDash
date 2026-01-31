import { Tooltip } from '@heroui/react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { NavItem } from '@/config/navigation'

interface SidebarItemProps {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
}

export const SidebarItem = ({ item, collapsed, onClick }: SidebarItemProps) => {
  const { t } = useTranslation()
  const location = useLocation()
  const isActive = location.pathname === item.path

  const label = t(item.key)

  const content = (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground font-medium" 
          : "text-default-500 hover:bg-default-100 hover:text-foreground",
        collapsed && "justify-center px-0 py-3"
      )}
    >
      <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-current")} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] text-white">
          {item.badge}
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip content={label} placement="right" color="foreground">
        <div className="w-full px-2">
            {content}
        </div>
      </Tooltip>
    )
  }

  return <div className="px-2">{content}</div>
}
