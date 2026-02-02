import api from '@/lib/api'
import type { SystemSettings, UpdateSettingsRequest } from '@/features/settings/types'

export const settingsService = {
  getSettings: async (): Promise<SystemSettings> => {
    const response = await api.get('/settings')
    return response.data.data
  },

  updateSettings: async (data: UpdateSettingsRequest): Promise<void> => {
    await api.put('/settings', data)
  },
}
