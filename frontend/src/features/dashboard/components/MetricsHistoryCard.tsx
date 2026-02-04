import { Card, CardBody, CardHeader, Select, SelectItem } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import type { SystemMetricsPoint } from '../types'

interface MetricsHistoryCardProps {
  range: string
  onRangeChange: (value: string) => void
  points: SystemMetricsPoint[]
}

interface ChartProps {
  title: string
  color: string
  values: number[]
  unit?: string
}

function MiniLineChart({ title, color, values, unit = '%' }: ChartProps) {
  const width = 220
  const height = 60
  const padding = 6

  if (values.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{title}</span>
        <div className="h-[60px] w-full rounded-md border border-default-200 bg-default-50" />
      </div>
    )
  }

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue || 1

  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1 || 1)) * (width - padding * 2)
    const y = padding + (1 - (value - minValue) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const latest = values[values.length - 1]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-default-500">{latest.toFixed(1)}{unit}</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points.join(' ')}
        />
      </svg>
    </div>
  )
}

export function MetricsHistoryCard({ range, onRangeChange, points }: MetricsHistoryCardProps) {
  const { t } = useTranslation()

  const cpuValues = points.map((point) => point.cpu_usage)
  const memoryValues = points.map((point) => point.memory_usage_percent)
  const diskValues = points.map((point) => point.disk_usage_percent)

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="text-sm font-semibold">{t('dashboard.historyTitle')}</div>
        <Select
          size="sm"
          selectedKeys={new Set([range])}
          onSelectionChange={(keys) => onRangeChange(Array.from(keys)[0] as string)}
          className="w-28"
          aria-label={t('dashboard.historyRange')}
          disallowEmptySelection
        >
          <SelectItem key="1h">1h</SelectItem>
          <SelectItem key="24h">24h</SelectItem>
          <SelectItem key="7d">7d</SelectItem>
        </Select>
      </CardHeader>
      <CardBody className="space-y-4">
        <MiniLineChart title={t('dashboard.historyCpu')} color="#2563eb" values={cpuValues} />
        <MiniLineChart title={t('dashboard.historyMemory')} color="#16a34a" values={memoryValues} />
        <MiniLineChart title={t('dashboard.historyDisk')} color="#f97316" values={diskValues} />
      </CardBody>
    </Card>
  )
}
