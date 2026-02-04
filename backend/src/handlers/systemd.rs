//! systemd handlers

use axum::{extract::{Path, Query, State}, Extension, Json};
use chrono::{Duration, Utc};
use serde::Deserialize;

use crate::api::AppState;
use crate::middleware::auth::AuthUser;
use crate::models::{
    SystemdLogsResponse, SystemdUnitCreateRequest, SystemdUnitFileResponse,
    SystemdUnitFileUpdateRequest, SystemdUnitsResponse,
};
use crate::response::ApiResponse;
use crate::services::SystemdService;
use crate::utils::error::AppError;
use crate::utils::time::parse_duration_seconds;

#[derive(Debug, Deserialize)]
pub struct LogsQuery {
    pub since: Option<String>,
    pub limit: Option<usize>,
}

/// List systemd units
pub async fn list_units(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<ApiResponse<SystemdUnitsResponse>, AppError> {
    let units = SystemdService::list_units().await?;
    Ok(ApiResponse::success(SystemdUnitsResponse { units }))
}

/// Control systemd unit (start/stop/restart)
pub async fn control_unit(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Path((name, action)): Path<(String, String)>,
) -> Result<ApiResponse<()>, AppError> {
    SystemdService::control_unit(&name, &action).await?;
    Ok(ApiResponse::success(()))
}

/// Fetch systemd logs for a unit
pub async fn get_logs(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Path(name): Path<String>,
    Query(query): Query<LogsQuery>,
) -> Result<ApiResponse<SystemdLogsResponse>, AppError> {
    let limit = query.limit.unwrap_or(200);
    let since = match query.since.as_deref() {
        None => None,
        Some(value) => Some(normalize_since(value)?),
    };

    let entries = SystemdService::fetch_logs(&name, since, limit).await?;

    Ok(ApiResponse::success(SystemdLogsResponse { unit: name, entries }))
}

/// Get unit file content
pub async fn get_unit_file(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Path(name): Path<String>,
) -> Result<ApiResponse<SystemdUnitFileResponse>, AppError> {
    let (path, content) = SystemdService::get_unit_file(&name).await?;
    Ok(ApiResponse::success(SystemdUnitFileResponse {
        unit: crate::models::SystemdUnitFile {
            name,
            path,
            content,
        },
    }))
}

/// Update unit file content
pub async fn update_unit_file(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Path(name): Path<String>,
    Json(payload): Json<SystemdUnitFileUpdateRequest>,
) -> Result<ApiResponse<SystemdUnitFileResponse>, AppError> {
    let path = SystemdService::update_unit_file(&name, &payload.content).await?;
    Ok(ApiResponse::success(SystemdUnitFileResponse {
        unit: crate::models::SystemdUnitFile {
            name,
            path,
            content: payload.content,
        },
    }))
}

/// Create a new systemd unit
pub async fn create_unit(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(payload): Json<SystemdUnitCreateRequest>,
) -> Result<ApiResponse<()>, AppError> {
    SystemdService::create_unit(
        &payload.name,
        &payload.content,
        payload.enable.unwrap_or(false),
        payload.start.unwrap_or(false),
    )
    .await?;

    Ok(ApiResponse::success(()))
}

fn normalize_since(value: &str) -> Result<String, AppError> {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(value) {
        return Ok(dt
            .with_timezone(&Utc)
            .format("%Y-%m-%d %H:%M:%S")
            .to_string());
    }

    if let Some(seconds) = parse_duration_seconds(value) {
        let dt = Utc::now() - Duration::seconds(seconds);
        return Ok(dt.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    Err(AppError::ValidationError(
        "Invalid since parameter".to_string(),
    ))
}
