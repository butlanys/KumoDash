//! Setup handlers

use axum::{extract::State, Json};
use rust_i18n::t;
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::models::SetupRequest;
use crate::response::{ApiResponse, CreatedResponse};
use crate::services::SetupService;
use crate::utils::error::AppError;
use crate::utils::jwt::generate_token_pair;

/// Token validation request
#[derive(Debug, Deserialize)]
pub struct ValidateTokenRequest {
    pub token: String,
}

/// Token validation response
#[derive(Debug, Serialize)]
pub struct ValidateTokenResponse {
    pub valid: bool,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Setup init response
#[derive(Debug, Serialize)]
pub struct SetupInitResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub redirect_url: String,
}

/// Validate setup token
pub async fn validate_token(
    State(state): State<AppState>,
    Json(payload): Json<ValidateTokenRequest>,
) -> Result<ApiResponse<ValidateTokenResponse>, AppError> {
    let valid = SetupService::validate_token(&state.pool, &payload.token).await?;

    Ok(ApiResponse::success(ValidateTokenResponse {
        valid,
        expires_at: None, // TODO: return actual expiry
    }))
}

/// Initialize system
pub async fn init(
    State(state): State<AppState>,
    Json(payload): Json<SetupRequest>,
) -> Result<CreatedResponse<SetupInitResponse>, AppError> {
    // Initialize system
    SetupService::init(
        &state.pool,
        &payload.token,
        &payload.security,
        &payload.admin,
    )
    .await?;

    // Generate tokens for the new admin
    let (token_pair, _jti) = generate_token_pair(
        "1",
        &payload.admin.username,
        &state.settings.jwt_secret,
        state.settings.jwt_access_token_expires_minutes,
        state.settings.jwt_refresh_token_expires_days,
    )?;

    // Disable setup routes
    crate::SETUP_ROUTES_ENABLED.store(false, std::sync::atomic::Ordering::SeqCst);

    Ok(CreatedResponse::new(
        SetupInitResponse {
            access_token: token_pair.access_token,
            refresh_token: token_pair.refresh_token,
            redirect_url: "/".to_string(),
        },
        t!("success.setup.completed").to_string(),
    ))
}
