//! Database module
//!
//! Handles database initialization and schema creation.
//! Schema is embedded in code (like 1Panel), no external migration files.

use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::time::Duration;

/// Database schema - embedded in code
const SCHEMA: &str = r#"
-- Admin table (single admin user)
CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES admin(id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES admin(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- System settings table with simplified TLS support
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tls_cert TEXT DEFAULT NULL,
    tls_key TEXT DEFAULT NULL,
    tls_cert_info TEXT DEFAULT NULL,
    https_port INTEGER DEFAULT 8443,
    debug_mode BOOLEAN DEFAULT false
);

-- Terminal sessions table
CREATE TABLE IF NOT EXISTS terminal_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    tmux_session TEXT NOT NULL UNIQUE,
    shell TEXT DEFAULT '/bin/bash',
    cwd TEXT,
    cols INTEGER DEFAULT 80,
    rows INTEGER DEFAULT 24,
    status TEXT DEFAULT 'running',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    end_reason TEXT,
    FOREIGN KEY (user_id) REFERENCES admin(id)
);

CREATE INDEX IF NOT EXISTS idx_terminal_sessions_user_id ON terminal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_status ON terminal_sessions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_terminal_sessions_name ON terminal_sessions(name);

-- Terminal audit events table
CREATE TABLE IF NOT EXISTS terminal_audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    client_ip TEXT,
    user_agent TEXT,
    meta TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES terminal_sessions(id),
    FOREIGN KEY (user_id) REFERENCES admin(id)
);

CREATE INDEX IF NOT EXISTS idx_terminal_audit_session_id ON terminal_audit_events(session_id);
CREATE INDEX IF NOT EXISTS idx_terminal_audit_created_at ON terminal_audit_events(created_at);
"#;

/// Initialize the SQLite database connection pool
pub async fn init_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    SqlitePoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(database_url)
        .await
}

/// Initialize database schema
pub async fn init_schema(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Split schema into individual statements and execute
    for statement in SCHEMA.split(';') {
        let stmt = statement.trim();
        if !stmt.is_empty() {
            sqlx::query(stmt).execute(pool).await?;
        }
    }
    Ok(())
}
