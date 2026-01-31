import { useTranslation } from 'react-i18next'
import { StatCard } from './StatCard'
import { HardDrive } from 'lucide-react'
import { Progress } from '@heroui/react'

interface MemoryCardProps {
  data: {
    total: number
    used: number
    free: number
    usage_percent: number
  }
}

function formatBytes(bytes: number): string {
  const mb = bytes
  if (mb < 1024) return `${mb.toFixed(0)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

export function MemoryCard({ data }: MemoryCardProps) {
  const { t } = useTranslation()
  
  const getColor = (usage: number) => {
    if (usage > 90) return "danger"
    if (usage > 70) return "warning"
    return "primary"
  }

  return (
    <StatCard title={t('dashboard.memory')} icon={<HardDrive size={18} />}>
      <div className="flex flex-col gap-4 py-2">
        <div className="flex justify-between items-end">
          <span className="text-3xl font-bold">{data.usage_percent.toFixed(1)}%</span>
          <span className="text-small text-default-500">
            {formatBytes(data.used)} / {formatBytes(data.total)}
          </span>
        </div>
        
        <Progress 
          value={data.usage_percent} 
          color={getColor(data.usage_percent)}
          className="h-3"
          aria-label="Memory usage"
        />
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="flex flex-col p-2 bg-default-50 rounded-lg">
            <span className="text-xs text-default-500">{t('dashboard.used')}</span>
            <span className="font-semibold">{formatBytes(data.used)}</span>
          </div>
          <div className="flex flex-col p-2 bg-default-50 rounded-lg">
            <span className="text-xs text-default-500">{t('dashboard.free')}</span>
            <span className="font-semibold text-success">{formatBytes(data.free)}</span>
          </div>
        </div>
      </div>
    </StatCard>
  )
}
