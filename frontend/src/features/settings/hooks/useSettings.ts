import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settingsService'
import type { UpdateSettingsRequest, UpdateSettingsResponse } from '../types'

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateSettingsRequest) => settingsService.updateSettings(data),
    onSuccess: (response: UpdateSettingsResponse) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      return response
    },
  })
}

export function useRestartPanel() {
  return useMutation({
    mutationFn: () => settingsService.restartPanel(),
  })
}

export function useRestartServer() {
  return useMutation({
    mutationFn: () => settingsService.restartServer(),
  })
}
