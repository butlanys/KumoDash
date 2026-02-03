//! File management data models

use serde::{Deserialize, Serialize};

/// File entry type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    File,
    Directory,
    Symlink,
}

/// File entry information
#[derive(Debug, Clone, Serialize)]
pub struct FileEntry {
    pub name: String,
    #[serde(rename = "type")]
    pub file_type: FileType,
    pub size: u64,
    pub modified: i64,
    pub permissions: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub symlink_target: Option<String>,
}

/// Directory listing response
#[derive(Debug, Serialize)]
pub struct DirectoryListing {
    pub path: String,
    pub entries: Vec<FileEntry>,
    pub parent: Option<String>,
}

/// File content response
#[derive(Debug, Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub size: u64,
    pub encoding: String,
    pub mime_type: String,
}

/// Request to list directory
#[derive(Debug, Deserialize)]
pub struct ListDirRequest {
    pub path: String,
    #[serde(default)]
    pub show_hidden: bool,
}

/// Request to read file content
#[derive(Debug, Deserialize)]
pub struct ReadFileRequest {
    pub path: String,
    #[serde(default)]
    pub max_size: Option<u64>,
}

/// Request to write file content
#[derive(Debug, Deserialize)]
pub struct WriteFileRequest {
    pub path: String,
    pub content: String,
    #[serde(default)]
    pub create_dirs: bool,
}

/// Request to create directory
#[derive(Debug, Deserialize)]
pub struct CreateDirRequest {
    pub path: String,
    #[serde(default = "default_true")]
    pub recursive: bool,
}

fn default_true() -> bool {
    true
}

/// Request to rename/move file
#[derive(Debug, Deserialize)]
pub struct RenameRequest {
    pub from: String,
    pub to: String,
}

/// Request to copy file/directory
#[derive(Debug, Deserialize)]
pub struct CopyRequest {
    pub from: String,
    pub to: String,
    #[serde(default)]
    pub overwrite: bool,
}

/// Request to delete file/directory
#[derive(Debug, Deserialize)]
pub struct DeleteRequest {
    pub path: String,
    #[serde(default)]
    pub recursive: bool,
}

/// Request to download file
#[derive(Debug, Deserialize)]
pub struct DownloadRequest {
    pub path: String,
}

/// File operation result
#[derive(Debug, Serialize)]
pub struct FileOperationResult {
    pub path: String,
}

/// File info (for stat)
#[derive(Debug, Serialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    #[serde(rename = "type")]
    pub file_type: FileType,
    pub size: u64,
    pub modified: i64,
    pub created: i64,
    pub accessed: i64,
    pub permissions: String,
    pub owner: String,
    pub group: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub symlink_target: Option<String>,
}

/// Search request
#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    pub path: String,
    pub pattern: String,
    #[serde(default = "default_max_depth")]
    pub max_depth: usize,
    #[serde(default = "default_max_results")]
    pub max_results: usize,
}

fn default_max_depth() -> usize {
    10
}

fn default_max_results() -> usize {
    100
}

/// Search result
#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub matches: Vec<FileEntry>,
    pub total: usize,
    pub truncated: bool,
}
