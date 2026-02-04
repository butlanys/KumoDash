//! Application error types with i18n support

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use rust_i18n::t;
use serde::Serialize;

/// Application error type
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("AUTH_INVALID_CREDENTIALS")]
    AuthError(String),

    #[error("AUTH_TOKEN_EXPIRED")]
    TokenExpired,

    #[error("AUTH_TOKEN_INVALID")]
    TokenInvalid,

    #[error("AUTH_ACCOUNT_LOCKED")]
    AccountLocked,

    #[error("AUTH_PERMISSION_DENIED")]
    PermissionDenied,

    #[error("RESOURCE_NOT_FOUND")]
    NotFound(String),

    #[error("VALIDATION_ERROR")]
    ValidationError(String),

    #[error("RATE_LIMIT_EXCEEDED")]
    RateLimitExceeded,

    #[error("SETUP_INVALID_TOKEN")]
    SetupInvalidToken,

    #[error("SETUP_ALREADY_COMPLETED")]
    SetupAlreadyCompleted,

    #[error("DATABASE_ERROR")]
    DatabaseError(#[from] sqlx::Error),

    #[error("INTERNAL_ERROR")]
    InternalError(String),

    #[error("TERMINAL_SESSION_NOT_FOUND")]
    TerminalSessionNotFound,

    #[error("TERMINAL_SESSION_LIMIT")]
    TerminalSessionLimit,

    #[error("TERMINAL_TMUX_ERROR")]
    TerminalTmuxError(String),

    #[error("TERMINAL_WS_TOKEN_INVALID")]
    TerminalWsTokenInvalid,

    #[error("TERMINAL_WS_TOKEN_EXPIRED")]
    TerminalWsTokenExpired,

    #[error("FILE_ACCESS_DENIED")]
    FileAccessDenied(String),

    #[error("FILE_READ_ERROR")]
    FileReadError(String),

    #[error("FILE_WRITE_ERROR")]
    FileWriteError(String),

    #[error("FILE_TOO_LARGE")]
    FileTooLarge(u64, u64),

    #[error("FILE_EXISTS")]
    FileExists(String),

    #[error("SYSTEMD_UNAVAILABLE")]
    SystemdUnavailable(String),

    #[error("SYSTEMD_INVALID_UNIT")]
    SystemdInvalidUnit,

    #[error("SYSTEMD_INVALID_ACTION")]
    SystemdInvalidAction,

    #[error("SYSTEMD_COMMAND_FAILED")]
    SystemdCommandFailed(String),

    #[error("SYSTEMD_FILE_ERROR")]
    SystemdFileError(String),
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
            AppError::TerminalSessionNotFound => "TERMINAL_SESSION_NOT_FOUND",
            AppError::TerminalSessionLimit => "TERMINAL_SESSION_LIMIT",
            AppError::TerminalTmuxError(_) => "TERMINAL_TMUX_ERROR",
            AppError::TerminalWsTokenInvalid => "TERMINAL_WS_TOKEN_INVALID",
            AppError::TerminalWsTokenExpired => "TERMINAL_WS_TOKEN_EXPIRED",
            AppError::FileAccessDenied(_) => "FILE_ACCESS_DENIED",
            AppError::FileReadError(_) => "FILE_READ_ERROR",
            AppError::FileWriteError(_) => "FILE_WRITE_ERROR",
            AppError::FileTooLarge(_, _) => "FILE_TOO_LARGE",
            AppError::FileExists(_) => "FILE_EXISTS",
            AppError::SystemdUnavailable(_) => "SYSTEMD_UNAVAILABLE",
            AppError::SystemdInvalidUnit => "SYSTEMD_INVALID_UNIT",
            AppError::SystemdInvalidAction => "SYSTEMD_INVALID_ACTION",
            AppError::SystemdCommandFailed(_) => "SYSTEMD_COMMAND_FAILED",
            AppError::SystemdFileError(_) => "SYSTEMD_FILE_ERROR",
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
            AppError::TerminalSessionNotFound => StatusCode::NOT_FOUND,
            AppError::TerminalSessionLimit => StatusCode::TOO_MANY_REQUESTS,
            AppError::TerminalTmuxError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::TerminalWsTokenInvalid => StatusCode::UNAUTHORIZED,
            AppError::TerminalWsTokenExpired => StatusCode::UNAUTHORIZED,
            AppError::FileAccessDenied(_) => StatusCode::FORBIDDEN,
            AppError::FileReadError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::FileWriteError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::FileTooLarge(_, _) => StatusCode::PAYLOAD_TOO_LARGE,
            AppError::FileExists(_) => StatusCode::CONFLICT,
            AppError::SystemdUnavailable(_) => StatusCode::SERVICE_UNAVAILABLE,
            AppError::SystemdInvalidUnit => StatusCode::BAD_REQUEST,
            AppError::SystemdInvalidAction => StatusCode::BAD_REQUEST,
            AppError::SystemdCommandFailed(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::SystemdFileError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    /// Get the localized error message using current locale
    pub fn localized_message(&self) -> String {
        match self {
            AppError::AuthError(reason) => t!("errors.auth.invalid_credentials", reason = reason).to_string(),
            AppError::TokenExpired => t!("errors.auth.token_expired").to_string(),
            AppError::TokenInvalid => t!("errors.auth.token_invalid").to_string(),
            AppError::AccountLocked => t!("errors.auth.account_locked").to_string(),
            AppError::PermissionDenied => t!("errors.auth.permission_denied").to_string(),
            AppError::NotFound(resource) => t!("errors.resource.not_found", resource = resource).to_string(),
            AppError::ValidationError(reason) => t!("errors.validation.generic", reason = reason).to_string(),
            AppError::RateLimitExceeded => t!("errors.rate_limit.exceeded").to_string(),
            AppError::SetupInvalidToken => t!("errors.setup.invalid_token").to_string(),
            AppError::SetupAlreadyCompleted => t!("errors.setup.already_completed").to_string(),
            AppError::DatabaseError(e) => t!("errors.database.error", detail = e.to_string()).to_string(),
            AppError::InternalError(_) => t!("errors.internal.error").to_string(),
            AppError::TerminalSessionNotFound => t!("errors.terminal.session_not_found").to_string(),
            AppError::TerminalSessionLimit => t!("errors.terminal.session_limit").to_string(),
            AppError::TerminalTmuxError(detail) => t!("errors.terminal.tmux_error", detail = detail).to_string(),
            AppError::TerminalWsTokenInvalid => t!("errors.terminal.ws_token_invalid").to_string(),
            AppError::TerminalWsTokenExpired => t!("errors.terminal.ws_token_expired").to_string(),
            AppError::FileAccessDenied(path) => t!("errors.files.access_denied", path = path).to_string(),
            AppError::FileReadError(detail) => t!("errors.files.read_error", detail = detail).to_string(),
            AppError::FileWriteError(detail) => t!("errors.files.write_error", detail = detail).to_string(),
            AppError::FileTooLarge(size, max) => t!("errors.files.too_large", size = size, max = max).to_string(),
            AppError::FileExists(path) => t!("errors.files.exists", path = path).to_string(),
            AppError::SystemdUnavailable(detail) => t!("errors.systemd.unavailable", detail = detail).to_string(),
            AppError::SystemdInvalidUnit => t!("errors.systemd.invalid_unit").to_string(),
            AppError::SystemdInvalidAction => t!("errors.systemd.invalid_action").to_string(),
            AppError::SystemdCommandFailed(detail) => t!("errors.systemd.command_failed", detail = detail).to_string(),
            AppError::SystemdFileError(detail) => t!("errors.systemd.file_error", detail = detail).to_string(),
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
                message: self.localized_message(),
            },
        };

        (status, Json(body)).into_response()
    }
}
