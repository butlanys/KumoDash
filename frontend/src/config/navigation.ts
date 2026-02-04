import { 
  HomeIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  FolderOpenIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react'

type HeroIcon = ForwardRefExoticComponent<Omit<SVGProps<SVGSVGElement>, "ref"> & { title?: string; titleId?: string } & RefAttributes<SVGSVGElement>>

export interface NavItem {
  key: string           // i18n key
  path: string          // Route path
  icon: HeroIcon        // Heroicon
  badge?: number        // Optional badge number
  children?: NavItem[]  // Optional sub-menu (reserved)
}

export const navItems: NavItem[] = [
  {
    key: 'sidebar.overview',
    path: '/',
    icon: HomeIcon,
  },
  {
    key: 'sidebar.files',
    path: '/files',
    icon: FolderOpenIcon,
  },
  {
    key: 'sidebar.terminal',
    path: '/terminal',
    icon: CommandLineIcon,
  },
  {
    key: 'sidebar.services',
    path: '/services',
    icon: ServerStackIcon,
  },
  {
    key: 'sidebar.settings',
    path: '/settings',
    icon: Cog6ToothIcon,
  },
]
