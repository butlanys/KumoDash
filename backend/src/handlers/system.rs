//! System handlers

use axum::{extract::{Query, State}, Extension};
use serde::Deserialize;

use crate::api::AppState;
use crate::middleware::auth::AuthUser;
use crate::models::{SystemAlertsResponse, SystemMetricsResponse, SystemStatus};
use crate::response::ApiResponse;
use crate::services::SystemMetricsService;
use crate::utils::error::AppError;

#[derive(Debug, Deserialize)]
pub struct MetricsQuery {
    pub range: Option<String>,
    pub step: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct AlertsQuery {
    pub limit: Option<usize>,
}

/// Get system status
pub async fn get_status(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<ApiResponse<SystemStatus>, AppError> {
    let status = SystemMetricsService::collect_status().await?;
    Ok(ApiResponse::success(status))
}

/// Get historical system metrics
pub async fn get_metrics(
    State(state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Query(query): Query<MetricsQuery>,
) -> Result<ApiResponse<SystemMetricsResponse>, AppError> {
    let range = query.range.unwrap_or_else(|| "1h".to_string());
    let response = SystemMetricsService::query_metrics(&state.pool, &range, query.step).await?;
    Ok(ApiResponse::success(response))
}

/// Get recent system alerts
pub async fn get_alerts(
    State(state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Query(query): Query<AlertsQuery>,
) -> Result<ApiResponse<SystemAlertsResponse>, AppError> {
    let limit = query.limit.unwrap_or(50);
    let alerts = SystemMetricsService::list_alerts(&state.pool, limit).await?;
    Ok(ApiResponse::success(SystemAlertsResponse { alerts }))
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
