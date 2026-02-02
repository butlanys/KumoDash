//! Terminal session handlers

use axum::{
    extract::{Path, State},
    Extension, Json,
};
use rust_i18n::t;

use crate::api::AppState;
use crate::middleware::auth::AuthUser;
use crate::models::terminal::{
    CreateSessionRequest, CreateSessionResponse, ReconnectSessionResponse, ScrollbackResponse,
    SessionsListResponse,
};
use crate::response::ApiResponse;
use crate::services::TerminalService;
use crate::utils::error::AppError;

/// Create a new terminal session
pub async fn create_session(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<CreateSessionRequest>,
) -> Result<Json<ApiResponse<CreateSessionResponse>>, AppError> {
    let secret = &state.settings.jwt_secret;
    let response =
        TerminalService::create_session(&state.pool, auth_user.id, request, secret).await?;

    Ok(Json(ApiResponse::success(response)))
}

/// List user's terminal sessions
pub async fn list_sessions(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<ApiResponse<SessionsListResponse>>, AppError> {
    let response = TerminalService::list_sessions(&state.pool, auth_user.id).await?;

    Ok(Json(ApiResponse::success(response)))
}

/// Reconnect to an existing session (get new ws_token)
pub async fn reconnect_session(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(session_id): Path<String>,
) -> Result<Json<ApiResponse<ReconnectSessionResponse>>, AppError> {
    let secret = &state.settings.jwt_secret;
    let response =
        TerminalService::reconnect_session(&state.pool, &session_id, auth_user.id, secret).await?;

    Ok(Json(ApiResponse::success(response)))
}

/// Get session scrollback buffer
pub async fn get_scrollback(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(session_id): Path<String>,
) -> Result<Json<ApiResponse<ScrollbackResponse>>, AppError> {
    let response =
        TerminalService::get_scrollback(&state.pool, &session_id, auth_user.id)
            .await?;

    Ok(Json(ApiResponse::success(response)))
}

/// Terminate a terminal session
pub async fn terminate_session(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(session_id): Path<String>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    TerminalService::terminate_session(&state.pool, &session_id, auth_user.id).await?;

    Ok(Json(ApiResponse::success_with_message(
        (),
        t!("success.terminal.session_terminated").to_string(),
    )))
}

/// Terminate all terminal sessions for the current user
pub async fn terminate_all_sessions(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let count = TerminalService::terminate_all_sessions(&state.pool, auth_user.id).await?;

    Ok(Json(ApiResponse::success(serde_json::json!({
        "terminated_count": count
    }))))
}
