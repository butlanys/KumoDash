//! Setup route protection middleware
//!
//! Returns 404 for setup routes after system initialization.
//! This prevents information leakage about setup API existence.

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::sync::atomic::Ordering;

use crate::SETUP_ROUTES_ENABLED;

/// Setup guard middleware
/// Returns 404 NOT FOUND when setup is already completed
pub async fn setup_guard(request: Request, next: Next) -> Response {
    // Check if setup routes are enabled (atomic, fast check)
    if !SETUP_ROUTES_ENABLED.load(Ordering::SeqCst) {
        // Return 404 to hide that setup routes exist
        return StatusCode::NOT_FOUND.into_response();
    }

    next.run(request).await
}
