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
}

/// Update settings request
#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub auth_path_prefix: Option<String>,
    pub session_timeout_minutes: Option<u32>,
    pub https_port: Option<u16>,
    pub debug_mode: Option<bool>,
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

    Ok(ApiResponse::success(SettingsResponse {
        auth_path_prefix,
        session_timeout_minutes,
        https_port,
        debug_mode,
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

    Ok(SettingsResponse {
        auth_path_prefix,
        session_timeout_minutes,
        https_port,
        debug_mode,
    })
}
