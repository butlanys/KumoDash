import api from '@/lib/api'
import { SystemAlert, SystemMetricsResponse, SystemStatus } from '../features/dashboard/types'

export const systemService = {
  getStatus: async (): Promise<SystemStatus> => {
    const response = await api.get('/system/status')
    return response.data.data
  },

  getMetrics: async (range: string): Promise<SystemMetricsResponse> => {
    const response = await api.get('/system/metrics', { params: { range } })
    return response.data.data
  },

  getAlerts: async (limit = 20): Promise<SystemAlert[]> => {
    const response = await api.get('/system/alerts', { params: { limit } })
    return response.data.data.alerts
  },
}
