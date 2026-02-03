import { memo } from 'react'
import { Breadcrumbs, BreadcrumbItem } from '@heroui/react'
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PathBreadcrumbProps {
  path: string
  onNavigate: (path: string) => void
}

export const PathBreadcrumb = memo(function PathBreadcrumb({
  path,
  onNavigate,
}: PathBreadcrumbProps) {
  const parts = path.split('/').filter(Boolean)
  const pathSegments = parts.map((part, index) => ({
    name: part,
    path: '/' + parts.slice(0, index + 1).join('/'),
  }))

  return (
    <Breadcrumbs
      separator={<ChevronRightIcon className="w-4 h-4 text-default-400" />}
      itemClasses={{
        item: 'text-default-500 data-[current=true]:text-foreground',
      }}
    >
      <BreadcrumbItem onPress={() => onNavigate('/')}>
                <HomeIcon className="w-4 h-4" />
      </BreadcrumbItem>
      {pathSegments.map((segment, index) => (
        <BreadcrumbItem
          key={segment.path}
          isCurrent={index === pathSegments.length - 1}
          onPress={() => onNavigate(segment.path)}
        >
          {segment.name}
        </BreadcrumbItem>
      ))}
    </Breadcrumbs>
  )
})
