//! Application configuration
//!
//! Configuration is loaded from:
//! 1. CLI arguments (port, data directory)
//! 2. Database (JWT secret, session timeout, etc.)

use clap::Parser;
use rand::Rng;
use sqlx::SqlitePool;

use crate::utils::error::AppError;

/// CLI arguments
#[derive(Parser, Debug, Clone)]
#[command(name = "kumadash")]
#[command(about = "KumoDash - Lightweight Cloud Server Control Panel")]
#[command(version)]
pub struct CliArgs {
    /// Server port
    #[arg(short, long, default_value = "8080")]
    pub port: u16,

    /// Data directory path
    #[arg(short, long, default_value = "./data")]
    pub data_dir: String,

    /// Bind address
    #[arg(short, long, default_value = "0.0.0.0")]
    pub bind: String,
}

impl CliArgs {
    /// Get database URL
    pub fn database_url(&self) -> String {
        format!("sqlite:{}/kumadash.db?mode=rwc", self.data_dir)
    }

    /// Get server address
    pub fn server_addr(&self) -> String {
        format!("{}:{}", self.bind, self.port)
    }
}

/// Runtime settings loaded from database
#[derive(Debug, Clone)]
pub struct Settings {
    /// JWT secret key
    pub jwt_secret: String,
    /// Access token expiration in minutes
    pub jwt_access_token_expires_minutes: i64,
    /// Refresh token expiration in days
    pub jwt_refresh_token_expires_days: i64,
    /// API path prefix
    pub api_path_prefix: String,
    /// Session timeout in minutes
    pub session_timeout_minutes: i64,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            jwt_secret: String::new(),
            jwt_access_token_expires_minutes: 15,
            jwt_refresh_token_expires_days: 7,
            api_path_prefix: "/api/v1".to_string(),
            session_timeout_minutes: 15,
        }
    }
}

impl Settings {
    /// Load settings from database, generating defaults if not exist
    pub async fn load_from_db(pool: &SqlitePool) -> Result<Self, AppError> {
        let mut settings = Settings::default();

        // Load JWT secret (generate if not exists)
        settings.jwt_secret = match Self::get_setting(pool, "jwt_secret").await? {
            Some(secret) => secret,
            None => {
                let secret = Self::generate_jwt_secret();
                Self::set_setting(pool, "jwt_secret", &secret).await?;
                tracing::info!("Generated new JWT secret");
                secret
            }
        };

        // Load other settings with defaults
        if let Some(val) = Self::get_setting(pool, "jwt_access_token_expires_minutes").await? {
            settings.jwt_access_token_expires_minutes = val.parse().unwrap_or(15);
        }

        if let Some(val) = Self::get_setting(pool, "jwt_refresh_token_expires_days").await? {
            settings.jwt_refresh_token_expires_days = val.parse().unwrap_or(7);
        }

        if let Some(val) = Self::get_setting(pool, "api_path_prefix").await? {
            settings.api_path_prefix = val;
        }

        if let Some(val) = Self::get_setting(pool, "session_timeout").await? {
            settings.session_timeout_minutes = val.parse().unwrap_or(15);
        }

        Ok(settings)
    }

    /// Generate a secure random JWT secret
    fn generate_jwt_secret() -> String {
        rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(64)
            .map(char::from)
            .collect()
    }

    /// Get a setting from database
    async fn get_setting(pool: &SqlitePool, key: &str) -> Result<Option<String>, AppError> {
        let result = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = $1"
        )
        .bind(key)
        .fetch_optional(pool)
        .await?;

        Ok(result)
    }

    /// Set a setting in database
    async fn set_setting(pool: &SqlitePool, key: &str, value: &str) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO system_settings (key, value, updated_at)
            VALUES ($1, $2, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = datetime('now')
            "#
        )
        .bind(key)
        .bind(value)
        .execute(pool)
        .await?;

        Ok(())
    }
}
