//! Setup API routes

use axum::{
    extract::{Path, State},
    response::Redirect,
    routing::{get, post},
    Router,
};
use serde::Deserialize;

use crate::{
    api::AppState,
    handlers::setup::{init, validate_token},
    utils::error::AppError,
};

/// Setup token path parameter
#[derive(Debug, Deserialize)]
pub struct SetupPathParams {
    token: String,
}

/// Verify setup token and redirect to setup wizard
pub async fn verify_token(
    State(state): State<AppState>,
    Path(params): Path<SetupPathParams>,
) -> Result<Redirect, AppError> {
    // Check if already initialized
    if crate::services::SetupService::is_initialized(&state.pool).await? {
        return Err(AppError::SetupAlreadyCompleted);
    }

    // Validate token
    let valid = crate::services::SetupService::validate_token(&state.pool, &params.token).await?;

    if valid {
        // Redirect to setup wizard SPA
        Ok(Redirect::to("/setup-wizard"))
    } else {
        Err(AppError::SetupInvalidToken)
    }
}

/// Create setup API router
pub fn create_setup_router() -> Router<AppState> {
    Router::new()
        .route("/setup/{token}", get(verify_token))
        .route("/api/setup/validate-token", post(validate_token))
        .route("/api/setup/init", post(init))
}
