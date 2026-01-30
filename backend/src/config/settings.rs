//! Application settings

use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tracing::warn;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySettings {
    pub auth_path_prefix: String,
    pub session_timeout_minutes: u32,
}

#[derive(Debug, Clone)]
pub struct Settings {
    pub jwt_secret: String,
    pub jwt_access_token_expires_minutes: i64,
    pub jwt_refresh_token_expires_days: i64,
    pub master_key: Vec<u8>,
    pub security: SecuritySettings,
    pub setup_token: String,
}

impl Settings {
    /// Load settings from database or create defaults
    pub async fn load_from_db(pool: &SqlitePool) -> anyhow::Result<Self> {
        // Get master key from environment or generate temporary one
        let master_key = std::env::var("KUMO_MASTER_KEY")
            .map(|k| k.as_bytes().to_vec())
            .unwrap_or_else(|_| {
                warn!("KUMO_MASTER_KEY not set, using temporary master key. Certificate will not persist across restarts.");
                b"temporary_master_key_for_debug_only_123".to_vec()
            });

        // Get JWT secret (in production, this should be set via environment)
        let jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "development_jwt_secret_key_123".to_string());

        // Get or generate setup token
        let setup_token = Self::get_or_generate_setup_token(pool).await?;

        // Load auth_path_prefix from database
        let auth_path_prefix = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = 'auth_path_prefix'",
        )
        .fetch_optional(pool)
        .await?
        .unwrap_or_else(|| "/login".to_string());

        // Load session_timeout from database
        let session_timeout_minutes = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = 'session_timeout'",
        )
        .fetch_optional(pool)
        .await?
        .and_then(|v| v.parse().ok())
        .unwrap_or(15);

        Ok(Self {
            jwt_secret,
            jwt_access_token_expires_minutes: 15,
            jwt_refresh_token_expires_days: 7,
            master_key,
            security: SecuritySettings {
                auth_path_prefix,
                session_timeout_minutes,
            },
            setup_token,
        })
    }

    /// Get existing setup token or generate new one
    async fn get_or_generate_setup_token(pool: &SqlitePool) -> anyhow::Result<String> {
        let result = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = 'setup_token'",
        )
        .fetch_optional(pool)
        .await?;

        match result {
            Some(json) => {
                // Try to parse as JSON first (new format)
                if let Ok(setup_token) = serde_json::from_str::<crate::services::setup::SetupToken>(&json) {
                    Ok(setup_token.token)
                } else {
                    // Fallback: treat as plain token string (old format)
                    Ok(json)
                }
            }
            None => {
                // Generate new token with expiration
                let setup_token = crate::services::setup::SetupToken {
                    token: rand::thread_rng()
                        .sample_iter(&rand::distributions::Alphanumeric)
                        .take(64)
                        .map(char::from)
                        .collect(),
                    expires_at: chrono::Utc::now() + chrono::Duration::minutes(30),
                    used: false,
                };

                let token_json = serde_json::to_string(&setup_token)?;

                sqlx::query(
                    "INSERT INTO system_settings (key, value, updated_at) VALUES ('setup_token', $1, $2)",
                )
                .bind(&token_json)
                .bind(chrono::Utc::now())
                .execute(pool)
                .await?;

                Ok(setup_token.token)
            }
        }
    }
}
