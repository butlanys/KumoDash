//! Auth handlers

use axum::extract::State;
use axum::Json;
use rust_i18n::t;
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::models::{LoginRequest, token::{LogoutRequest, LogoutResponse, RefreshTokenRequest, TokenPairResponse, TokenRefreshResponse}};
use crate::response::ApiResponse;
use crate::services::AuthService;
use crate::utils::error::AppError;

#[derive(Deserialize)]
pub struct ValidatePathRequest {
    pub prefix: String,
}

#[derive(Serialize)]
pub struct ValidatePathResponse {
    pub valid: bool,
}

/// Get auth path prefix from database (always fresh)
async fn get_auth_path_prefix(pool: &sqlx::SqlitePool) -> String {
    sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_settings WHERE key = 'auth_path_prefix'",
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .unwrap_or_else(|| "/login".to_string())
}

/// Validate login path handler
pub async fn validate_path(
    State(state): State<AppState>,
    Json(payload): Json<ValidatePathRequest>,
) -> ApiResponse<ValidatePathResponse> {
    let configured_prefix = get_auth_path_prefix(&state.pool).await;
    let provided_path = payload.prefix.trim_matches('/');
    let expected_path = configured_prefix.trim_matches('/');
    
    let valid = provided_path == expected_path;
    ApiResponse::success(ValidatePathResponse { valid })
}

/// Login handler
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<ApiResponse<TokenPairResponse>, AppError> {
    // Validate auth path prefix (read fresh from database)
    let configured_prefix = get_auth_path_prefix(&state.pool).await;
    let provided_path = payload.auth_path.trim_matches('/');
    let expected_path = configured_prefix.trim_matches('/');
    
    if provided_path != expected_path {
        return Err(AppError::NotFound(t!("errors.resource.page_not_found").to_string()));
    }

    let tokens = AuthService::login(
        &state.pool,
        &state.settings,
        &payload.username,
        &payload.password,
    )
    .await?;

    Ok(ApiResponse::success(tokens))
}

/// Refresh token handler
pub async fn refresh(
    State(state): State<AppState>,
    Json(payload): Json<RefreshTokenRequest>,
) -> Result<ApiResponse<TokenRefreshResponse>, AppError> {
    let tokens = AuthService::refresh(
        &state.pool,
        &state.settings,
        &payload.refresh_token,
    )
    .await?;

    Ok(ApiResponse::success(tokens))
}

/// Logout handler
pub async fn logout(
    State(state): State<AppState>,
    Json(payload): Json<LogoutRequest>,
) -> Result<ApiResponse<LogoutResponse>, AppError> {
    AuthService::logout(&state.pool, &payload.refresh_token, &state.settings.jwt_secret).await?;

    // Get dynamic login path for redirect
    let login_path = get_auth_path_prefix(&state.pool).await;

    Ok(ApiResponse::success_with_message(
        LogoutResponse { login_path },
        t!("success.auth.logout").to_string(),
    ))
}
