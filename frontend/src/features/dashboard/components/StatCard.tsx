import { Card, CardHeader, CardBody } from '@heroui/react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function StatCard({ title, icon, children, className }: StatCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex gap-3 pb-2">
        {icon && <div className="text-default-500">{icon}</div>}
        <h4 className="text-sm font-medium text-default-600">{title}</h4>
      </CardHeader>
      <CardBody className="pt-0">
        {children}
      </CardBody>
    </Card>
  )
}
