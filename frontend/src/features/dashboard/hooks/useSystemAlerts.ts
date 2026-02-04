import { useQuery } from '@tanstack/react-query'
import { systemService } from '@/services/systemService'
import type { SystemAlert } from '../types'

export function useSystemAlerts(limit = 20) {
  return useQuery<SystemAlert[]>({
    queryKey: ['systemAlerts', limit],
    queryFn: () => systemService.getAlerts(limit),
    refetchInterval: 30000,
  })
}
