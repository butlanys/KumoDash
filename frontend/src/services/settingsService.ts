import api from '@/lib/api'
import type { SystemSettings, UpdateSettingsRequest, UpdateSettingsResponse } from '@/features/settings/types'

export const settingsService = {
  getSettings: async (): Promise<SystemSettings> => {
    const response = await api.get('/settings')
    return response.data.data
  },

  updateSettings: async (data: UpdateSettingsRequest): Promise<UpdateSettingsResponse> => {
    const response = await api.put('/settings', data)
    return response.data.data
  },

  restartPanel: async (): Promise<void> => {
    await api.post('/system/restart-panel')
  },

  restartServer: async (): Promise<void> => {
    await api.post('/system/restart-server')
  },
}
