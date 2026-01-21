//! System handlers

use axum::{extract::State, Extension};
use serde::Serialize;
use sysinfo::{Disks, System};

use crate::api::AppState;
use crate::middleware::auth::AuthUser;
use crate::response::ApiResponse;
use crate::utils::error::AppError;

/// System status response
#[derive(Debug, Serialize)]
pub struct SystemStatus {
    pub cpu_usage: f32,
    pub memory: MemoryInfo,
    pub disk: DiskInfo,
    pub uptime: u64,
    pub load_average: [f64; 3],
}

/// Memory information
#[derive(Debug, Serialize)]
pub struct MemoryInfo {
    pub total: u64,
    pub used: u64,
    pub free: u64,
}

/// Disk information
#[derive(Debug, Serialize)]
pub struct DiskInfo {
    pub total: u64,
    pub used: u64,
    pub free: u64,
}

/// Get system status
pub async fn get_status(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<ApiResponse<SystemStatus>, AppError> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Get CPU usage
    let cpu_usage = sys.global_cpu_usage();

    // Get memory info (in MB)
    let total_memory = sys.total_memory() / 1024 / 1024;
    let used_memory = sys.used_memory() / 1024 / 1024;
    let free_memory = total_memory - used_memory;

    // Get disk info (in MB) - sum all disks
    let disks = Disks::new_with_refreshed_list();
    let mut total_disk: u64 = 0;
    let mut used_disk: u64 = 0;
    for disk in disks.list() {
        total_disk += disk.total_space() / 1024 / 1024;
        used_disk += (disk.total_space() - disk.available_space()) / 1024 / 1024;
    }
    let free_disk = total_disk - used_disk;

    // Get uptime
    let uptime = System::uptime();

    // Get load average
    let load = System::load_average();
    let load_average = [load.one, load.five, load.fifteen];

    Ok(ApiResponse::success(SystemStatus {
        cpu_usage,
        memory: MemoryInfo {
            total: total_memory,
            used: used_memory,
            free: free_memory,
        },
        disk: DiskInfo {
            total: total_disk,
            used: used_disk,
            free: free_disk,
        },
        uptime,
        load_average,
    }))
}
