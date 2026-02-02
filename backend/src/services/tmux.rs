//! Tmux session management service

use std::process::Stdio;
use tokio::process::Command;
use tracing::{debug, error, info};

use crate::utils::error::AppError;

/// Tmux manager for terminal sessions
pub struct TmuxManager;

impl TmuxManager {
    /// Check if tmux is available on the system
    pub async fn check_available() -> Result<(), AppError> {
        let output = Command::new("tmux")
            .arg("-V")
            .output()
            .await
            .map_err(|e| AppError::InternalError(format!("tmux not found: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::InternalError("tmux is not available".to_string()));
        }

        let version = String::from_utf8_lossy(&output.stdout);
        info!("tmux version: {}", version.trim());
        Ok(())
    }

    /// Create a new tmux session
    pub async fn create_session(
        tmux_name: &str,
        shell: &str,
        cwd: Option<&str>,
        cols: u16,
        rows: u16,
    ) -> Result<(), AppError> {
        let mut cmd = Command::new("tmux");
        cmd.args([
            "new-session",
            "-d",           // detached
            "-s", tmux_name,
            "-x", &cols.to_string(),
            "-y", &rows.to_string(),
        ]);

        if let Some(dir) = cwd {
            cmd.args(["-c", dir]);
        }

        // Set shell
        cmd.env("SHELL", shell);

        let output = cmd
            .output()
            .await
            .map_err(|e| AppError::InternalError(format!("Failed to create tmux session: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("tmux create session failed: {}", stderr);
            return Err(AppError::InternalError(format!(
                "Failed to create tmux session: {}",
                stderr
            )));
        }

        debug!("Created tmux session: {}", tmux_name);
        Ok(())
    }

    /// Check if a tmux session exists
    pub async fn session_exists(tmux_name: &str) -> Result<bool, AppError> {
        let output = Command::new("tmux")
            .args(["has-session", "-t", tmux_name])
            .output()
            .await
            .map_err(|e| AppError::InternalError(format!("Failed to check tmux session: {}", e)))?;

        Ok(output.status.success())
    }

    /// Resize a tmux session window
    pub async fn resize_window(tmux_name: &str, cols: u16, rows: u16) -> Result<(), AppError> {
        let output = Command::new("tmux")
            .args([
                "resize-window",
                "-t", tmux_name,
                "-x", &cols.to_string(),
                "-y", &rows.to_string(),
            ])
            .output()
            .await
            .map_err(|e| AppError::InternalError(format!("Failed to resize tmux window: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            debug!("tmux resize warning: {}", stderr);
        }

        Ok(())
    }

    /// Capture pane content (scrollback buffer)
    pub async fn capture_pane(tmux_name: &str, lines: i32) -> Result<String, AppError> {
        let output = Command::new("tmux")
            .args([
                "capture-pane",
                "-p",           // print to stdout
                "-t", tmux_name,
                "-S", &format!("-{}", lines),  // start from -N lines
            ])
            .output()
            .await
            .map_err(|e| AppError::InternalError(format!("Failed to capture tmux pane: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::InternalError(format!(
                "Failed to capture pane: {}",
                stderr
            )));
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    /// Send keys to a tmux session
    pub async fn send_keys(tmux_name: &str, keys: &str) -> Result<(), AppError> {
        let output = Command::new("tmux")
            .args(["send-keys", "-t", tmux_name, "-l", keys])
            .output()
            .await
            .map_err(|e| AppError::InternalError(format!("Failed to send keys to tmux: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::InternalError(format!(
                "Failed to send keys: {}",
                stderr
            )));
        }

        Ok(())
    }

    /// Send raw bytes to tmux (for special characters)
    pub async fn send_raw(tmux_name: &str, data: &[u8]) -> Result<(), AppError> {
        // For raw input, we use a different approach - pipe to tmux
        let mut child = Command::new("tmux")
            .args(["load-buffer", "-", ";", "paste-buffer", "-t", tmux_name, "-d"])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| AppError::InternalError(format!("Failed to spawn tmux: {}", e)))?;

        if let Some(mut stdin) = child.stdin.take() {
            use tokio::io::AsyncWriteExt;
            stdin.write_all(data).await.map_err(|e| {
                AppError::InternalError(format!("Failed to write to tmux: {}", e))
            })?;
        }

        let output = child.wait_with_output().await.map_err(|e| {
            AppError::InternalError(format!("Failed to wait for tmux: {}", e))
        })?;

        if !output.status.success() {
            // Fallback to send-keys for simple input
            let text = String::from_utf8_lossy(data);
            return Self::send_keys(tmux_name, &text).await;
        }

        Ok(())
    }

    /// Kill a tmux session
    pub async fn kill_session(tmux_name: &str) -> Result<(), AppError> {
        let output = Command::new("tmux")
            .args(["kill-session", "-t", tmux_name])
            .output()
            .await
            .map_err(|e| AppError::InternalError(format!("Failed to kill tmux session: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            debug!("tmux kill session warning: {}", stderr);
        }

        info!("Killed tmux session: {}", tmux_name);
        Ok(())
    }

    /// List all kumodash tmux sessions
    pub async fn list_sessions() -> Result<Vec<String>, AppError> {
        let output = Command::new("tmux")
            .args(["list-sessions", "-F", "#{session_name}"])
            .output()
            .await
            .map_err(|e| AppError::InternalError(format!("Failed to list tmux sessions: {}", e)))?;

        if !output.status.success() {
            // No sessions exist
            return Ok(vec![]);
        }

        let sessions: Vec<String> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter(|s| s.starts_with("kumo_"))
            .map(|s| s.to_string())
            .collect();

        Ok(sessions)
    }

    /// Attach to a tmux session and get a reader/writer for the PTY
    /// Returns a child process that can be used to read/write
    pub async fn attach_pipe(
        tmux_name: &str,
    ) -> Result<tokio::process::Child, AppError> {
        let child = Command::new("tmux")
            .args([
                "attach-session",
                "-t", tmux_name,
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| AppError::InternalError(format!("Failed to attach to tmux: {}", e)))?;

        Ok(child)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_check_available() {
        // This test will pass if tmux is installed
        let result = TmuxManager::check_available().await;
        // Don't fail if tmux is not installed in CI
        if result.is_err() {
            println!("tmux not available, skipping test");
        }
    }
}
