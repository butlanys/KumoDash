//! KumoDash Backend - Main Entry Point
//!
//! A lightweight cloud server control panel.

use std::sync::Arc;

use clap::Parser;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use kumadash::{
    api::AppState,
    config::{CliArgs, Settings},
    db,
    server,
    services::SetupService,
    SETUP_ROUTES_ENABLED,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Parse CLI arguments
    let args = CliArgs::parse();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,kumadash=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting KumoDash Backend v0.1.0");
    tracing::info!("Data directory: {}", args.data_dir.display());

    // Ensure data directory exists
    std::fs::create_dir_all(&args.data_dir)?;

    // Initialize database
    let database_url = args.database_url();
    let pool = db::init_pool(&database_url).await?;
    tracing::info!("Database connection established");

    // Initialize schema (embedded in code, no migration files)
    db::init_schema(&pool).await?;
    tracing::info!("Database schema initialized");

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

    // Check if setup is completed
    let setup_completed = SetupService::is_initialized(&pool).await?;
    if setup_completed {
        SETUP_ROUTES_ENABLED.store(false, std::sync::atomic::Ordering::SeqCst);
        tracing::info!("System initialized, setup routes disabled");
    } else {
        tracing::info!("System not initialized, setup routes enabled");
    }

    // Create app state
    let state = AppState {
        pool: pool.clone(),
        settings: Arc::new(settings),
    };

    // Start server based on database configuration
    server::https::ServerManager::start(state).await?;

    Ok(())
}
