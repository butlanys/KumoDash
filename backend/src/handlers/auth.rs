//! Auth handlers

use axum::extract::State;
use axum::Json;
use rust_i18n::t;
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::models::{LoginRequest, token::{LogoutRequest, RefreshTokenRequest, TokenPairResponse, TokenRefreshResponse}};
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

/// Validate login path handler
pub async fn validate_path(
    State(state): State<AppState>,
    Json(payload): Json<ValidatePathRequest>,
) -> ApiResponse<ValidatePathResponse> {
    let configured_prefix = &state.settings.security.auth_path_prefix;
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
    // Validate auth path prefix
    let configured_prefix = &state.settings.security.auth_path_prefix;
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
) -> Result<ApiResponse<()>, AppError> {
    AuthService::logout(&state.pool, &payload.refresh_token, &state.settings.jwt_secret).await?;

    Ok(ApiResponse::message(t!("success.auth.logout").to_string()))
}
