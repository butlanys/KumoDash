import { useTranslation } from 'react-i18next'
import { StatCard } from './StatCard'
import { Database } from 'lucide-react'
import { Progress } from '@heroui/react'

interface DiskCardProps {
  disks: Array<{
    mount_point: string
    fs_type: string
    total: number
    used: number
    free: number
    usage_percent: number
  }>
}

function formatBytes(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(0)} MB`
  if (mb < 1024 * 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${(mb / 1024 / 1024).toFixed(1)} TB`
}

export function DiskCard({ disks }: DiskCardProps) {
  const { t } = useTranslation()
  
  const getColor = (usage: number) => {
    if (usage > 90) return "danger"
    if (usage > 80) return "warning"
    return "success"
  }

  return (
    <StatCard title={t('dashboard.disk')} icon={<Database size={18} />} className="col-span-1 md:col-span-2">
      <div className="flex flex-col gap-4">
        {disks.map((disk) => (
          <div key={disk.mount_point} className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono bg-default-100 px-1.5 py-0.5 rounded text-xs">{disk.mount_point}</span>
                <span className="text-default-400 text-xs">{disk.fs_type}</span>
              </div>
              <span className="text-xs text-default-500">
                {formatBytes(disk.used)} / {formatBytes(disk.total)}
              </span>
            </div>
            <Progress 
              value={disk.usage_percent} 
              color={getColor(disk.usage_percent)}
              size="sm"
              aria-label={`Disk usage for ${disk.mount_point}`}
            />
          </div>
        ))}
      </div>
    </StatCard>
  )
}
