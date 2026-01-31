import { useTranslation } from 'react-i18next'
import { StatCard } from './StatCard'
import { Cpu } from 'lucide-react'
import { CircularProgress } from '@heroui/react'

interface CpuCardProps {
  usage: number
  cores: number
}

export function CpuCard({ usage, cores }: CpuCardProps) {
  const { t } = useTranslation()
  
  const getColor = (usage: number) => {
    if (usage > 90) return "danger"
    if (usage > 70) return "warning"
    return "primary"
  }

  return (
    <StatCard title={t('dashboard.cpu')} icon={<Cpu size={18} />}>
      <div className="flex flex-col items-center justify-center py-2">
        <CircularProgress
          classNames={{
            svg: "w-32 h-32 drop-shadow-md",
            indicator: "stroke-current",
            track: "stroke-default-500/10",
            value: "text-2xl font-semibold",
          }}
          value={usage}
          color={getColor(usage)}
          showValueLabel={true}
          formatOptions={{ style: "percent" }} // Ensure percent symbol is shown if supported, or handled by showValueLabel formatting
        />
        <div className="mt-2 text-small text-default-500">
          {cores} {t('dashboard.cores')}
        </div>
      </div>
    </StatCard>
  )
}
