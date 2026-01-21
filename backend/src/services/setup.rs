//! Setup service for installation wizard

use chrono::{Duration, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::models::{AdminCredentials, SecuritySettings};
use crate::utils::error::AppError;
use crate::utils::password::{hash_password, validate_password_strength};

/// Setup token information stored in system_settings
#[derive(Debug, Serialize, Deserialize)]
pub struct SetupToken {
    pub token: String,
    pub expires_at: chrono::DateTime<Utc>,
    pub used: bool,
}

/// Setup service
pub struct SetupService;

impl SetupService {
    /// Check if the system has been initialized
    pub async fn is_initialized(pool: &SqlitePool) -> Result<bool, AppError> {
        let result = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = 'setup_completed'"
        )
        .fetch_optional(pool)
        .await?;

        Ok(result.map(|v| v == "true").unwrap_or(false))
    }

    /// Generate a new setup token
    pub fn generate_token() -> SetupToken {
        let token: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(64)
            .map(char::from)
            .collect();

        SetupToken {
            token,
            expires_at: Utc::now() + Duration::minutes(30),
            used: false,
        }
    }

    /// Save setup token to database
    pub async fn save_token(pool: &SqlitePool, token: &SetupToken) -> Result<(), AppError> {
        let token_json = serde_json::to_string(token)
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        sqlx::query(
            r#"
            INSERT INTO system_settings (key, value, updated_at)
            VALUES ('setup_token', $1, $2)
            ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = $2
            "#
        )
        .bind(&token_json)
        .bind(Utc::now())
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Validate a setup token
    pub async fn validate_token(pool: &SqlitePool, token: &str) -> Result<bool, AppError> {
        // Check if already initialized
        if Self::is_initialized(pool).await? {
            return Err(AppError::SetupAlreadyCompleted);
        }

        let result = sqlx::query_scalar::<_, String>(
            "SELECT value FROM system_settings WHERE key = 'setup_token'"
        )
        .fetch_optional(pool)
        .await?;

        match result {
            Some(json) => {
                let setup_token: SetupToken = serde_json::from_str(&json)
                    .map_err(|e| AppError::InternalError(e.to_string()))?;

                if setup_token.used {
                    return Err(AppError::SetupInvalidToken);
                }

                if setup_token.expires_at < Utc::now() {
                    return Err(AppError::SetupInvalidToken);
                }

                Ok(setup_token.token == token)
            }
            None => Ok(false),
        }
    }

    /// Initialize the system with admin credentials
    pub async fn init(
        pool: &SqlitePool,
        token: &str,
        security: &SecuritySettings,
        admin: &AdminCredentials,
    ) -> Result<(), AppError> {
        // Validate token first
        if !Self::validate_token(pool, token).await? {
            return Err(AppError::SetupInvalidToken);
        }

        // Validate password strength
        validate_password_strength(&admin.password)?;

        // Validate username
        if admin.username.len() < 3 || admin.username.len() > 50 {
            return Err(AppError::ValidationError(
                "用户名长度必须在3-50个字符之间".to_string(),
            ));
        }

        // Hash password
        let password_hash = hash_password(&admin.password)?;

        // Create admin user
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO admin (id, username, password_hash, created_at, updated_at)
            VALUES (1, $1, $2, $3, $3)
            "#
        )
        .bind(&admin.username)
        .bind(&password_hash)
        .bind(now)
        .execute(pool)
        .await?;

        // Save security settings
        if let Some(prefix) = &security.api_path_prefix {
            Self::save_setting(pool, "api_path_prefix", prefix).await?;
        }

        if let Some(timeout) = security.session_timeout_minutes {
            Self::save_setting(pool, "session_timeout", &timeout.to_string()).await?;
        }

        // Mark setup as completed
        Self::save_setting(pool, "setup_completed", "true").await?;

        // Delete the setup token
        sqlx::query("DELETE FROM system_settings WHERE key = 'setup_token'")
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Save a system setting
    async fn save_setting(pool: &SqlitePool, key: &str, value: &str) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO system_settings (key, value, updated_at)
            VALUES ($1, $2, $3)
            ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = $3
            "#
        )
        .bind(key)
        .bind(value)
        .bind(Utc::now())
        .execute(pool)
        .await?;

        Ok(())
    }
}
