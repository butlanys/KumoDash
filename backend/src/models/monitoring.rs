//! Monitoring models (metrics and alerts)

use serde::Serialize;

/// Historical metrics row (database mapping)
#[derive(Debug, sqlx::FromRow)]
pub struct SystemMetricsRow {
    pub timestamp: i64,
    pub cpu_usage: f32,
    pub memory_usage_percent: f32,
    pub disk_usage_percent: f32,
    pub load1: f64,
    pub load5: f64,
    pub load15: f64,
    pub rx_bytes: i64,
    pub tx_bytes: i64,
    pub read_bytes: i64,
    pub write_bytes: i64,
}

/// Historical metrics point
#[derive(Debug, Serialize)]
pub struct SystemMetricsPoint {
    pub timestamp: i64,
    pub cpu_usage: f32,
    pub memory_usage_percent: f32,
    pub disk_usage_percent: f32,
    pub load_average: [f64; 3],
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub read_bytes: u64,
    pub write_bytes: u64,
}

impl From<SystemMetricsRow> for SystemMetricsPoint {
    fn from(row: SystemMetricsRow) -> Self {
        Self {
            timestamp: row.timestamp,
            cpu_usage: row.cpu_usage,
            memory_usage_percent: row.memory_usage_percent,
            disk_usage_percent: row.disk_usage_percent,
            load_average: [row.load1, row.load5, row.load15],
            rx_bytes: row.rx_bytes.max(0) as u64,
            tx_bytes: row.tx_bytes.max(0) as u64,
            read_bytes: row.read_bytes.max(0) as u64,
            write_bytes: row.write_bytes.max(0) as u64,
        }
    }
}

/// Metrics response
#[derive(Debug, Serialize)]
pub struct SystemMetricsResponse {
    pub points: Vec<SystemMetricsPoint>,
    pub sample_interval_seconds: u64,
}

/// Alert event
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SystemAlert {
    pub id: i64,
    pub metric: String,
    pub threshold: f32,
    pub value: f32,
    pub status: String,
    pub created_at: String,
}

/// Alerts response
#[derive(Debug, Serialize)]
pub struct SystemAlertsResponse {
    pub alerts: Vec<SystemAlert>,
}

/// Alert thresholds configuration
#[derive(Debug, Clone)]
pub struct AlertThresholds {
    pub cpu_percent: f32,
    pub memory_percent: f32,
    pub disk_percent: f32,
}

/// Metrics sampler configuration
#[derive(Debug, Clone)]
pub struct MetricsConfig {
    pub sample_interval_seconds: u64,
    pub retention_days: i64,
    pub alert_thresholds: AlertThresholds,
}
