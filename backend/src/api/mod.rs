//! API routes

pub mod auth;
pub mod setup;
pub mod system;
pub mod terminal;
pub mod users;

use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use sqlx::SqlitePool;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::config::Settings;
use crate::middleware::auth::auth_middleware;
use crate::middleware::setup::setup_guard;
use crate::static_files::{serve_index, serve_static};

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
        .route("/api/v1/system/restart-panel", post(crate::handlers::system::restart_panel))
        .route("/api/v1/system/restart-server", post(crate::handlers::system::restart_server))
        .route("/api/v1/settings", get(crate::handlers::settings::get_settings))
        .route("/api/v1/settings", put(crate::handlers::settings::update_settings))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    // Terminal routes (protected)
    let terminal_routes = Router::new()
        .route("/api/v1/terminal/sessions", post(crate::handlers::terminal::create_session))
        .route("/api/v1/terminal/sessions", get(crate::handlers::terminal::list_sessions))
        .route("/api/v1/terminal/sessions", delete(crate::handlers::terminal::terminate_all_sessions))
        .route("/api/v1/terminal/sessions/{id}/reconnect", post(crate::handlers::terminal::reconnect_session))
        .route("/api/v1/terminal/sessions/{id}/scrollback", get(crate::handlers::terminal::get_scrollback))
        .route("/api/v1/terminal/sessions/{id}", delete(crate::handlers::terminal::terminate_session))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    // WebSocket route (token verified in handler)
    let ws_routes = Router::new()
        .route("/api/v1/terminal/ws/{id}", get(crate::handlers::terminal_ws::ws_upgrade));

    // Static file routes for embedded frontend
    let static_routes = Router::new()
        .route("/", get(serve_index))
        .route("/assets/{*path}", get(serve_static))
        .fallback(get(serve_index));

    // Combine routes
    Router::new()
        .merge(setup_routes)
        .merge(public_routes)
        .merge(protected_routes)
        .merge(terminal_routes)
        .merge(ws_routes)
        .merge(static_routes)
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
