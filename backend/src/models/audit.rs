//! Audit log model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Audit log database model
#[derive(Debug, Clone, FromRow)]
pub struct AuditLog {
    pub id: String,
    pub user_id: Option<i64>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub details: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Audit action types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditAction {
    Login,
    LoginFailed,
    Logout,
    PasswordChanged,
    TokenRefreshed,
    SetupCompleted,
}

impl AuditAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditAction::Login => "LOGIN",
            AuditAction::LoginFailed => "LOGIN_FAILED",
            AuditAction::Logout => "LOGOUT",
            AuditAction::PasswordChanged => "PASSWORD_CHANGED",
            AuditAction::TokenRefreshed => "TOKEN_REFRESHED",
            AuditAction::SetupCompleted => "SETUP_COMPLETED",
        }
    }
}

impl std::fmt::Display for AuditAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}
