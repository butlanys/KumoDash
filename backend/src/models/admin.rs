//! Admin model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Admin database model
/// Note: System only has one admin user (id = 1), created during setup
#[derive(Debug, Clone, FromRow)]
pub struct Admin {
    pub id: i64,
    pub username: String,
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login_at: Option<DateTime<Utc>>,
}

/// Admin response for API (excludes sensitive fields)
#[derive(Debug, Serialize)]
pub struct AdminResponse {
    pub id: i64,
    pub username: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
    pub last_login_at: Option<DateTime<Utc>>,
}

impl From<Admin> for AdminResponse {
    fn from(admin: Admin) -> Self {
        Self {
            id: admin.id,
            username: admin.username,
            role: "admin".to_string(),
            created_at: admin.created_at,
            last_login_at: admin.last_login_at,
        }
    }
}

/// Setup initialization request
#[derive(Debug, Deserialize)]
pub struct SetupRequest {
    pub token: String,
    pub security: SecuritySettings,
    pub admin: AdminCredentials,
}

/// Security settings from setup wizard
#[derive(Debug, Deserialize)]
pub struct SecuritySettings {
    pub auth_path_prefix: Option<String>,
    pub session_timeout_minutes: Option<i64>,
}

/// Admin credentials for setup
#[derive(Debug, Deserialize)]
pub struct AdminCredentials {
    pub username: String,
    pub password: String,
}

/// Login request
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
    pub auth_path: String,
}

/// Password change request
#[derive(Debug, Deserialize)]
pub struct PasswordChangeRequest {
    pub current_password: String,
    pub new_password: String,
}
