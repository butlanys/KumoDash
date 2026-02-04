export interface SystemdUnit {
  name: string
  load_state: string
  active_state: string
  sub_state: string
  description: string
}

export interface SystemdLogEntry {
  timestamp: string
  message: string
}

export interface SystemdLogsResponse {
  unit: string
  entries: SystemdLogEntry[]
}

export interface SystemdUnitFile {
  name: string
  path: string
  content: string
}
