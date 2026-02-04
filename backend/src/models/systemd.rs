//! systemd models

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct SystemdUnit {
    pub name: String,
    pub load_state: String,
    pub active_state: String,
    pub sub_state: String,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct SystemdUnitsResponse {
    pub units: Vec<SystemdUnit>,
}

#[derive(Debug, Serialize)]
pub struct SystemdLogEntry {
    pub timestamp: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct SystemdLogsResponse {
    pub unit: String,
    pub entries: Vec<SystemdLogEntry>,
}

#[derive(Debug, Serialize)]
pub struct SystemdUnitFile {
    pub name: String,
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct SystemdUnitFileResponse {
    pub unit: SystemdUnitFile,
}

#[derive(Debug, Deserialize)]
pub struct SystemdUnitFileUpdateRequest {
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct SystemdUnitCreateRequest {
    pub name: String,
    pub content: String,
    pub enable: Option<bool>,
    pub start: Option<bool>,
}
