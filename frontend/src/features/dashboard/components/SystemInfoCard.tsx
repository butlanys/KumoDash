import { useTranslation } from 'react-i18next'
import { StatCard } from './StatCard'
import { Server, Activity } from 'lucide-react'
import { Chip } from '@heroui/react'

interface SystemInfoCardProps {
  data: {
    hostname: string
    os_name: string
    kernel_version: string
    uptime: number
    load_average: [number, number, number]
    process_count: number
    tcp_connections: number
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function SystemInfoCard({ data }: SystemInfoCardProps) {
  const { t } = useTranslation()

  return (
    <StatCard title={t('dashboard.systemInfo')} icon={<Server size={18} />}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-default-500">{t('dashboard.hostname')}</span>
          <span className="font-semibold text-lg truncate" title={data.hostname}>{data.hostname}</span>
        </div>
        
        <div className="flex flex-col gap-1">
          <span className="text-xs text-default-500">{t('dashboard.os')}</span>
          <div className="flex items-center gap-2">
            <span className="font-medium truncate" title={data.os_name}>{data.os_name}</span>
            <Chip size="sm" variant="flat" color="primary">{data.kernel_version}</Chip>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-default-500">{t('dashboard.uptime')}</span>
          <div className="flex items-center gap-2 text-success-600">
            <Activity size={16} />
            <span className="font-mono font-medium">{formatUptime(data.uptime)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-default-500">{t('dashboard.load')}</span>
          <div className="flex gap-2 font-mono text-sm">
            <span className="bg-default-100 px-2 py-0.5 rounded">{data.load_average[0].toFixed(2)}</span>
            <span className="bg-default-100 px-2 py-0.5 rounded">{data.load_average[1].toFixed(2)}</span>
            <span className="bg-default-100 px-2 py-0.5 rounded">{data.load_average[2].toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-default-500">{t('dashboard.processes')}</span>
          <span className="font-medium">{data.process_count}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-default-500">{t('dashboard.connections')}</span>
          <span className="font-medium">{data.tcp_connections}</span>
        </div>
      </div>
    </StatCard>
  )
}
