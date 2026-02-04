import { useQuery } from '@tanstack/react-query'
import { systemService } from '@/services/systemService'
import type { SystemMetricsResponse } from '../types'

export function useSystemMetrics(range: string) {
  return useQuery<SystemMetricsResponse>({
    queryKey: ['systemMetrics', range],
    queryFn: () => systemService.getMetrics(range),
    refetchInterval: 60000,
  })
}
