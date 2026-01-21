//! KumoDash Backend - Main Entry Point
//!
//! A lightweight cloud server control panel.

use std::sync::Arc;

use clap::Parser;
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use kumadash::{
    api::{create_router, AppState},
    config::{CliArgs, Settings},
    db,
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
    tracing::info!("Data directory: {}", args.data_dir);

    // Ensure data directory exists
    std::fs::create_dir_all(&args.data_dir)?;

    // Initialize database
    let database_url = args.database_url();
    let pool = db::init_pool(&database_url).await?;
    tracing::info!("Database connection established");

    // Initialize schema (embedded in code, no migration files)
    db::init_schema(&pool).await?;
    tracing::info!("Database schema initialized");

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
        pool,
        settings: Arc::new(settings),
    };

    // Create router
    let app = create_router(state);

    // Start server
    let addr = args.server_addr();
    let listener = TcpListener::bind(&addr).await?;
    tracing::info!("Server listening on http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
