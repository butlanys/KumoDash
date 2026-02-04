export interface SystemStatus {
  hostname: string
  os_name: string
  os_version: string
  kernel_version: string
  cpu_usage: number // percentage 0-100
  cpu_cores: number
  memory: {
    total: number // MB
    used: number
    free: number
    usage_percent: number
  }
  uptime: number // seconds
  load_average: [number, number, number] // 1/5/15 minutes
  disks: Array<{
    mount_point: string
    fs_type: string
    total: number // MB
    used: number
    free: number
    usage_percent: number
  }>
  network: {
    rx_bytes: number // cumulative bytes
    tx_bytes: number
  }
  disk_io: {
    read_bytes: number // cumulative bytes
    write_bytes: number
  }
  process_count: number
  tcp_connections: number
}

export interface SystemMetricsPoint {
  timestamp: number
  cpu_usage: number
  memory_usage_percent: number
  disk_usage_percent: number
  load_average: [number, number, number]
  rx_bytes: number
  tx_bytes: number
  read_bytes: number
  write_bytes: number
}

export interface SystemMetricsResponse {
  points: SystemMetricsPoint[]
  sample_interval_seconds: number
}

export interface SystemAlert {
  id: number
  metric: string
  threshold: number
  value: number
  status: string
  created_at: string
}
