import api from '@/lib/api'
import type { SystemdLogEntry, SystemdUnit, SystemdUnitFile } from '@/features/systemd/types'

export const systemdService = {
  getUnits: async (): Promise<SystemdUnit[]> => {
    const response = await api.get('/systemd/units')
    return response.data.data.units
  },

  controlUnit: async (name: string, action: 'start' | 'stop' | 'restart'): Promise<void> => {
    await api.post(`/systemd/units/${encodeURIComponent(name)}/${action}`)
  },

  getLogs: async (name: string, params?: { since?: string; limit?: number }): Promise<SystemdLogEntry[]> => {
    const response = await api.get(`/systemd/units/${encodeURIComponent(name)}/logs`, { params })
    return response.data.data.entries
  },

  getUnitFile: async (name: string): Promise<SystemdUnitFile> => {
    const response = await api.get(`/systemd/units/${encodeURIComponent(name)}/file`)
    return response.data.data.unit
  },

  updateUnitFile: async (name: string, content: string): Promise<SystemdUnitFile> => {
    const response = await api.put(`/systemd/units/${encodeURIComponent(name)}/file`, { content })
    return response.data.data.unit
  },

  createUnit: async (payload: { name: string; content: string; enable?: boolean; start?: boolean }): Promise<void> => {
    await api.post('/systemd/units', payload)
  },
}
