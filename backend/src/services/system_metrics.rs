//! System metrics collection and alerting

use chrono::{Duration, Utc};
use procfs::net::TcpState;
use sqlx::SqlitePool;
use sysinfo::{Disks, Networks, System};
use tracing::{debug, warn};

use crate::models::{
    AlertThresholds, DiskIoInfo, DiskMountInfo, MemoryInfo, MetricsConfig, NetworkInfo,
    SystemAlert, SystemMetricsPoint, SystemMetricsResponse, SystemMetricsRow, SystemStatus,
};
use crate::utils::error::AppError;
use crate::utils::time::parse_duration_seconds;

const DEFAULT_SAMPLE_INTERVAL_SECONDS: u64 = 60;
const DEFAULT_RETENTION_DAYS: i64 = 7;
const DEFAULT_ALERT_CPU_PERCENT: f32 = 85.0;
const DEFAULT_ALERT_MEMORY_PERCENT: f32 = 85.0;
const DEFAULT_ALERT_DISK_PERCENT: f32 = 90.0;

/// System metrics service
pub struct SystemMetricsService;

impl SystemMetricsService {
    /// Collect current system status
    pub async fn collect_status() -> Result<SystemStatus, AppError> {
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

        Ok(SystemStatus {
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
        })
    }

    /// Store a metrics snapshot
    pub async fn store_metrics(pool: &SqlitePool, status: &SystemStatus) -> Result<(), AppError> {
        let timestamp = Utc::now().timestamp();
        let (disk_usage_percent, _disk_used, _disk_total) = aggregate_disk_usage(&status.disks);

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO system_metrics (
                timestamp, cpu_usage, memory_usage_percent, disk_usage_percent,
                load1, load5, load15, rx_bytes, tx_bytes, read_bytes, write_bytes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(timestamp)
        .bind(status.cpu_usage)
        .bind(status.memory.usage_percent)
        .bind(disk_usage_percent)
        .bind(status.load_average[0])
        .bind(status.load_average[1])
        .bind(status.load_average[2])
        .bind(status.network.rx_bytes as i64)
        .bind(status.network.tx_bytes as i64)
        .bind(status.disk_io.read_bytes as i64)
        .bind(status.disk_io.write_bytes as i64)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Cleanup old metrics based on retention days
    pub async fn cleanup_old_metrics(pool: &SqlitePool, retention_days: i64) -> Result<(), AppError> {
        let cutoff = Utc::now() - Duration::days(retention_days);
        let cutoff_ts = cutoff.timestamp();

        sqlx::query("DELETE FROM system_metrics WHERE timestamp < ?")
            .bind(cutoff_ts)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Load metrics configuration from system settings
    pub async fn load_config(pool: &SqlitePool) -> MetricsConfig {
        let sample_interval_seconds = fetch_setting_u64(pool, "metrics_sample_interval_seconds")
            .await
            .unwrap_or(DEFAULT_SAMPLE_INTERVAL_SECONDS)
            .clamp(10, 3600);

        let retention_days = fetch_setting_i64(pool, "metrics_retention_days")
            .await
            .unwrap_or(DEFAULT_RETENTION_DAYS)
            .clamp(1, 90);

        let cpu_percent = fetch_setting_f32(pool, "alert_cpu_percent")
            .await
            .unwrap_or(DEFAULT_ALERT_CPU_PERCENT)
            .clamp(1.0, 100.0);

        let memory_percent = fetch_setting_f32(pool, "alert_memory_percent")
            .await
            .unwrap_or(DEFAULT_ALERT_MEMORY_PERCENT)
            .clamp(1.0, 100.0);

        let disk_percent = fetch_setting_f32(pool, "alert_disk_percent")
            .await
            .unwrap_or(DEFAULT_ALERT_DISK_PERCENT)
            .clamp(1.0, 100.0);

        MetricsConfig {
            sample_interval_seconds,
            retention_days,
            alert_thresholds: AlertThresholds {
                cpu_percent,
                memory_percent,
                disk_percent,
            },
        }
    }

    /// Query historical metrics
    pub async fn query_metrics(
        pool: &SqlitePool,
        range: &str,
        step: Option<u64>,
    ) -> Result<SystemMetricsResponse, AppError> {
        let duration_seconds = parse_duration_seconds(range).unwrap_or(3600);
        let start_ts = Utc::now().timestamp() - duration_seconds;

        let mut query = String::from(
            "SELECT timestamp, cpu_usage, memory_usage_percent, disk_usage_percent, load1, load5, load15, rx_bytes, tx_bytes, read_bytes, write_bytes FROM system_metrics WHERE timestamp >= ?",
        );

        if step.unwrap_or(0) > 0 {
            query.push_str(" AND (timestamp % ? = 0)");
        }
        query.push_str(" ORDER BY timestamp ASC");

        let mut sql = sqlx::query_as::<_, SystemMetricsRow>(&query)
            .bind(start_ts);

        if let Some(step_value) = step {
            if step_value > 0 {
                sql = sql.bind(step_value as i64);
            }
        }

        let points = sql
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(SystemMetricsPoint::from)
            .collect::<Vec<_>>();
        let config = Self::load_config(pool).await;

        Ok(SystemMetricsResponse {
            points,
            sample_interval_seconds: config.sample_interval_seconds,
        })
    }

    /// List recent alerts
    pub async fn list_alerts(
        pool: &SqlitePool,
        limit: usize,
    ) -> Result<Vec<SystemAlert>, AppError> {
        let limit = limit.clamp(1, 200) as i64;

        let alerts = sqlx::query_as::<_, SystemAlert>(
            "SELECT id, metric, threshold, value, status, created_at FROM system_alerts ORDER BY id DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(alerts)
    }

    /// Evaluate thresholds and record alerts
    pub async fn evaluate_alerts(
        pool: &SqlitePool,
        status: &SystemStatus,
        thresholds: &AlertThresholds,
    ) -> Result<(), AppError> {
        let (disk_usage_percent, _disk_used, _disk_total) = aggregate_disk_usage(&status.disks);

        Self::handle_alert(
            pool,
            "cpu",
            status.cpu_usage,
            thresholds.cpu_percent,
        )
        .await?;

        Self::handle_alert(
            pool,
            "memory",
            status.memory.usage_percent,
            thresholds.memory_percent,
        )
        .await?;

        Self::handle_alert(
            pool,
            "disk",
            disk_usage_percent,
            thresholds.disk_percent,
        )
        .await?;

        Ok(())
    }

    /// Run sampler loop in background
    pub fn spawn_sampler(pool: SqlitePool) {
        tokio::spawn(async move {
            loop {
                let config = SystemMetricsService::load_config(&pool).await;

                match SystemMetricsService::collect_status().await {
                    Ok(status) => {
                        if let Err(error) = SystemMetricsService::store_metrics(&pool, &status).await {
                            warn!("Failed to store metrics: {}", error);
                        }

                        if let Err(error) = SystemMetricsService::evaluate_alerts(&pool, &status, &config.alert_thresholds).await {
                            warn!("Failed to evaluate alerts: {}", error);
                        }

                        if let Err(error) = SystemMetricsService::cleanup_old_metrics(&pool, config.retention_days).await {
                            warn!("Failed to cleanup metrics: {}", error);
                        }
                    }
                    Err(error) => {
                        warn!("Failed to collect system metrics: {}", error);
                    }
                }

                debug!("Metrics sampler sleeping for {}s", config.sample_interval_seconds);
                tokio::time::sleep(std::time::Duration::from_secs(
                    config.sample_interval_seconds,
                ))
                .await;
            }
        });
    }

    async fn handle_alert(
        pool: &SqlitePool,
        metric: &str,
        value: f32,
        threshold: f32,
    ) -> Result<(), AppError> {
        if threshold <= 0.0 {
            return Ok(());
        }

        let last_status = sqlx::query_scalar::<_, String>(
            "SELECT status FROM system_alerts WHERE metric = ? ORDER BY id DESC LIMIT 1",
        )
        .bind(metric)
        .fetch_optional(pool)
        .await?
        .unwrap_or_else(|| "recovered".to_string());

        let is_triggered = value >= threshold;
        let should_insert = match (is_triggered, last_status.as_str()) {
            (true, "triggered") => false,
            (false, "recovered") => false,
            _ => true,
        };

        if should_insert {
            let status = if is_triggered { "triggered" } else { "recovered" };

            sqlx::query(
                "INSERT INTO system_alerts (metric, threshold, value, status) VALUES (?, ?, ?, ?)",
            )
            .bind(metric)
            .bind(threshold)
            .bind(value)
            .bind(status)
            .execute(pool)
            .await?;
        }

        Ok(())
    }
}

fn aggregate_disk_usage(disks: &[DiskMountInfo]) -> (f32, u64, u64) {
    let mut total = 0u64;
    let mut used = 0u64;

    for disk in disks {
        total = total.saturating_add(disk.total);
        used = used.saturating_add(disk.used);
    }

    let usage_percent = if total > 0 {
        (used as f32 / total as f32) * 100.0
    } else {
        0.0
    };

    (usage_percent, used, total)
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
                if name.len() > 3
                    && name
                        .chars()
                        .last()
                        .map(|c| c.is_ascii_digit())
                        .unwrap_or(false)
                {
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

async fn fetch_setting_u64(pool: &SqlitePool, key: &str) -> Option<u64> {
    sqlx::query_scalar::<_, String>("SELECT value FROM system_settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .and_then(|v| v.parse::<u64>().ok())
}

async fn fetch_setting_i64(pool: &SqlitePool, key: &str) -> Option<i64> {
    sqlx::query_scalar::<_, String>("SELECT value FROM system_settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .and_then(|v| v.parse::<i64>().ok())
}

async fn fetch_setting_f32(pool: &SqlitePool, key: &str) -> Option<f32> {
    sqlx::query_scalar::<_, String>("SELECT value FROM system_settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .and_then(|v| v.parse::<f32>().ok())
}
