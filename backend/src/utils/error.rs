//! Application error types

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

/// Application error type
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("认证失败: {0}")]
    AuthError(String),

    #[error("Token 已过期")]
    TokenExpired,

    #[error("Token 无效")]
    TokenInvalid,

    #[error("账户已锁定")]
    AccountLocked,

    #[error("权限不足")]
    PermissionDenied,

    #[error("资源未找到: {0}")]
    NotFound(String),

    #[error("验证失败: {0}")]
    ValidationError(String),

    #[error("请求过于频繁")]
    RateLimitExceeded,

    #[error("安装链接无效或已过期")]
    SetupInvalidToken,

    #[error("系统已初始化")]
    SetupAlreadyCompleted,

    #[error("数据库错误: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("内部错误")]
    InternalError(String),
}

/// Error response detail
#[derive(Debug, Serialize)]
pub struct ErrorDetail {
    pub code: String,
    pub message: String,
}

/// Error response structure
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub success: bool,
    pub error: ErrorDetail,
}

impl AppError {
    /// Get the error code string
    pub fn code(&self) -> &'static str {
        match self {
            AppError::AuthError(_) => "AUTH_INVALID_CREDENTIALS",
            AppError::TokenExpired => "AUTH_TOKEN_EXPIRED",
            AppError::TokenInvalid => "AUTH_TOKEN_INVALID",
            AppError::AccountLocked => "AUTH_ACCOUNT_LOCKED",
            AppError::PermissionDenied => "AUTH_PERMISSION_DENIED",
            AppError::NotFound(_) => "RESOURCE_NOT_FOUND",
            AppError::ValidationError(_) => "VALIDATION_ERROR",
            AppError::RateLimitExceeded => "RATE_LIMIT_EXCEEDED",
            AppError::SetupInvalidToken => "SETUP_INVALID_TOKEN",
            AppError::SetupAlreadyCompleted => "SETUP_ALREADY_COMPLETED",
            AppError::DatabaseError(_) => "DATABASE_ERROR",
            AppError::InternalError(_) => "INTERNAL_ERROR",
        }
    }

    /// Get the HTTP status code
    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::AuthError(_) => StatusCode::UNAUTHORIZED,
            AppError::TokenExpired => StatusCode::UNAUTHORIZED,
            AppError::TokenInvalid => StatusCode::UNAUTHORIZED,
            AppError::AccountLocked => StatusCode::FORBIDDEN,
            AppError::PermissionDenied => StatusCode::FORBIDDEN,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::ValidationError(_) => StatusCode::BAD_REQUEST,
            AppError::RateLimitExceeded => StatusCode::TOO_MANY_REQUESTS,
            AppError::SetupInvalidToken => StatusCode::BAD_REQUEST,
            AppError::SetupAlreadyCompleted => StatusCode::BAD_REQUEST,
            AppError::DatabaseError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::InternalError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = ErrorResponse {
            success: false,
            error: ErrorDetail {
                code: self.code().to_string(),
                message: self.to_string(),
            },
        };

        (status, Json(body)).into_response()
    }
}
