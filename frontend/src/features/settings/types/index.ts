export interface SystemSettings {
  auth_path_prefix: string
  session_timeout_minutes: number
  https_port: number
  debug_mode: boolean
}

export interface UpdateSettingsRequest {
  auth_path_prefix?: string
  session_timeout_minutes?: number
  https_port?: number
  debug_mode?: boolean
}

export interface UpdateSettingsResponse {
  settings: SystemSettings
  requires_restart: boolean
}
