import { 
  LayoutDashboard, 
  Settings,
  Terminal,
  type LucideIcon 
} from 'lucide-react'

export interface NavItem {
  key: string           // i18n key
  path: string          // Route path
  icon: LucideIcon      // Lucide Icon
  badge?: number        // Optional badge number
  children?: NavItem[]  // Optional sub-menu (reserved)
}

export const navItems: NavItem[] = [
  {
    key: 'sidebar.overview',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    key: 'sidebar.terminal',
    path: '/terminal',
    icon: Terminal,
  },
  {
    key: 'sidebar.settings',
    path: '/settings',
    icon: Settings,
  },
]
