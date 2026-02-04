import { useSystemStatus } from '@/features/dashboard/hooks/useSystemStatus'
import { SystemInfoCard } from '@/features/dashboard/components/SystemInfoCard'
import { CpuCard } from '@/features/dashboard/components/CpuCard'
import { MemoryCard } from '@/features/dashboard/components/MemoryCard'
import { DiskCard } from '@/features/dashboard/components/DiskCard'
import { NetworkCard } from '@/features/dashboard/components/NetworkCard'
import { DiskIoCard } from '@/features/dashboard/components/DiskIoCard'
import { useTranslation } from 'react-i18next'
import { Spinner } from '@heroui/react'

export default function DashboardPage() {
  const { data, isLoading, error, speeds } = useSystemStatus()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading system status..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh] text-danger">
        Error loading system status
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <SystemInfoCard data={data} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CpuCard usage={data.cpu_usage} cores={data.cpu_cores} />
        <MemoryCard data={data.memory} />
        <NetworkCard rxSpeed={speeds.rxSpeed} txSpeed={speeds.txSpeed} />
        <DiskIoCard readSpeed={speeds.readSpeed} writeSpeed={speeds.writeSpeed} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DiskCard disks={data.disks} />
      </div>
    </div>
  )
}
