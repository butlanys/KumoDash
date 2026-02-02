//! Terminal session service

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::{Duration, Utc};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::terminal::{
    CreateSessionRequest, CreateSessionResponse, ReconnectSessionResponse, ScrollbackResponse,
    SessionInfo, SessionLimits, SessionsListResponse, TerminalSession,
};
use crate::services::pty_manager::pty_manager;
use crate::utils::error::AppError;
use crate::utils::jwt::{generate_access_token, verify_token};

/// Maximum sessions per user
const MAX_SESSIONS_PER_USER: i32 = 10;

/// WebSocket token expiry in seconds
const WS_TOKEN_EXPIRY_SECONDS: i64 = 60;

/// Terminal session service
pub struct TerminalService;

impl TerminalService {
    /// Generate a short-lived WebSocket token
    pub fn generate_ws_token(
        session_id: &str,
        user_id: &str,
        secret: &str,
    ) -> Result<(String, chrono::DateTime<Utc>), AppError> {
        let expires_at = Utc::now() + Duration::seconds(WS_TOKEN_EXPIRY_SECONDS);
        
        // Use JWT with special scope for WS
        let token = generate_access_token(
            &format!("ws:{}:{}", user_id, session_id),
            "terminal",
            secret,
            1, // 1 minute
        )?;

        Ok((token, expires_at))
    }

    /// Verify WebSocket token and extract session_id and user_id
    pub fn verify_ws_token(
        token: &str,
        secret: &str,
    ) -> Result<(String, String), AppError> {
        let token_data = verify_token(token, secret)
            .map_err(|_| AppError::TerminalWsTokenInvalid)?;

        let sub = &token_data.claims.sub;
        if !sub.starts_with("ws:") {
            return Err(AppError::TerminalWsTokenInvalid);
        }

        let parts: Vec<&str> = sub.splitn(3, ':').collect();
        if parts.len() != 3 {
            return Err(AppError::TerminalWsTokenInvalid);
        }

        Ok((parts[1].to_string(), parts[2].to_string()))
    }

    /// Create a new terminal session
    pub async fn create_session(
        pool: &SqlitePool,
        user_id: i64,
        request: CreateSessionRequest,
        secret: &str,
    ) -> Result<CreateSessionResponse, AppError> {
        // Check session limit
        let count = Self::get_user_session_count(pool, user_id).await?;
        if count >= MAX_SESSIONS_PER_USER {
            return Err(AppError::TerminalSessionLimit);
        }

        // Generate session ID and name
        let session_id = Uuid::new_v4().to_string();
        let name = request.name.unwrap_or_else(|| format!("session-{}", &session_id[..8]));
        let shell = request.shell.unwrap_or_else(|| "/bin/bash".to_string());
        let cols = request.cols.unwrap_or(80);
        let rows = request.rows.unwrap_or(24);
        let now = Utc::now();

        // Check if name already exists
        let existing = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM terminal_sessions WHERE name = ? AND user_id = ? AND status = 'running'"
        )
        .bind(&name)
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        if existing > 0 {
            return Err(AppError::ValidationError(format!("Session name '{}' already exists", name)));
        }

        // Create PTY session using portable-pty
        pty_manager().create_session(
            &session_id,
            &shell,
            request.cwd.as_deref(),
            cols as u16,
            rows as u16,
        )?;

        // Insert into database
        sqlx::query(
            r#"
            INSERT INTO terminal_sessions (id, user_id, name, tmux_session, shell, cwd, cols, rows, status, created_at, last_activity_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running', ?, ?)
            "#,
        )
        .bind(&session_id)
        .bind(user_id)
        .bind(&name)
        .bind(&session_id) // Use session_id as tmux_session for compatibility
        .bind(&shell)
        .bind(&request.cwd)
        .bind(cols)
        .bind(rows)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        // Generate WS token
        let (ws_token, token_expires_at) =
            Self::generate_ws_token(&session_id, &user_id.to_string(), secret)?;

        Ok(CreateSessionResponse {
            session_id: session_id.clone(),
            name,
            ws_token,
            ws_url: format!("/api/v1/terminal/ws/{}", session_id),
            token_expires_at,
            created_at: now,
        })
    }

    /// Get session by ID
    pub async fn get_session(
        pool: &SqlitePool,
        session_id: &str,
        user_id: i64,
    ) -> Result<TerminalSession, AppError> {
        sqlx::query_as::<_, TerminalSession>(
            "SELECT * FROM terminal_sessions WHERE id = ? AND user_id = ?",
        )
        .bind(session_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::TerminalSessionNotFound)
    }

    /// Reconnect to an existing session
    pub async fn reconnect_session(
        pool: &SqlitePool,
        session_id: &str,
        user_id: i64,
        secret: &str,
    ) -> Result<ReconnectSessionResponse, AppError> {
        let session = Self::get_session(pool, session_id, user_id).await?;

        if session.status != "running" {
            return Err(AppError::TerminalSessionNotFound);
        }

        // Check if PTY session still exists
        if !pty_manager().session_exists(session_id) {
            // Mark as stopped
            Self::mark_session_stopped(pool, session_id, "pty_gone").await?;
            return Err(AppError::TerminalSessionNotFound);
        }

        // Generate new WS token
        let (ws_token, token_expires_at) =
            Self::generate_ws_token(session_id, &user_id.to_string(), secret)?;

        Ok(ReconnectSessionResponse {
            session_id: session_id.to_string(),
            ws_token,
            ws_url: format!("/api/v1/terminal/ws/{}", session_id),
            token_expires_at,
            scrollback_available: true,
        })
    }

    /// List user's sessions
    pub async fn list_sessions(
        pool: &SqlitePool,
        user_id: i64,
    ) -> Result<SessionsListResponse, AppError> {
        let sessions = sqlx::query_as::<_, TerminalSession>(
            "SELECT * FROM terminal_sessions WHERE user_id = ? AND status = 'running' ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        // Filter to only sessions that still exist in PTY manager
        let session_infos: Vec<SessionInfo> = sessions
            .into_iter()
            .filter(|s| pty_manager().session_exists(&s.id))
            .map(|s| SessionInfo {
                session_id: s.id,
                name: s.name,
                status: s.status,
                created_at: s.created_at,
                last_activity_at: s.last_activity_at,
                connected_clients: 0,
            })
            .collect();

        let current_count = session_infos.len() as i32;

        Ok(SessionsListResponse {
            sessions: session_infos,
            limits: SessionLimits {
                max_sessions: MAX_SESSIONS_PER_USER,
                current_count,
            },
        })
    }

    /// Get scrollback buffer (base64 encoded raw bytes)
    pub async fn get_scrollback(
        pool: &SqlitePool,
        session_id: &str,
        user_id: i64,
    ) -> Result<ScrollbackResponse, AppError> {
        let _session = Self::get_session(pool, session_id, user_id).await?;

        let (bytes, byte_count) = pty_manager().get_scrollback(session_id).await?;
        let content = BASE64.encode(&bytes);

        Ok(ScrollbackResponse {
            content,
            byte_count: byte_count as i32,
        })
    }

    /// Terminate a session
    pub async fn terminate_session(
        pool: &SqlitePool,
        session_id: &str,
        user_id: i64,
    ) -> Result<(), AppError> {
        let _session = Self::get_session(pool, session_id, user_id).await?;

        // Remove from PTY manager
        pty_manager().remove_session(session_id);

        // Mark as stopped
        Self::mark_session_stopped(pool, session_id, "user_terminated").await?;

        Ok(())
    }

    /// Mark session as stopped
    async fn mark_session_stopped(
        pool: &SqlitePool,
        session_id: &str,
        reason: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE terminal_sessions SET status = 'stopped', ended_at = ?, end_reason = ? WHERE id = ?",
        )
        .bind(Utc::now())
        .bind(reason)
        .bind(session_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Update last activity time
    pub async fn update_activity(pool: &SqlitePool, session_id: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE terminal_sessions SET last_activity_at = ? WHERE id = ?")
            .bind(Utc::now())
            .bind(session_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Get user's running session count
    async fn get_user_session_count(pool: &SqlitePool, user_id: i64) -> Result<i32, AppError> {
        let count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM terminal_sessions WHERE user_id = ? AND status = 'running'",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        Ok(count as i32)
    }

    /// Resize session window
    pub async fn resize_session(
        pool: &SqlitePool,
        session_id: &str,
        cols: u16,
        rows: u16,
    ) -> Result<(), AppError> {
        // Resize in PTY manager
        pty_manager().resize(session_id, cols, rows).await?;

        // Update in database
        sqlx::query("UPDATE terminal_sessions SET cols = ?, rows = ? WHERE id = ?")
            .bind(cols as i32)
            .bind(rows as i32)
            .bind(session_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Check if session exists in PTY manager
    pub fn session_exists(session_id: &str) -> bool {
        pty_manager().session_exists(session_id)
    }

    /// Terminate all sessions for a user
    pub async fn terminate_all_sessions(
        pool: &SqlitePool,
        user_id: i64,
    ) -> Result<i32, AppError> {
        // Get all running sessions
        let sessions = sqlx::query_scalar::<_, String>(
            "SELECT id FROM terminal_sessions WHERE user_id = ? AND status = 'running'",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        let count = sessions.len() as i32;

        // Remove from PTY manager and mark as stopped
        for session_id in sessions {
            pty_manager().remove_session(&session_id);
            Self::mark_session_stopped(pool, &session_id, "user_terminated_all").await?;
        }

        Ok(count)
    }

    /// Cleanup stale sessions on startup
    /// Called when the server starts to mark any "running" sessions as stopped
    /// since the PTY processes were lost when the server was shut down
    pub async fn cleanup_stale_sessions(pool: &SqlitePool) -> Result<i32, AppError> {
        let result = sqlx::query(
            "UPDATE terminal_sessions 
             SET status = 'stopped', 
                 ended_at = datetime('now'), 
                 end_reason = 'server_restart' 
             WHERE status = 'running'",
        )
        .execute(pool)
        .await?;

        Ok(result.rows_affected() as i32)
    }
}
