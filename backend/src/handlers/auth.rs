//! Auth handlers

use axum::{extract::State, Json};

use crate::api::AppState;
use crate::models::{LoginRequest, token::{LogoutRequest, RefreshTokenRequest, TokenPairResponse}};
use crate::response::ApiResponse;
use crate::services::AuthService;
use crate::utils::error::AppError;

/// Login handler
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<ApiResponse<TokenPairResponse>, AppError> {
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
) -> Result<ApiResponse<TokenPairResponse>, AppError> {
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

    Ok(ApiResponse::message("已成功注销"))
}
