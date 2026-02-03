//! KumoDash Backend - Main Entry Point
//!
//! A lightweight cloud server control panel.

use std::sync::Arc;

use clap::Parser;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use kumadash::{
    api::AppState,
    cli,
    config::{CliArgs, Settings},
    db,
    server,
    services::{SetupService, TerminalService},
    SETUP_ROUTES_ENABLED,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Parse CLI arguments
    let args = CliArgs::parse();

    // Ensure data directory exists
    std::fs::create_dir_all(&args.data_dir)?;

    // Initialize database
    let database_url = args.database_url();
    let pool = db::init_pool(&database_url).await?;

    // Initialize schema (embedded in code, no migration files)
    db::init_schema(&pool).await?;

    // Check if this is first-time setup
    let setup_completed = SetupService::is_initialized(&pool).await?;

    if !setup_completed {
        // First-time setup: run interactive CLI wizard
        let port = cli::run_first_time_setup()?;
        
        // Save port to database
        cli::setup::save_port_to_db(&pool, port).await?;
        
        // Check debug mode from CLI args
        if args.is_debug_mode() {
            sqlx::query(
                "INSERT INTO system_settings (key, value, updated_at) VALUES ('debug_mode', 'true', datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = 'true', updated_at = datetime('now')"
            )
            .execute(&pool)
            .await?;
        }
        
        // Load settings and get setup token
        let settings = Settings::load_from_db(&pool).await?;
        
        // Print setup URL
        cli::setup::print_setup_url(port, &settings.setup_token);
        
        // Create app state and start server
        let state = AppState {
            pool: pool.clone(),
            settings: Arc::new(settings),
        };
        
        server::https::ServerManager::start(state).await?;
    } else {
        // Normal startup: initialize tracing and start server
        let log_filter = if args.is_debug_mode() {
            "debug,hyper=info,tower_http=info"
        } else {
            "info"
        };
        
        tracing_subscriber::registry()
            .with(
                tracing_subscriber::EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| log_filter.into()),
            )
            .with(tracing_subscriber::fmt::layer())
            .init();

        tracing::info!("Starting KumoDash Backend v0.2.0");
        tracing::info!("Data directory: {}", args.data_dir.display());
        tracing::info!("Terminal feature uses portable-pty (no external dependencies)");

        // Check debug mode from CLI args and save to database
        if args.is_debug_mode() {
            sqlx::query(
                "INSERT INTO system_settings (key, value, updated_at) VALUES ('debug_mode', 'true', datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = 'true', updated_at = datetime('now')"
            )
            .execute(&pool)
            .await?;
            tracing::info!("Debug mode enabled via CLI");
        }

        // Load settings from database
        let settings = Settings::load_from_db(&pool).await?;
        tracing::info!("Settings loaded");

        // Disable setup routes since setup is completed
        SETUP_ROUTES_ENABLED.store(false, std::sync::atomic::Ordering::SeqCst);
        tracing::info!("System initialized, setup routes disabled");

        // Cleanup stale terminal sessions from previous run
        match TerminalService::cleanup_stale_sessions(&pool).await {
            Ok(count) if count > 0 => {
                tracing::info!("Cleaned up {} stale terminal sessions", count);
            }
            Ok(_) => {}
            Err(e) => {
                tracing::warn!("Failed to cleanup stale terminal sessions: {}", e);
            }
        }

        // Create app state
        let state = AppState {
            pool: pool.clone(),
            settings: Arc::new(settings),
        };

        // Start server based on database configuration
        server::https::ServerManager::start(state).await?;
    }

    Ok(())
}
