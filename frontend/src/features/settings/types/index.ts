export interface SystemSettings {
  auth_path_prefix: string
  session_timeout_minutes: number
  https_port: number
  debug_mode: boolean
  metrics_sample_interval_seconds: number
  metrics_retention_days: number
  alert_cpu_percent: number
  alert_memory_percent: number
  alert_disk_percent: number
}

export interface UpdateSettingsRequest {
  auth_path_prefix?: string
  session_timeout_minutes?: number
  https_port?: number
  debug_mode?: boolean
  metrics_sample_interval_seconds?: number
  metrics_retention_days?: number
  alert_cpu_percent?: number
  alert_memory_percent?: number
  alert_disk_percent?: number
}

export interface UpdateSettingsResponse {
  settings: SystemSettings
  requires_restart: boolean
}
