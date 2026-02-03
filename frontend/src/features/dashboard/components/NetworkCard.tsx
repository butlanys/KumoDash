import { useTranslation } from 'react-i18next'
import { StatCard } from './StatCard'
import { ArrowDownIcon, ArrowUpIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

interface NetworkCardProps {
  rxSpeed: number
  txSpeed: number
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  if (bytesPerSecond < 1024 * 1024 * 1024) return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
  return `${(bytesPerSecond / 1024 / 1024 / 1024).toFixed(1)} GB/s`
}

export function NetworkCard({ rxSpeed, txSpeed }: NetworkCardProps) {
  const { t } = useTranslation()
  
  return (
    <StatCard title={t('dashboard.network')} icon={<GlobeAltIcon className="w-[18px] h-[18px]" />}>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-primary/5 text-primary">
          <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
            <ArrowDownIcon className="w-[14px] h-[14px]" />
            {t('dashboard.rxSpeed')}
          </div>
          <span className="text-xl font-bold font-mono tracking-tight">{formatSpeed(rxSpeed)}</span>
        </div>
        
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-secondary/5 text-secondary">
          <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
            <ArrowUpIcon className="w-[14px] h-[14px]" />
            {t('dashboard.txSpeed')}
          </div>
          <span className="text-xl font-bold font-mono tracking-tight">{formatSpeed(txSpeed)}</span>
        </div>
      </div>
    </StatCard>
  )
}
