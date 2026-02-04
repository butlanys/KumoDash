//! systemd service management

use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::process::Command;
use tracing::warn;

use crate::models::{SystemdLogEntry, SystemdUnit};
use crate::utils::error::AppError;

const MAX_UNIT_NAME_LENGTH: usize = 128;
const MAX_LOG_LIMIT: usize = 500;
const SYSTEMD_ETC_PATH: &str = "/etc/systemd/system";
const SYSTEMD_LIB_PATH: &str = "/lib/systemd/system";
const SYSTEMD_USR_LIB_PATH: &str = "/usr/lib/systemd/system";

pub struct SystemdService;

impl SystemdService {
    pub async fn list_units() -> Result<Vec<SystemdUnit>, AppError> {
        ensure_linux()?;

        let output = Command::new("systemctl")
            .args(["list-units", "--type=service", "--all", "--no-legend", "--no-pager"])
            .output()
            .await
            .map_err(|e| AppError::SystemdUnavailable(e.to_string()))?;

        if !output.status.success() {
            return Err(AppError::SystemdCommandFailed(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut units = Vec::new();

        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 5 {
                continue;
            }

            let name = parts[0].to_string();
            let load_state = parts[1].to_string();
            let active_state = parts[2].to_string();
            let sub_state = parts[3].to_string();
            let description = parts[4..].join(" ");

            units.push(SystemdUnit {
                name,
                load_state,
                active_state,
                sub_state,
                description,
            });
        }

        Ok(units)
    }

    pub async fn control_unit(unit: &str, action: &str) -> Result<(), AppError> {
        ensure_linux()?;
        validate_unit_name(unit)?;
        validate_action(action)?;

        let output = Command::new("systemctl")
            .arg(action)
            .arg(unit)
            .output()
            .await
            .map_err(|e| AppError::SystemdCommandFailed(e.to_string()))?;

        if !output.status.success() {
            return Err(AppError::SystemdCommandFailed(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        Ok(())
    }

    pub async fn fetch_logs(
        unit: &str,
        since: Option<String>,
        limit: usize,
    ) -> Result<Vec<SystemdLogEntry>, AppError> {
        ensure_linux()?;
        validate_unit_name(unit)?;

        let limit = limit.clamp(1, MAX_LOG_LIMIT);

        let mut cmd = Command::new("journalctl");
        cmd.args(["-u", unit, "--no-pager", "-o", "short-iso", "-n"])
            .arg(limit.to_string());

        if let Some(since_value) = since {
            cmd.args(["--since", &since_value]);
        }

        let output = cmd
            .output()
            .await
            .map_err(|e| AppError::SystemdCommandFailed(e.to_string()))?;

        if !output.status.success() {
            return Err(AppError::SystemdCommandFailed(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let entries = stdout
            .lines()
            .map(parse_log_line)
            .collect::<Vec<SystemdLogEntry>>();

        Ok(entries)
    }

    pub async fn get_unit_file(unit: &str) -> Result<(String, String), AppError> {
        ensure_linux()?;
        validate_unit_name(unit)?;

        let path = resolve_unit_path(unit).await?;
        let content = fs::read_to_string(&path)
            .await
            .map_err(|e| AppError::SystemdFileError(e.to_string()))?;

        Ok((path.to_string_lossy().to_string(), content))
    }

    pub async fn update_unit_file(unit: &str, content: &str) -> Result<String, AppError> {
        ensure_linux()?;
        validate_unit_name(unit)?;

        let path = resolve_write_path(unit).await?;
        fs::write(&path, content)
            .await
            .map_err(|e| AppError::SystemdFileError(e.to_string()))?;

        daemon_reload().await?;
        Ok(path.to_string_lossy().to_string())
    }

    pub async fn create_unit(
        unit: &str,
        content: &str,
        enable: bool,
        start: bool,
    ) -> Result<(), AppError> {
        ensure_linux()?;
        validate_unit_name(unit)?;

        let target_path = Path::new(SYSTEMD_ETC_PATH).join(unit);
        if fs::metadata(&target_path).await.is_ok() {
            return Err(AppError::ValidationError(
                rust_i18n::t!("errors.systemd.unit_exists").to_string(),
            ));
        }

        fs::write(&target_path, content)
            .await
            .map_err(|e| AppError::SystemdFileError(e.to_string()))?;

        daemon_reload().await?;

        if enable {
            run_systemctl(&["enable", unit]).await?;
        }

        if start {
            run_systemctl(&["start", unit]).await?;
        }

        Ok(())
    }
}

fn parse_log_line(line: &str) -> SystemdLogEntry {
    if line.len() < 19 {
        return SystemdLogEntry {
            timestamp: "".to_string(),
            message: line.to_string(),
        };
    }

    let timestamp = line.get(0..19).unwrap_or("").to_string();
    let message = line.get(20..).unwrap_or("").to_string();

    SystemdLogEntry { timestamp, message }
}

fn validate_unit_name(name: &str) -> Result<(), AppError> {
    if name.is_empty() || name.len() > MAX_UNIT_NAME_LENGTH {
        return Err(AppError::SystemdInvalidUnit);
    }

    if !name.ends_with(".service") {
        return Err(AppError::SystemdInvalidUnit);
    }

    if !name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | '@'))
    {
        return Err(AppError::SystemdInvalidUnit);
    }

    Ok(())
}

fn validate_action(action: &str) -> Result<(), AppError> {
    match action {
        "start" | "stop" | "restart" => Ok(()),
        _ => Err(AppError::SystemdInvalidAction),
    }
}

fn ensure_linux() -> Result<(), AppError> {
    if !cfg!(target_os = "linux") {
        warn!("systemd endpoints called on unsupported OS");
        return Err(AppError::SystemdUnavailable("Unsupported OS".to_string()));
    }
    Ok(())
}

async fn resolve_unit_path(unit: &str) -> Result<PathBuf, AppError> {
    let output = Command::new("systemctl")
        .args(["show", "-p", "FragmentPath", "--value", unit])
        .output()
        .await
        .map_err(|e| AppError::SystemdCommandFailed(e.to_string()))?;

    if !output.status.success() {
        return Err(AppError::SystemdCommandFailed(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() || path == "n/a" || path == "-" {
        return Err(AppError::NotFound("systemd unit".to_string()));
    }

    Ok(PathBuf::from(path))
}

async fn resolve_write_path(unit: &str) -> Result<PathBuf, AppError> {
    let existing_path = resolve_unit_path(unit).await?;

    if is_safe_systemd_path(&existing_path) && existing_path.starts_with(SYSTEMD_ETC_PATH) {
        return Ok(existing_path);
    }

    Ok(Path::new(SYSTEMD_ETC_PATH).join(unit))
}

fn is_safe_systemd_path(path: &Path) -> bool {
    path.starts_with(SYSTEMD_ETC_PATH)
        || path.starts_with(SYSTEMD_LIB_PATH)
        || path.starts_with(SYSTEMD_USR_LIB_PATH)
}

async fn daemon_reload() -> Result<(), AppError> {
    run_systemctl(&["daemon-reload"]).await
}

async fn run_systemctl(args: &[&str]) -> Result<(), AppError> {
    let output = Command::new("systemctl")
        .args(args)
        .output()
        .await
        .map_err(|e| AppError::SystemdCommandFailed(e.to_string()))?;

    if !output.status.success() {
        return Err(AppError::SystemdCommandFailed(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    Ok(())
}
