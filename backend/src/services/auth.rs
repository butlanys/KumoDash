//! Authentication service

use chrono::Utc;
use sqlx::SqlitePool;

use crate::config::Settings;
use crate::models::token::TokenPairResponse;
use crate::services::AdminService;
use crate::utils::error::AppError;
use crate::utils::jwt::{generate_token_pair, verify_token};
use crate::utils::password::{hash_password, verify_password};

/// Authentication service
pub struct AuthService;

impl AuthService {
    /// Login with username and password
    pub async fn login(
        pool: &SqlitePool,
        settings: &Settings,
        username: &str,
        password: &str,
    ) -> Result<TokenPairResponse, AppError> {
        // Get admin
        let admin = AdminService::get(pool)
            .await?
            .ok_or_else(|| AppError::AuthError("用户名或密码错误".to_string()))?;

        // Verify credentials
        if admin.username != username {
            return Err(AppError::AuthError("用户名或密码错误".to_string()));
        }

        if !verify_password(password, &admin.password_hash)? {
            return Err(AppError::AuthError("用户名或密码错误".to_string()));
        }

        // Generate token pair
        let (token_pair, refresh_jti) = generate_token_pair(
            &admin.id.to_string(),
            &admin.username,
            &settings.jwt_secret,
            settings.jwt_access_token_expires_minutes,
            settings.jwt_refresh_token_expires_days,
        )?;

        // Store refresh token hash
        let token_hash = hash_password(&token_pair.refresh_token)?;
        let expires_at = Utc::now()
            + chrono::Duration::days(settings.jwt_refresh_token_expires_days);

        sqlx::query(
            r#"
            INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(&refresh_jti)
        .bind(admin.id)
        .bind(&token_hash)
        .bind(expires_at)
        .bind(Utc::now())
        .execute(pool)
        .await?;

        // Update last login
        AdminService::update_last_login(pool).await?;

        Ok(TokenPairResponse {
            access_token: token_pair.access_token,
            refresh_token: token_pair.refresh_token,
            expires_in: token_pair.expires_in,
            token_type: token_pair.token_type,
        })
    }

    /// Refresh access token
    pub async fn refresh(
        pool: &SqlitePool,
        settings: &Settings,
        refresh_token: &str,
    ) -> Result<TokenPairResponse, AppError> {
        // Verify refresh token
        let claims = verify_token(refresh_token, &settings.jwt_secret)?;

        if claims.claims.token_type != "refresh" {
            return Err(AppError::TokenInvalid);
        }

        // Check if token is revoked
        let stored_token = sqlx::query_as::<_, (String, Option<chrono::DateTime<Utc>>)>(
            "SELECT token_hash, revoked_at FROM refresh_tokens WHERE id = $1",
        )
        .bind(&claims.claims.jti)
        .fetch_optional(pool)
        .await?;

        match stored_token {
            Some((_, Some(_))) => {
                // Token has been revoked
                return Err(AppError::TokenInvalid);
            }
            Some((token_hash, None)) => {
                // Verify token hash
                if !verify_password(refresh_token, &token_hash)? {
                    return Err(AppError::TokenInvalid);
                }
            }
            None => {
                return Err(AppError::TokenInvalid);
            }
        }

        // Get admin
        let admin = AdminService::get(pool)
            .await?
            .ok_or(AppError::TokenInvalid)?;

        // Generate new token pair
        let (token_pair, new_refresh_jti) = generate_token_pair(
            &admin.id.to_string(),
            &admin.username,
            &settings.jwt_secret,
            settings.jwt_access_token_expires_minutes,
            settings.jwt_refresh_token_expires_days,
        )?;

        // Revoke old refresh token
        sqlx::query("UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2")
            .bind(Utc::now())
            .bind(&claims.claims.jti)
            .execute(pool)
            .await?;

        // Store new refresh token
        let token_hash = hash_password(&token_pair.refresh_token)?;
        let expires_at = Utc::now()
            + chrono::Duration::days(settings.jwt_refresh_token_expires_days);

        sqlx::query(
            r#"
            INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(&new_refresh_jti)
        .bind(admin.id)
        .bind(&token_hash)
        .bind(expires_at)
        .bind(Utc::now())
        .execute(pool)
        .await?;

        Ok(TokenPairResponse {
            access_token: token_pair.access_token,
            refresh_token: token_pair.refresh_token,
            expires_in: token_pair.expires_in,
            token_type: token_pair.token_type,
        })
    }

    /// Logout - revoke refresh token
    pub async fn logout(pool: &SqlitePool, refresh_token: &str, jwt_secret: &str) -> Result<(), AppError> {
        // Verify refresh token to get jti
        let claims = verify_token(refresh_token, jwt_secret)?;

        // Revoke the token
        sqlx::query("UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2")
            .bind(Utc::now())
            .bind(&claims.claims.jti)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Revoke all refresh tokens for admin
    pub async fn revoke_all_tokens(pool: &SqlitePool) -> Result<(), AppError> {
        sqlx::query("UPDATE refresh_tokens SET revoked_at = $1 WHERE revoked_at IS NULL")
            .bind(Utc::now())
            .execute(pool)
            .await?;

        Ok(())
    }
}
