//! Settings handlers

use axum::{extract::State, Extension, Json};
use rust_i18n::t;
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::middleware::auth::AuthUser;
use crate::response::ApiResponse;
use crate::utils::error::AppError;

/// Settings response
#[derive(Debug, Serialize)]
pub struct SettingsResponse {
    pub auth_path_prefix: String,
    pub session_timeout_minutes: u32,
    pub https_port: u16,
    pub debug_mode: bool,
    pub metrics_sample_interval_seconds: u64,
    pub metrics_retention_days: i64,
    pub alert_cpu_percent: f32,
    pub alert_memory_percent: f32,
    pub alert_disk_percent: f32,
}

/// Update settings request
#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub auth_path_prefix: Option<String>,
    pub session_timeout_minutes: Option<u32>,
    pub https_port: Option<u16>,
    pub debug_mode: Option<bool>,
    pub metrics_sample_interval_seconds: Option<u64>,
    pub metrics_retention_days: Option<i64>,
    pub alert_cpu_percent: Option<f32>,
    pub alert_memory_percent: Option<f32>,
    pub alert_disk_percent: Option<f32>,
}

/// Update settings response with restart hint
#[derive(Debug, Serialize)]
pub struct UpdateSettingsResponse {
    pub settings: SettingsResponse,
    pub requires_restart: bool,
}

/// Get all settings
pub async fn get_settings(
    State(state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<ApiResponse<SettingsResponse>, AppError> {
    let auth_path_prefix = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'auth_path_prefix'",
    )
    .fetch_optional(&state.pool)
    .await?
    .unwrap_or_else(|| "/login".to_string());

    let session_timeout_minutes = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'session_timeout'",
    )
    .fetch_optional(&state.pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(15);

    let https_port = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'https_port'",
    )
    .fetch_optional(&state.pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(443);

    let debug_mode = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'debug_mode'",
    )
    .fetch_optional(&state.pool)
    .await?
    .map(|v| v == "true")
    .unwrap_or(false);

    let metrics_sample_interval_seconds = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'metrics_sample_interval_seconds'",
    )
    .fetch_optional(&state.pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(60);

    let metrics_retention_days = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'metrics_retention_days'",
    )
    .fetch_optional(&state.pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(7);

    let alert_cpu_percent = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'alert_cpu_percent'",
    )
    .fetch_optional(&state.pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(85.0);

    let alert_memory_percent = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'alert_memory_percent'",
    )
    .fetch_optional(&state.pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(85.0);

    let alert_disk_percent = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'alert_disk_percent'",
    )
    .fetch_optional(&state.pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(90.0);

    Ok(ApiResponse::success(SettingsResponse {
        auth_path_prefix,
        session_timeout_minutes,
        https_port,
        debug_mode,
        metrics_sample_interval_seconds,
        metrics_retention_days,
        alert_cpu_percent,
        alert_memory_percent,
        alert_disk_percent,
    }))
}

/// Update settings
pub async fn update_settings(
    State(state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(req): Json<UpdateSettingsRequest>,
) -> Result<ApiResponse<UpdateSettingsResponse>, AppError> {
    let mut requires_restart = false;

    if let Some(ref auth_path_prefix) = req.auth_path_prefix {
        if auth_path_prefix.is_empty() || !auth_path_prefix.starts_with('/') {
            return Err(AppError::ValidationError(
                t!("errors.settings.invalid_auth_path").to_string(),
            ));
        }
        upsert_setting(&state.pool, "auth_path_prefix", auth_path_prefix).await?;
    }

    if let Some(session_timeout) = req.session_timeout_minutes {
        if !(1..=1440).contains(&session_timeout) {
            return Err(AppError::ValidationError(
                t!("errors.settings.invalid_session_timeout").to_string(),
            ));
        }
        upsert_setting(&state.pool, "session_timeout", &session_timeout.to_string()).await?;
    }

    if let Some(https_port) = req.https_port {
        if https_port == 0 {
            return Err(AppError::ValidationError(
                t!("errors.settings.invalid_port").to_string(),
            ));
        }
        upsert_setting(&state.pool, "https_port", &https_port.to_string()).await?;
        requires_restart = true;
    }

    if let Some(debug_mode) = req.debug_mode {
        upsert_setting(&state.pool, "debug_mode", if debug_mode { "true" } else { "false" }).await?;
        requires_restart = true;
    }

    if let Some(metrics_sample_interval_seconds) = req.metrics_sample_interval_seconds {
        if !(10..=3600).contains(&metrics_sample_interval_seconds) {
            return Err(AppError::ValidationError(
                t!("errors.settings.invalid_metrics_interval").to_string(),
            ));
        }
        upsert_setting(
            &state.pool,
            "metrics_sample_interval_seconds",
            &metrics_sample_interval_seconds.to_string(),
        )
        .await?;
    }

    if let Some(metrics_retention_days) = req.metrics_retention_days {
        if !(1..=90).contains(&metrics_retention_days) {
            return Err(AppError::ValidationError(
                t!("errors.settings.invalid_metrics_retention").to_string(),
            ));
        }
        upsert_setting(
            &state.pool,
            "metrics_retention_days",
            &metrics_retention_days.to_string(),
        )
        .await?;
    }

    if let Some(alert_cpu_percent) = req.alert_cpu_percent {
        if !(1.0..=100.0).contains(&alert_cpu_percent) {
            return Err(AppError::ValidationError(
                t!("errors.settings.invalid_alert_threshold").to_string(),
            ));
        }
        upsert_setting(&state.pool, "alert_cpu_percent", &alert_cpu_percent.to_string()).await?;
    }

    if let Some(alert_memory_percent) = req.alert_memory_percent {
        if !(1.0..=100.0).contains(&alert_memory_percent) {
            return Err(AppError::ValidationError(
                t!("errors.settings.invalid_alert_threshold").to_string(),
            ));
        }
        upsert_setting(&state.pool, "alert_memory_percent", &alert_memory_percent.to_string()).await?;
    }

    if let Some(alert_disk_percent) = req.alert_disk_percent {
        if !(1.0..=100.0).contains(&alert_disk_percent) {
            return Err(AppError::ValidationError(
                t!("errors.settings.invalid_alert_threshold").to_string(),
            ));
        }
        upsert_setting(&state.pool, "alert_disk_percent", &alert_disk_percent.to_string()).await?;
    }

    let settings = fetch_all_settings(&state.pool).await?;

    let message = if requires_restart {
        t!("success.settings.updated_restart_required").to_string()
    } else {
        t!("success.settings.updated").to_string()
    };

    Ok(ApiResponse::success_with_message(
        UpdateSettingsResponse {
            settings,
            requires_restart,
        },
        message,
    ))
}

async fn upsert_setting(pool: &sqlx::SqlitePool, key: &str, value: &str) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = datetime('now')",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

async fn fetch_all_settings(pool: &sqlx::SqlitePool) -> Result<SettingsResponse, AppError> {
    let auth_path_prefix = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'auth_path_prefix'",
    )
    .fetch_optional(pool)
    .await?
    .unwrap_or_else(|| "/login".to_string());

    let session_timeout_minutes = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'session_timeout'",
    )
    .fetch_optional(pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(15);

    let https_port = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'https_port'",
    )
    .fetch_optional(pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(443);

    let debug_mode = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'debug_mode'",
    )
    .fetch_optional(pool)
    .await?
    .map(|v| v == "true")
    .unwrap_or(false);

    let metrics_sample_interval_seconds = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'metrics_sample_interval_seconds'",
    )
    .fetch_optional(pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(60);

    let metrics_retention_days = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'metrics_retention_days'",
    )
    .fetch_optional(pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(7);

    let alert_cpu_percent = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'alert_cpu_percent'",
    )
    .fetch_optional(pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(85.0);

    let alert_memory_percent = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'alert_memory_percent'",
    )
    .fetch_optional(pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(85.0);

    let alert_disk_percent = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'alert_disk_percent'",
    )
    .fetch_optional(pool)
    .await?
    .and_then(|v| v.parse().ok())
    .unwrap_or(90.0);

    Ok(SettingsResponse {
        auth_path_prefix,
        session_timeout_minutes,
        https_port,
        debug_mode,
        metrics_sample_interval_seconds,
        metrics_retention_days,
        alert_cpu_percent,
        alert_memory_percent,
        alert_disk_percent,
    })
}
