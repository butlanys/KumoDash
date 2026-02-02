//! System handlers

use axum::{extract::State, Extension};
use procfs::net::TcpState;
use serde::Serialize;
use sysinfo::{Disks, Networks, System};

use crate::api::AppState;
use crate::middleware::auth::AuthUser;
use crate::response::ApiResponse;
use crate::utils::error::AppError;

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

/// Get system status
pub async fn get_status(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<ApiResponse<SystemStatus>, AppError> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Basic info
    let hostname = System::host_name().unwrap_or_else(|| "unknown".to_string());
    let os_name = System::name().unwrap_or_else(|| "Linux".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "unknown".to_string());
    let kernel_version = System::kernel_version().unwrap_or_else(|| "unknown".to_string());

    // CPU
    let cpu_usage = sys.global_cpu_usage();
    let cpu_cores = sys.cpus().len();

    // Memory (in MB)
    let total_memory = sys.total_memory() / 1024 / 1024;
    let used_memory = sys.used_memory() / 1024 / 1024;
    let free_memory = total_memory.saturating_sub(used_memory);
    let memory_usage_percent = if total_memory > 0 {
        (used_memory as f32 / total_memory as f32) * 100.0
    } else {
        0.0
    };

    // Uptime and load
    let uptime = System::uptime();
    let load = System::load_average();
    let load_average = [load.one, load.five, load.fifteen];

    // Disks (multiple mount points)
    let disks_info = Disks::new_with_refreshed_list();
    let disks: Vec<DiskMountInfo> = disks_info
        .list()
        .iter()
        .filter(|disk| {
            // Filter out pseudo filesystems
            let fs = disk.file_system().to_string_lossy();
            !fs.starts_with("tmpfs")
                && !fs.starts_with("devtmpfs")
                && !fs.starts_with("overlay")
                && disk.total_space() > 0
        })
        .map(|disk| {
            let total = disk.total_space() / 1024 / 1024;
            let free = disk.available_space() / 1024 / 1024;
            let used = total.saturating_sub(free);
            let usage_percent = if total > 0 {
                (used as f32 / total as f32) * 100.0
            } else {
                0.0
            };

            DiskMountInfo {
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                fs_type: disk.file_system().to_string_lossy().to_string(),
                total,
                used,
                free,
                usage_percent,
            }
        })
        .collect();

    // Network (cumulative bytes from all interfaces)
    let networks = Networks::new_with_refreshed_list();
    let (rx_bytes, tx_bytes) = networks.iter().fold((0u64, 0u64), |acc, (_name, data)| {
        (acc.0 + data.total_received(), acc.1 + data.total_transmitted())
    });

    // Disk IO (from procfs)
    let disk_io = get_disk_io();

    // Process count
    let process_count = sys.processes().len();

    // TCP connections count
    let tcp_connections = get_tcp_connections_count();

    Ok(ApiResponse::success(SystemStatus {
        hostname,
        os_name,
        os_version,
        kernel_version,
        cpu_usage,
        cpu_cores,
        memory: MemoryInfo {
            total: total_memory,
            used: used_memory,
            free: free_memory,
            usage_percent: memory_usage_percent,
        },
        uptime,
        load_average,
        disks,
        network: NetworkInfo { rx_bytes, tx_bytes },
        disk_io,
        process_count,
        tcp_connections,
    }))
}

/// Get disk IO statistics from /proc/diskstats
fn get_disk_io() -> DiskIoInfo {
    let mut read_bytes = 0u64;
    let mut write_bytes = 0u64;

    if let Ok(diskstats) = procfs::diskstats() {
        for stat in diskstats {
            // Only count physical disks (sd*, nvme*, vd*)
            let name = &stat.name;
            if name.starts_with("sd")
                || name.starts_with("nvme")
                || name.starts_with("vd")
                || name.starts_with("xvd")
            {
                // Skip partitions (e.g., sda1, nvme0n1p1)
                if name.len() > 3 && name.chars().last().map(|c| c.is_ascii_digit()).unwrap_or(false) {
                    // Check if it's a partition
                    let is_partition = if name.starts_with("nvme") {
                        name.contains('p')
                    } else {
                        name.chars().skip(3).any(|c| c.is_ascii_digit())
                    };
                    if is_partition {
                        continue;
                    }
                }

                // sectors_read and sectors_written, each sector is 512 bytes
                read_bytes += stat.sectors_read * 512;
                write_bytes += stat.sectors_written * 512;
            }
        }
    }

    DiskIoInfo {
        read_bytes,
        write_bytes,
    }
}

/// Get TCP connections count from /proc/net/tcp and /proc/net/tcp6
fn get_tcp_connections_count() -> usize {
    let mut count = 0;

    // IPv4 TCP connections
    if let Ok(tcp_entries) = procfs::net::tcp() {
        count += tcp_entries
            .iter()
            .filter(|e| e.state == TcpState::Established)
            .count();
    }

    // IPv6 TCP connections
    if let Ok(tcp6_entries) = procfs::net::tcp6() {
        count += tcp6_entries
            .iter()
            .filter(|e| e.state == TcpState::Established)
            .count();
    }

    count
}

/// Restart the panel (KumoDash service)
pub async fn restart_panel(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<ApiResponse<()>, AppError> {
    // Spawn a task to restart after response is sent
    tokio::spawn(async {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        std::process::exit(0);
    });

    Ok(ApiResponse::success_with_message(
        (),
        rust_i18n::t!("success.system.restart_panel").to_string(),
    ))
}

/// Restart the server (reboot the system)
pub async fn restart_server(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<ApiResponse<()>, AppError> {
    // Execute system reboot command
    let output = std::process::Command::new("systemctl")
        .args(["reboot"])
        .output();

    match output {
        Ok(_) => Ok(ApiResponse::success_with_message(
            (),
            rust_i18n::t!("success.system.restart_server").to_string(),
        )),
        Err(e) => Err(AppError::InternalError(format!(
            "Failed to restart server: {}",
            e
        ))),
    }
}
