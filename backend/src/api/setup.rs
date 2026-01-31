//! Setup API routes

use axum::{
    extract::Path,
    routing::{get, post},
    Router,
};
use serde::Deserialize;

use crate::{
    api::AppState,
    handlers::setup::{init, validate_token},
    static_files::serve_index,
};

/// Setup token path parameter
#[derive(Debug, Deserialize)]
pub struct SetupPathParams {
    #[allow(dead_code)]
    token: String,
}

/// Serve index.html for setup page (let SPA handle routing)
pub async fn serve_setup_page(
    Path(_params): Path<SetupPathParams>,
) -> impl axum::response::IntoResponse {
    serve_index().await
}

/// Create setup API router
pub fn create_setup_router() -> Router<AppState> {
    Router::new()
        .route("/setup/{token}", get(serve_setup_page))
        .route("/api/setup/validate-token", post(validate_token))
        .route("/api/setup/init", post(init))
}
