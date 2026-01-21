//! Admin service

use chrono::Utc;
use sqlx::SqlitePool;

use crate::models::Admin;
use crate::utils::error::AppError;
use crate::utils::password::{hash_password, validate_password_strength, verify_password};

/// Admin service
pub struct AdminService;

impl AdminService {
    /// Get the admin user (there's only one)
    pub async fn get(pool: &SqlitePool) -> Result<Option<Admin>, AppError> {
        let admin = sqlx::query_as::<_, Admin>(
            "SELECT id, username, password_hash, created_at, updated_at, last_login_at FROM admin WHERE id = 1"
        )
        .fetch_optional(pool)
        .await?;

        Ok(admin)
    }

    /// Update admin password
    pub async fn update_password(
        pool: &SqlitePool,
        current_password: &str,
        new_password: &str,
    ) -> Result<(), AppError> {
        // Get current admin
        let admin = Self::get(pool)
            .await?
            .ok_or_else(|| AppError::NotFound("管理员不存在".to_string()))?;

        // Verify current password
        if !verify_password(current_password, &admin.password_hash)? {
            return Err(AppError::AuthError("当前密码错误".to_string()));
        }

        // Validate new password strength
        validate_password_strength(new_password)?;

        // Hash new password
        let new_hash = hash_password(new_password)?;

        // Update password
        sqlx::query("UPDATE admin SET password_hash = $1, updated_at = $2 WHERE id = 1")
            .bind(&new_hash)
            .bind(Utc::now())
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Update last login time
    pub async fn update_last_login(pool: &SqlitePool) -> Result<(), AppError> {
        sqlx::query("UPDATE admin SET last_login_at = $1 WHERE id = 1")
            .bind(Utc::now())
            .execute(pool)
            .await?;

        Ok(())
    }
}
