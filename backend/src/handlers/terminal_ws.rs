//! Terminal WebSocket handler

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    http::HeaderMap,
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use std::io::Read;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::interval;
use tracing::{debug, error, info, warn};

use crate::api::AppState;
use crate::models::terminal::{WsControlMessage, WsStatusMessage};
use crate::services::{pty_manager, TerminalService};
use crate::utils::error::AppError;

/// Control message prefix (NUL byte)
const CONTROL_PREFIX: char = '\x00';

/// Heartbeat interval
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(30);

/// Read buffer size
const READ_BUFFER_SIZE: usize = 4096;

/// WebSocket upgrade handler
pub async fn ws_upgrade(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Result<Response, AppError> {
    // Extract token from Sec-WebSocket-Protocol header
    let protocols = headers
        .get("sec-websocket-protocol")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    let token = extract_ws_token(protocols)?;

    // Verify token
    let (user_id, token_session_id) =
        TerminalService::verify_ws_token(&token, &state.settings.jwt_secret)?;

    // Verify session_id matches
    if token_session_id != session_id {
        return Err(AppError::TerminalWsTokenInvalid);
    }

    // Check PTY session exists
    if !pty_manager().session_exists(&session_id) {
        return Err(AppError::TerminalSessionNotFound);
    }

    info!(
        "WebSocket upgrade for session {} (user {})",
        session_id, user_id
    );

    let pool = state.pool.clone();
    let session_id_clone = session_id.clone();

    // Upgrade connection with protocol response
    Ok(ws
        .protocols(["kumodash-terminal"])
        .on_upgrade(move |socket| {
            handle_socket(socket, pool, session_id_clone)
        }))
}

/// Extract token from Sec-WebSocket-Protocol header
fn extract_ws_token(protocols: &str) -> Result<String, AppError> {
    // Format: "kumodash-terminal, <token>"
    let parts: Vec<&str> = protocols.split(',').map(|s| s.trim()).collect();

    if parts.len() < 2 || parts[0] != "kumodash-terminal" {
        return Err(AppError::TerminalWsTokenInvalid);
    }

    Ok(parts[1].to_string())
}

/// Handle WebSocket connection
async fn handle_socket(
    socket: WebSocket,
    pool: sqlx::SqlitePool,
    session_id: String,
) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Channel for sending messages to WebSocket
    let (tx, mut rx) = mpsc::channel::<Message>(100);

    // Get PTY reader
    let reader_result = pty_manager().get_reader(&session_id).await;
    let pty_reader = match reader_result {
        Ok(reader) => reader,
        Err(e) => {
            error!("Failed to get PTY reader: {}", e);
            let err_msg = WsStatusMessage::Error {
                message: e.to_string(),
            };
            let err_json = format!("\x00{}", serde_json::to_string(&err_msg).unwrap());
            let _ = ws_sender.send(Message::Text(err_json.into())).await;
            return;
        }
    };

    // Send ready message
    let ready_msg = WsStatusMessage::Ready { scrollback_lines: 0 };
    let ready_json = format!("\x00{}", serde_json::to_string(&ready_msg).unwrap());
    if ws_sender.send(Message::Text(ready_json.into())).await.is_err() {
        return;
    }

    // Subscribe to session termination events
    let mut terminate_rx = match pty_manager().subscribe_termination(&session_id) {
        Some(rx) => rx,
        None => {
            error!("Failed to subscribe to termination events for session {}", session_id);
            return;
        }
    };

    let tx_clone = tx.clone();
    let session_id_clone = session_id.clone();

    // Task: Read from PTY and send to WebSocket
    let read_task = tokio::task::spawn_blocking(move || {
        let mut reader = pty_reader;
        let mut buffer = vec![0u8; READ_BUFFER_SIZE];
        let tx = tx_clone;
        let session_id = session_id_clone;
        
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    // EOF - PTY closed
                    debug!("PTY EOF for session {}", session_id);
                    break;
                }
                Ok(n) => {
                    let data = buffer[..n].to_vec();
                    
                    // Append to scrollback buffer (fire and forget)
                    let session_id_scroll = session_id.clone();
                    let data_scroll = data.clone();
                    tokio::spawn(async move {
                        let _ = pty_manager().append_scrollback(&session_id_scroll, &data_scroll).await;
                    });
                    
                    // Send to WebSocket
                    if tx.blocking_send(Message::Binary(data.into())).is_err() {
                        break;
                    }
                }
                Err(e) => {
                    error!("Error reading from PTY: {}", e);
                    break;
                }
            }
        }
    });

    let pool_clone = pool.clone();
    let session_id_clone2 = session_id.clone();
    let tx_heartbeat = tx.clone();

    // Task: Heartbeat
    let heartbeat_task = tokio::spawn(async move {
        let mut interval = interval(HEARTBEAT_INTERVAL);
        loop {
            interval.tick().await;
            let pong_msg = WsStatusMessage::Pong;
            let pong_json = format!("\x00{}", serde_json::to_string(&pong_msg).unwrap());
            if tx_heartbeat.send(Message::Text(pong_json.into())).await.is_err() {
                break;
            }
            // Update activity
            let _ = TerminalService::update_activity(&pool_clone, &session_id_clone2).await;
        }
    });

    // Task: Send messages from channel to WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    let session_id_input = session_id.clone();
    let tx_terminate = tx.clone();

    // Main loop: Receive from WebSocket and send to PTY
    loop {
        tokio::select! {
            // Handle session termination from server
            reason = terminate_rx.recv() => {
                match reason {
                    Ok(reason) => {
                        info!("Session {} terminated: {}", session_id_input, reason);
                        let disconnect_msg = WsStatusMessage::Disconnected { reason };
                        let disconnect_json = format!("\x00{}", serde_json::to_string(&disconnect_msg).unwrap());
                        let _ = tx_terminate.send(Message::Text(disconnect_json.into())).await;
                        // Give client time to receive the message before closing
                        tokio::time::sleep(Duration::from_millis(100)).await;
                        break;
                    }
                    Err(_) => {
                        // Channel closed, session was removed
                        break;
                    }
                }
            }
            msg = ws_receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        let text_str: &str = &text;
                        if let Some(control_json) = text_str.strip_prefix(CONTROL_PREFIX) {
                            // Control message
                            if let Err(e) = handle_control_message(control_json, &pool, &session_id_input).await {
                                warn!("Control message error: {}", e);
                            }
                        } else {
                            // Input to PTY
                            if let Err(e) = pty_manager().write(&session_id_input, text_str.as_bytes()).await {
                                error!("Error writing to PTY: {}", e);
                                break;
                            }
                        }
                        // Update activity
                        let _ = TerminalService::update_activity(&pool, &session_id_input).await;
                    }
                    Some(Ok(Message::Binary(data))) => {
                        // Binary input to PTY
                        if let Err(e) = pty_manager().write(&session_id_input, &data).await {
                            error!("Error writing binary to PTY: {}", e);
                            break;
                        }
                        let _ = TerminalService::update_activity(&pool, &session_id_input).await;
                    }
                    Some(Ok(Message::Close(_))) => {
                        info!("WebSocket closed by client");
                        break;
                    }
                    Some(Err(e)) => {
                        error!("WebSocket error: {}", e);
                        break;
                    }
                    None => {
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    // Cleanup
    read_task.abort();
    heartbeat_task.abort();
    send_task.abort();

    info!("WebSocket connection closed for session {}", session_id);
}

/// Handle control messages from client
async fn handle_control_message(
    json: &str,
    pool: &sqlx::SqlitePool,
    session_id: &str,
) -> Result<(), AppError> {
    let msg: WsControlMessage = serde_json::from_str(json)
        .map_err(|e| AppError::ValidationError(format!("Invalid control message: {}", e)))?;

    match msg {
        WsControlMessage::Resize { cols, rows } => {
            debug!("Resize session {} to {}x{}", session_id, cols, rows);
            TerminalService::resize_session(pool, session_id, cols, rows).await?;
        }
        WsControlMessage::Ping => {
            debug!("Ping received for session {}", session_id);
        }
    }

    Ok(())
}
