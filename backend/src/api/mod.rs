//! API routes

pub mod auth;
pub mod setup;
pub mod system;
pub mod users;

use axum::{
    middleware,
    routing::{get, post, put},
    Router,
};
use sqlx::SqlitePool;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::config::Settings;
use crate::middleware::auth::auth_middleware;
use crate::middleware::setup::setup_guard;

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub settings: Arc<Settings>,
}

/// Create the main application router
pub fn create_router(state: AppState) -> Router {
    // Setup routes (protected by setup_guard - returns 404 after initialization)
    let setup_routes = setup::create_setup_router()
        .layer(middleware::from_fn(setup_guard));

    // Public auth routes (always accessible)
    let public_routes = Router::new()
        .route("/api/v1/auth/validate-path", post(crate::handlers::auth::validate_path))
        .route("/api/v1/auth/login", post(crate::handlers::auth::login))
        .route("/api/v1/auth/refresh", post(crate::handlers::auth::refresh))
        .route("/health", get(health_check))
        .route("/ready", get(ready_check));

    // Protected routes (auth required)
    let protected_routes = Router::new()
        .route("/api/v1/auth/logout", post(crate::handlers::auth::logout))
        .route("/api/v1/users/me", get(crate::handlers::users::get_me))
        .route("/api/v1/users/me/password", put(crate::handlers::users::change_password))
        .route("/api/v1/system/status", get(crate::handlers::system::get_status))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    // Combine routes
    Router::new()
        .merge(setup_routes)
        .merge(public_routes)
        .merge(protected_routes)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

/// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}

/// Ready check endpoint (verifies database connection)
async fn ready_check(State(state): State<AppState>) -> Result<&'static str, (StatusCode, &'static str)> {
    sqlx::query("SELECT 1")
        .execute(&state.pool)
        .await
        .map_err(|_| (StatusCode::SERVICE_UNAVAILABLE, "Database not ready"))?;

    Ok("Ready")
}

use axum::extract::State;
use axum::http::StatusCode;
