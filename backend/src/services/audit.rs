//! Audit logging service

use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::AuditAction;
use crate::utils::error::AppError;

/// Audit service for logging operations
pub struct AuditService;

impl AuditService {
    /// Log an audit event
    pub async fn log(
        pool: &SqlitePool,
        user_id: Option<i64>,
        action: AuditAction,
        resource_type: &str,
        resource_id: Option<&str>,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
        details: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, user_agent, details, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(user_id)
        .bind(action.as_str())
        .bind(resource_type)
        .bind(resource_id)
        .bind(ip_address)
        .bind(user_agent)
        .bind(details)
        .bind(Utc::now())
        .execute(pool)
        .await?;

        Ok(())
    }

    /// List audit logs with pagination
    pub async fn list(
        pool: &SqlitePool,
        page: u32,
        per_page: u32,
    ) -> Result<(Vec<crate::models::AuditLog>, u64), AppError> {
        let offset = (page - 1) * per_page;

        let logs = sqlx::query_as::<_, crate::models::AuditLog>(
            r#"
            SELECT id, user_id, action, resource_type, resource_id, ip_address, user_agent, details, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(per_page as i32)
        .bind(offset as i32)
        .fetch_all(pool)
        .await?;

        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM audit_logs")
            .fetch_one(pool)
            .await?;

        Ok((logs, total.0 as u64))
    }
}
