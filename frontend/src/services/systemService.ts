import api from '@/lib/api'
import { SystemStatus } from '../features/dashboard/types'

export const systemService = {
  getStatus: async (): Promise<SystemStatus> => {
    const response = await api.get('/system/status')
    return response.data.data
  }
}
