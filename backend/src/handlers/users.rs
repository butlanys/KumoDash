//! Users handlers

use axum::{extract::State, Extension, Json};
use rust_i18n::t;

use crate::api::AppState;
use crate::middleware::auth::AuthUser;
use crate::models::{AdminResponse, PasswordChangeRequest};
use crate::response::ApiResponse;
use crate::services::{AdminService, AuthService};
use crate::utils::error::AppError;

/// Get current user info
pub async fn get_me(
    State(state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<ApiResponse<AdminResponse>, AppError> {
    let admin = AdminService::get(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(t!("errors.resource.user_not_found").to_string()))?;

    Ok(ApiResponse::success(AdminResponse::from(admin)))
}

/// Change password
pub async fn change_password(
    State(state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(payload): Json<PasswordChangeRequest>,
) -> Result<ApiResponse<()>, AppError> {
    AdminService::update_password(
        &state.pool,
        &payload.current_password,
        &payload.new_password,
    )
    .await?;

    // Revoke all refresh tokens after password change
    AuthService::revoke_all_tokens(&state.pool).await?;

    Ok(ApiResponse::message(t!("success.password.changed").to_string()))
}
