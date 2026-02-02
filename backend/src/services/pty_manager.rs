//! PTY session manager using portable-pty
//!
//! Manages PTY sessions with in-memory scrollback buffer for session persistence.

use dashmap::DashMap;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::VecDeque;
use std::io::{Read, Write};
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, Mutex, RwLock};
use tracing::info;

use crate::utils::error::AppError;

/// Maximum scrollback buffer size (bytes)
const MAX_SCROLLBACK_BYTES: usize = 512 * 1024; // 512KB

/// PTY session runtime state
pub struct PtySession {
    /// Master PTY handle
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    /// Writer for sending data to PTY
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    /// Scrollback buffer
    scrollback: Arc<RwLock<ScrollbackBuffer>>,
    /// Channel to signal shutdown
    shutdown_tx: mpsc::Sender<()>,
    /// Broadcast channel for session termination
    terminate_tx: broadcast::Sender<String>,
    /// Session configuration
    pub cols: u16,
    pub rows: u16,
}

/// Scrollback buffer for session persistence
/// Stores raw bytes to preserve ANSI sequences for proper xterm.js rendering
pub struct ScrollbackBuffer {
    data: VecDeque<u8>,
}

impl ScrollbackBuffer {
    fn new() -> Self {
        Self {
            data: VecDeque::with_capacity(MAX_SCROLLBACK_BYTES),
        }
    }

    /// Append data to the buffer
    fn append(&mut self, bytes: &[u8]) {
        // If new data would exceed max, remove old data first
        let needed = bytes.len();
        let available = MAX_SCROLLBACK_BYTES.saturating_sub(self.data.len());
        
        if needed > available {
            let to_remove = needed - available;
            self.data.drain(..to_remove.min(self.data.len()));
        }
        
        // If single chunk is larger than max, only keep the tail
        if needed > MAX_SCROLLBACK_BYTES {
            let start = needed - MAX_SCROLLBACK_BYTES;
            self.data.extend(&bytes[start..]);
        } else {
            self.data.extend(bytes);
        }
    }

    /// Get the buffer content as bytes
    fn get_content(&self) -> Vec<u8> {
        self.data.iter().copied().collect()
    }

    fn byte_count(&self) -> usize {
        self.data.len()
    }
}

/// Global PTY session manager
pub struct PtyManager {
    sessions: DashMap<String, Arc<PtySession>>,
}

impl PtyManager {
    /// Create a new PTY manager
    pub fn new() -> Self {
        Self {
            sessions: DashMap::new(),
        }
    }

    /// Create a new PTY session
    pub fn create_session(
        &self,
        session_id: &str,
        shell: &str,
        cwd: Option<&str>,
        cols: u16,
        rows: u16,
    ) -> Result<(), AppError> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::TerminalTmuxError(format!("Failed to open PTY: {}", e)))?;

        let mut cmd = CommandBuilder::new(shell);
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let _child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| AppError::TerminalTmuxError(format!("Failed to spawn shell: {}", e)))?;

        // Drop slave - we only need the master
        drop(pair.slave);

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| AppError::TerminalTmuxError(format!("Failed to get writer: {}", e)))?;

        let (shutdown_tx, _shutdown_rx) = mpsc::channel::<()>(1);
        let (terminate_tx, _) = broadcast::channel::<String>(16);

        let session = Arc::new(PtySession {
            master: Arc::new(Mutex::new(pair.master)),
            writer: Arc::new(Mutex::new(writer)),
            scrollback: Arc::new(RwLock::new(ScrollbackBuffer::new())),
            shutdown_tx,
            terminate_tx,
            cols,
            rows,
        });

        self.sessions.insert(session_id.to_string(), session);
        info!("Created PTY session: {}", session_id);

        Ok(())
    }

    /// Get a session by ID
    pub fn get_session(&self, session_id: &str) -> Option<Arc<PtySession>> {
        self.sessions.get(session_id).map(|s| Arc::clone(&s))
    }

    /// Check if session exists
    pub fn session_exists(&self, session_id: &str) -> bool {
        self.sessions.contains_key(session_id)
    }

    /// Remove a session and notify connected clients
    pub fn remove_session(&self, session_id: &str) {
        if let Some((_, session)) = self.sessions.remove(session_id) {
            // Broadcast termination to all connected WebSocket clients
            let _ = session.terminate_tx.send("terminated".to_string());
            let _ = session.shutdown_tx.try_send(());
            info!("Removed PTY session: {}", session_id);
        }
    }

    /// Subscribe to session termination events
    pub fn subscribe_termination(&self, session_id: &str) -> Option<broadcast::Receiver<String>> {
        self.get_session(session_id).map(|s| s.terminate_tx.subscribe())
    }

    /// Get scrollback content as raw bytes (preserves ANSI sequences)
    pub async fn get_scrollback(&self, session_id: &str) -> Result<(Vec<u8>, usize), AppError> {
        let session = self
            .get_session(session_id)
            .ok_or(AppError::TerminalSessionNotFound)?;
        
        let buffer = session.scrollback.read().await;
        Ok((buffer.get_content(), buffer.byte_count()))
    }

    /// Resize a session
    pub async fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), AppError> {
        let session = self
            .get_session(session_id)
            .ok_or(AppError::TerminalSessionNotFound)?;
        
        let master = session.master.lock().await;
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::TerminalTmuxError(format!("Failed to resize: {}", e)))?;

        Ok(())
    }

    /// Write data to a session
    pub async fn write(&self, session_id: &str, data: &[u8]) -> Result<(), AppError> {
        let session = self
            .get_session(session_id)
            .ok_or(AppError::TerminalSessionNotFound)?;
        
        let mut writer = session.writer.lock().await;
        writer
            .write_all(data)
            .map_err(|e| AppError::TerminalTmuxError(format!("Failed to write: {}", e)))?;
        writer
            .flush()
            .map_err(|e| AppError::TerminalTmuxError(format!("Failed to flush: {}", e)))?;

        Ok(())
    }

    /// Get a reader for a session (cloned, for async reading in a task)
    pub async fn get_reader(
        &self,
        session_id: &str,
    ) -> Result<Box<dyn Read + Send>, AppError> {
        let session = self
            .get_session(session_id)
            .ok_or(AppError::TerminalSessionNotFound)?;
        
        let master = session.master.lock().await;
        master
            .try_clone_reader()
            .map_err(|e| AppError::TerminalTmuxError(format!("Failed to clone reader: {}", e)))
    }

    /// Append output to scrollback buffer
    pub async fn append_scrollback(&self, session_id: &str, data: &[u8]) -> Result<(), AppError> {
        let session = self
            .get_session(session_id)
            .ok_or(AppError::TerminalSessionNotFound)?;
        
        let mut buffer = session.scrollback.write().await;
        buffer.append(data);

        Ok(())
    }

    /// Get session count
    pub fn session_count(&self) -> usize {
        self.sessions.len()
    }

    /// List all session IDs
    pub fn list_sessions(&self) -> Vec<String> {
        self.sessions.iter().map(|r| r.key().clone()).collect()
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Global singleton instance
static PTY_MANAGER: std::sync::OnceLock<PtyManager> = std::sync::OnceLock::new();

/// Get the global PTY manager instance
pub fn pty_manager() -> &'static PtyManager {
    PTY_MANAGER.get_or_init(PtyManager::new)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scrollback_buffer() {
        let mut buffer = ScrollbackBuffer::new();
        buffer.append(b"hello\nworld\n");
        assert_eq!(buffer.byte_count(), 12);
        assert_eq!(buffer.get_content(), b"hello\nworld\n");
    }
    
    #[test]
    fn test_scrollback_buffer_ansi() {
        let mut buffer = ScrollbackBuffer::new();
        // ANSI escape sequence for red text
        buffer.append(b"\x1b[31mred\x1b[0m");
        let content = buffer.get_content();
        // Verify ANSI sequences are preserved
        assert_eq!(content, b"\x1b[31mred\x1b[0m");
    }
}
