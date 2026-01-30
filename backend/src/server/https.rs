//! Simplified server management
//! 
//! For now, we use HTTP only with debug mode toggle.
//! TLS support will be added in a future iteration.

use anyhow::Context;
use tokio::net::TcpListener;
use tracing::info;

use crate::{
    api::{create_router, AppState},
    utils::error::AppError,
};

pub struct ServerManager;

impl ServerManager {
    /// Start server based on database configuration
    pub async fn start(state: AppState) -> Result<(), AppError> {
        let pool = state.pool.clone();

        // Get server configuration from database
        let (https_port, debug_mode) = Self::get_server_config(&pool).await?;

        if debug_mode {
            Self::start_http_server(state, https_port).await
        } else {
            // TODO: Implement HTTPS server with TLS
            // For now, fall back to HTTP with a warning
            tracing::warn!("HTTPS not yet implemented, falling back to HTTP");
            Self::start_http_server(state, https_port).await
        }
    }

    /// Get server configuration from database
    async fn get_server_config(pool: &sqlx::SqlitePool) -> Result<(u16, bool), AppError> {
        // Get HTTPS port (default 8443)
        let port_result = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = 'https_port'",
        )
        .fetch_optional(pool)
        .await?;

        let https_port = port_result
            .and_then(|v| v.parse().ok())
            .unwrap_or(8443);

        // Get debug mode (default false)
        let debug_result = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = 'debug_mode'",
        )
        .fetch_optional(pool)
        .await?;

        let debug_mode = debug_result
            .map(|v| v == "true")
            .unwrap_or(false);

        Ok((https_port, debug_mode))
    }

    /// Start HTTP server
    async fn start_http_server(state: AppState, port: u16) -> Result<(), AppError> {
        let addr = format!("127.0.0.1:{}", port);
        let listener = TcpListener::bind(&addr)
            .await
            .context("Failed to bind port")
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        info!("HTTP server listening on http://{}", addr);
        
        // Only show setup URL if system is not initialized
        let setup_completed = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = 'setup_completed'",
        )
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .map(|v| v == "true")
        .unwrap_or(false);

        if !setup_completed {
            // Get setup token for URL display
            let setup_token_json = sqlx::query_scalar::<_, String>(
                "SELECT value FROM system_settings WHERE key = 'setup_token'",
            )
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;

            if let Some(json) = setup_token_json {
                // Parse JSON to get actual token
                if let Ok(setup_token) = serde_json::from_str::<serde_json::Value>(&json) {
                    if let Some(token) = setup_token.get("token").and_then(|t| t.as_str()) {
                        info!("Setup URL: http://localhost:{}/setup/{}", port, token);
                    }
                } else {
                    // Fallback: treat as plain token
                    info!("Setup URL: http://localhost:{}/setup/{}", port, json);
                }
            }
        }

        let app = create_router(state);
        axum::serve(listener, app)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;
        
        Ok(())
    }
}
