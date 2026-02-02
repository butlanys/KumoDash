//! Terminal session models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Terminal session status
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TerminalSessionStatus {
    #[default]
    Running,
    Stopped,
}

/// Terminal session database model
#[derive(Debug, Clone, FromRow)]
pub struct TerminalSession {
    pub id: String,
    pub user_id: i64,
    pub name: String,
    pub tmux_session: String,
    pub shell: String,
    pub cwd: Option<String>,
    pub cols: i32,
    pub rows: i32,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub last_activity_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub end_reason: Option<String>,
}

/// Create session request
#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    pub name: Option<String>,
    pub shell: Option<String>,
    pub cwd: Option<String>,
    pub cols: Option<i32>,
    pub rows: Option<i32>,
}

/// Session info response
#[derive(Debug, Serialize)]
pub struct SessionInfo {
    pub session_id: String,
    pub name: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub last_activity_at: DateTime<Utc>,
    pub connected_clients: i32,
}

/// Create session response
#[derive(Debug, Serialize)]
pub struct CreateSessionResponse {
    pub session_id: String,
    pub name: String,
    pub ws_token: String,
    pub ws_url: String,
    pub token_expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// Reconnect session response
#[derive(Debug, Serialize)]
pub struct ReconnectSessionResponse {
    pub session_id: String,
    pub ws_token: String,
    pub ws_url: String,
    pub token_expires_at: DateTime<Utc>,
    pub scrollback_available: bool,
}

/// Sessions list response
#[derive(Debug, Serialize)]
pub struct SessionsListResponse {
    pub sessions: Vec<SessionInfo>,
    pub limits: SessionLimits,
}

/// Session limits
#[derive(Debug, Serialize)]
pub struct SessionLimits {
    pub max_sessions: i32,
    pub current_count: i32,
}

/// Scrollback response
#[derive(Debug, Serialize)]
pub struct ScrollbackResponse {
    /// Base64 encoded raw terminal output (preserves ANSI sequences)
    pub content: String,
    /// Size in bytes
    pub byte_count: i32,
}

/// Terminal audit event type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TerminalAuditEventType {
    Create,
    Connect,
    Disconnect,
    Resize,
    Destroy,
}

/// Terminal audit event database model
#[derive(Debug, Clone, FromRow)]
pub struct TerminalAuditEvent {
    pub id: i64,
    pub session_id: String,
    pub user_id: i64,
    pub event_type: String,
    pub client_ip: Option<String>,
    pub user_agent: Option<String>,
    pub meta: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// WebSocket control message from client
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsControlMessage {
    Resize { cols: u16, rows: u16 },
    Ping,
}

/// WebSocket status message to client
#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsStatusMessage {
    Ready { scrollback_lines: i32 },
    Pong,
    Disconnected { reason: String },
    Exit { code: i32 },
    Error { message: String },
}
