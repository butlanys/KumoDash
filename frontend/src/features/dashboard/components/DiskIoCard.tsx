import { useTranslation } from 'react-i18next'
import { StatCard } from './StatCard'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentIcon } from '@heroicons/react/24/outline'

interface DiskIoCardProps {
  readSpeed: number
  writeSpeed: number
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  if (bytesPerSecond < 1024 * 1024 * 1024) return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
  return `${(bytesPerSecond / 1024 / 1024 / 1024).toFixed(1)} GB/s`
}

export function DiskIoCard({ readSpeed, writeSpeed }: DiskIoCardProps) {
  const { t } = useTranslation()
  
  return (
    <StatCard title={t('dashboard.diskIo')} icon={<DocumentIcon className="w-[18px] h-[18px]" />}>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-warning/5 text-warning">
          <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
            <ArrowDownTrayIcon className="w-[14px] h-[14px]" />
            {t('dashboard.readSpeed')}
          </div>
          <span className="text-xl font-bold font-mono tracking-tight">{formatSpeed(readSpeed)}</span>
        </div>
        
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-success/5 text-success">
          <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
            <ArrowUpTrayIcon className="w-[14px] h-[14px]" />
            {t('dashboard.writeSpeed')}
          </div>
          <span className="text-xl font-bold font-mono tracking-tight">{formatSpeed(writeSpeed)}</span>
        </div>
      </div>
    </StatCard>
  )
}
