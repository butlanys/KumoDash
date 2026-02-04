//! System status models

use serde::Serialize;

/// System status response
#[derive(Debug, Serialize)]
pub struct SystemStatus {
    // Basic info
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,

    // CPU
    pub cpu_usage: f32,
    pub cpu_cores: usize,

    // Memory
    pub memory: MemoryInfo,

    // Uptime and load
    pub uptime: u64,
    pub load_average: [f64; 3],

    // Disks (multiple mount points)
    pub disks: Vec<DiskMountInfo>,

    // Network
    pub network: NetworkInfo,

    // Disk IO
    pub disk_io: DiskIoInfo,

    // Process and connections
    pub process_count: usize,
    pub tcp_connections: usize,
}

/// Memory information
#[derive(Debug, Serialize)]
pub struct MemoryInfo {
    pub total: u64,
    pub used: u64,
    pub free: u64,
    pub usage_percent: f32,
}

/// Disk mount point information
#[derive(Debug, Serialize)]
pub struct DiskMountInfo {
    pub mount_point: String,
    pub fs_type: String,
    pub total: u64,
    pub used: u64,
    pub free: u64,
    pub usage_percent: f32,
}

/// Network information (cumulative bytes, frontend calculates speed)
#[derive(Debug, Serialize)]
pub struct NetworkInfo {
    pub rx_bytes: u64,
    pub tx_bytes: u64,
}

/// Disk IO information (cumulative bytes, frontend calculates speed)
#[derive(Debug, Serialize)]
pub struct DiskIoInfo {
    pub read_bytes: u64,
    pub write_bytes: u64,
}
