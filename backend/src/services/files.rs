//! File management service

use base64::Engine;
use rust_i18n::t;
use std::ffi::CStr;
use std::mem::MaybeUninit;
use std::os::unix::fs::{MetadataExt, PermissionsExt};
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncReadExt;
use tracing::{debug, warn};

use crate::models::files::{
    DirectoryListing, FileContent, FileEntry, FileInfo, FileOperationResult, FileType,
    SearchResult,
};
use crate::utils::error::AppError;

/// Maximum file size for reading content (10MB)
const MAX_READ_SIZE: u64 = 10 * 1024 * 1024;

/// File management service
pub struct FileService;

impl FileService {
    /// Validate and normalize path to prevent directory traversal
    pub fn validate_path(path: &str) -> Result<PathBuf, AppError> {
        let path = PathBuf::from(path);

        // Must be absolute path
        if !path.is_absolute() {
            return Err(AppError::ValidationError(
                t!("errors.files.path_must_be_absolute").to_string(),
            ));
        }

        // Canonicalize to resolve .. and symlinks
        let canonical = path
            .canonicalize()
            .map_err(|_| AppError::NotFound(t!("errors.files.path_not_found").to_string()))?;

        Ok(canonical)
    }

    /// Validate path for creation (path may not exist yet)
    pub fn validate_path_for_create(path: &str) -> Result<PathBuf, AppError> {
        let path = PathBuf::from(path);

        // Must be absolute path
        if !path.is_absolute() {
            return Err(AppError::ValidationError(
                t!("errors.files.path_must_be_absolute").to_string(),
            ));
        }

        // Check for path traversal attempts
        let path_str = path.to_string_lossy();
        if path_str.contains("/../") || path_str.ends_with("/..") || path_str.contains("/./") {
            return Err(AppError::ValidationError(
                t!("errors.files.invalid_path").to_string(),
            ));
        }

        Ok(path)
    }

    /// List directory contents
    pub async fn list_dir(path: &str, show_hidden: bool) -> Result<DirectoryListing, AppError> {
        let path = Self::validate_path(path)?;

        if !path.is_dir() {
            return Err(AppError::ValidationError(
                t!("errors.files.not_a_directory").to_string(),
            ));
        }

        let mut entries = Vec::new();
        let mut read_dir = fs::read_dir(&path).await.map_err(|e| {
            warn!("Failed to read directory {:?}: {}", path, e);
            AppError::FileReadError(e.to_string())
        })?;

        while let Some(entry) = read_dir.next_entry().await.map_err(|e| {
            warn!("Failed to read directory entry: {}", e);
            AppError::FileReadError(e.to_string())
        })? {
            let name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden files if not requested
            if !show_hidden && name.starts_with('.') {
                continue;
            }

            if let Ok(file_entry) = Self::get_file_entry(&entry).await {
                entries.push(file_entry);
            }
        }

        // Sort: directories first, then by name
        entries.sort_by(|a, b| {
            match (&a.file_type, &b.file_type) {
                (FileType::Directory, FileType::Directory) => a.name.cmp(&b.name),
                (FileType::Directory, _) => std::cmp::Ordering::Less,
                (_, FileType::Directory) => std::cmp::Ordering::Greater,
                _ => a.name.cmp(&b.name),
            }
        });

        let parent = path.parent().map(|p| p.to_string_lossy().to_string());

        Ok(DirectoryListing {
            path: path.to_string_lossy().to_string(),
            entries,
            parent,
        })
    }

    /// Get file entry from DirEntry
    async fn get_file_entry(entry: &fs::DirEntry) -> Result<FileEntry, AppError> {
        let name = entry.file_name().to_string_lossy().to_string();
        let metadata = entry.metadata().await.map_err(|e| {
            AppError::FileReadError(format!("Failed to get metadata for {}: {}", name, e))
        })?;

        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else if metadata.file_type().is_symlink() {
            FileType::Symlink
        } else {
            FileType::File
        };

        let symlink_target = if file_type == FileType::Symlink {
            fs::read_link(entry.path())
                .await
                .ok()
                .map(|p| p.to_string_lossy().to_string())
        } else {
            None
        };

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let permissions = format!("{:o}", metadata.permissions().mode() & 0o777);

        Ok(FileEntry {
            name,
            file_type,
            size: metadata.len(),
            modified,
            permissions,
            symlink_target,
        })
    }

    /// Read file content
    pub async fn read_file(path: &str, max_size: Option<u64>) -> Result<FileContent, AppError> {
        let path = Self::validate_path(path)?;

        let metadata = fs::metadata(&path).await.map_err(|e| {
            warn!("Failed to get file metadata {:?}: {}", path, e);
            AppError::NotFound(t!("errors.files.file_not_found").to_string())
        })?;

        if metadata.is_dir() {
            return Err(AppError::ValidationError(
                t!("errors.files.is_directory").to_string(),
            ));
        }

        let max_size = max_size.unwrap_or(MAX_READ_SIZE);
        if metadata.len() > max_size {
            return Err(AppError::FileTooLarge(metadata.len(), max_size));
        }

        let mut file = fs::File::open(&path).await.map_err(|e| {
            warn!("Failed to open file {:?}: {}", path, e);
            AppError::FileReadError(e.to_string())
        })?;

        let mut content = Vec::with_capacity(metadata.len() as usize);
        file.read_to_end(&mut content).await.map_err(|e| {
            warn!("Failed to read file {:?}: {}", path, e);
            AppError::FileReadError(e.to_string())
        })?;

        // Detect mime type
        let mime_type = mime_guess::from_path(&path)
            .first_or_octet_stream()
            .to_string();

        // Try to decode as UTF-8, fallback to base64
        let (content_str, encoding) = match String::from_utf8(content.clone()) {
            Ok(s) => (s, "utf-8".to_string()),
            Err(_) => (
                base64::engine::general_purpose::STANDARD.encode(&content),
                "base64".to_string(),
            ),
        };

        Ok(FileContent {
            path: path.to_string_lossy().to_string(),
            content: content_str,
            size: metadata.len(),
            encoding,
            mime_type,
        })
    }

    /// Write file content
    pub async fn write_file(
        path: &str,
        content: &str,
        create_dirs: bool,
    ) -> Result<FileOperationResult, AppError> {
        let path = Self::validate_path_for_create(path)?;

        // Create parent directories if requested
        if create_dirs {
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).await.map_err(|e| {
                    warn!("Failed to create directories {:?}: {}", parent, e);
                    AppError::FileWriteError(e.to_string())
                })?;
            }
        }

        fs::write(&path, content.as_bytes()).await.map_err(|e| {
            warn!("Failed to write file {:?}: {}", path, e);
            AppError::FileWriteError(e.to_string())
        })?;

        debug!("Written file: {:?}", path);

        Ok(FileOperationResult {
            path: path.to_string_lossy().to_string(),
        })
    }

    /// Create directory
    pub async fn create_dir(path: &str, recursive: bool) -> Result<FileOperationResult, AppError> {
        let path = Self::validate_path_for_create(path)?;

        if recursive {
            fs::create_dir_all(&path).await
        } else {
            fs::create_dir(&path).await
        }
        .map_err(|e| {
            warn!("Failed to create directory {:?}: {}", path, e);
            AppError::FileWriteError(e.to_string())
        })?;

        debug!("Created directory: {:?}", path);

        Ok(FileOperationResult {
            path: path.to_string_lossy().to_string(),
        })
    }

    /// Rename/move file or directory
    pub async fn rename(from: &str, to: &str) -> Result<FileOperationResult, AppError> {
        let from = Self::validate_path(from)?;
        let to = Self::validate_path_for_create(to)?;

        fs::rename(&from, &to).await.map_err(|e| {
            warn!("Failed to rename {:?} to {:?}: {}", from, to, e);
            AppError::FileWriteError(e.to_string())
        })?;

        debug!("Renamed {:?} to {:?}", from, to);

        Ok(FileOperationResult {
            path: to.to_string_lossy().to_string(),
        })
    }

    /// Copy file or directory
    pub async fn copy(from: &str, to: &str, overwrite: bool) -> Result<FileOperationResult, AppError> {
        let from = Self::validate_path(from)?;
        let to = Self::validate_path_for_create(to)?;

        // Check if destination exists
        if !overwrite && to.exists() {
            return Err(AppError::FileExists(to.display().to_string()));
        }

        let metadata = fs::metadata(&from).await.map_err(|e| {
            AppError::FileReadError(e.to_string())
        })?;

        if metadata.is_dir() {
            Self::copy_dir_recursive(&from, &to).await?;
        } else {
            // Create parent directories
            if let Some(parent) = to.parent() {
                fs::create_dir_all(parent).await.ok();
            }
            fs::copy(&from, &to).await.map_err(|e| {
                warn!("Failed to copy {:?} to {:?}: {}", from, to, e);
                AppError::FileWriteError(e.to_string())
            })?;
        }

        debug!("Copied {:?} to {:?}", from, to);

        Ok(FileOperationResult {
            path: to.to_string_lossy().to_string(),
        })
    }

    /// Recursively copy directory
    async fn copy_dir_recursive(from: &Path, to: &Path) -> Result<(), AppError> {
        fs::create_dir_all(to).await.map_err(|e| {
            AppError::FileWriteError(e.to_string())
        })?;

        let mut read_dir = fs::read_dir(from).await.map_err(|e| {
            AppError::FileReadError(e.to_string())
        })?;

        while let Some(entry) = read_dir.next_entry().await.map_err(|e| {
            AppError::FileReadError(e.to_string())
        })? {
            let src = entry.path();
            let dst = to.join(entry.file_name());

            if entry.file_type().await.map_err(|e| AppError::FileReadError(e.to_string()))?.is_dir() {
                Box::pin(Self::copy_dir_recursive(&src, &dst)).await?;
            } else {
                fs::copy(&src, &dst).await.map_err(|e| {
                    AppError::FileWriteError(e.to_string())
                })?;
            }
        }

        Ok(())
    }

    /// Delete file or directory
    pub async fn delete(path: &str, recursive: bool) -> Result<FileOperationResult, AppError> {
        let path = Self::validate_path(path)?;

        let metadata = fs::metadata(&path).await.map_err(|e| {
            warn!("Failed to get metadata for {:?}: {}", path, e);
            AppError::NotFound(t!("errors.files.file_not_found").to_string())
        })?;

        if metadata.is_dir() {
            if recursive {
                fs::remove_dir_all(&path).await
            } else {
                fs::remove_dir(&path).await
            }
            .map_err(|e| {
                warn!("Failed to delete directory {:?}: {}", path, e);
                AppError::FileWriteError(e.to_string())
            })?;
        } else {
            fs::remove_file(&path).await.map_err(|e| {
                warn!("Failed to delete file {:?}: {}", path, e);
                AppError::FileWriteError(e.to_string())
            })?;
        }

        debug!("Deleted: {:?}", path);

        Ok(FileOperationResult {
            path: path.to_string_lossy().to_string(),
        })
    }

    /// Get file info (stat)
    pub async fn stat(path: &str) -> Result<FileInfo, AppError> {
        let path = Self::validate_path(path)?;

        let metadata = fs::metadata(&path).await.map_err(|e| {
            warn!("Failed to get metadata for {:?}: {}", path, e);
            AppError::NotFound(t!("errors.files.file_not_found").to_string())
        })?;

        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else if metadata.file_type().is_symlink() {
            FileType::Symlink
        } else {
            FileType::File
        };

        let symlink_target = if file_type == FileType::Symlink {
            fs::read_link(&path)
                .await
                .ok()
                .map(|p| p.to_string_lossy().to_string())
        } else {
            None
        };

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let created = metadata
            .created()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let accessed = metadata
            .accessed()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let permissions = format!("{:o}", metadata.permissions().mode() & 0o777);

        // Get owner and group names
        let uid = metadata.uid();
        let gid = metadata.gid();
        let owner = lookup_user_name(uid).unwrap_or_else(|| uid.to_string());
        let group = lookup_group_name(gid).unwrap_or_else(|| gid.to_string());

        Ok(FileInfo {
            path: path.to_string_lossy().to_string(),
            name,
            file_type,
            size: metadata.len(),
            modified,
            created,
            accessed,
            permissions,
            owner,
            group,
            symlink_target,
        })
    }

    /// Search files by pattern
    pub async fn search(
        path: &str,
        pattern: &str,
        max_depth: usize,
        max_results: usize,
    ) -> Result<SearchResult, AppError> {
        let path = Self::validate_path(path)?;
        let pattern = pattern.to_lowercase();

        let mut matches = Vec::new();
        let mut total = 0;

        Self::search_recursive(&path, &pattern, 0, max_depth, max_results, &mut matches, &mut total).await?;

        let truncated = total > max_results;

        Ok(SearchResult {
            matches,
            total,
            truncated,
        })
    }

    /// Recursive search helper
    async fn search_recursive(
        dir: &Path,
        pattern: &str,
        depth: usize,
        max_depth: usize,
        max_results: usize,
        matches: &mut Vec<FileEntry>,
        total: &mut usize,
    ) -> Result<(), AppError> {
        if depth > max_depth {
            return Ok(());
        }

        let mut read_dir = match fs::read_dir(dir).await {
            Ok(rd) => rd,
            Err(_) => return Ok(()), // Skip inaccessible directories
        };

        while let Ok(Some(entry)) = read_dir.next_entry().await {
            let name = entry.file_name().to_string_lossy().to_string();

            // Check if name matches pattern
            if name.to_lowercase().contains(pattern) {
                *total += 1;
                if matches.len() < max_results {
                    if let Ok(file_entry) = Self::get_file_entry(&entry).await {
                        matches.push(file_entry);
                    }
                }
            }

            // Recurse into directories
            if let Ok(ft) = entry.file_type().await {
                if ft.is_dir() {
                    Box::pin(Self::search_recursive(
                        &entry.path(),
                        pattern,
                        depth + 1,
                        max_depth,
                        max_results,
                        matches,
                        total,
                    )).await?;
                }
            }
        }

        Ok(())
    }

    /// Get file download path (validates and returns canonical path)
    pub async fn get_download_path(path: &str) -> Result<PathBuf, AppError> {
        let path = Self::validate_path(path)?;

        let metadata = fs::metadata(&path).await.map_err(|e| {
            warn!("Failed to get metadata for {:?}: {}", path, e);
            AppError::NotFound(t!("errors.files.file_not_found").to_string())
        })?;

        if metadata.is_dir() {
            return Err(AppError::ValidationError(
                t!("errors.files.is_directory").to_string(),
            ));
        }

        Ok(path)
    }
}

fn sysconf_size(name: libc::c_int, fallback: usize) -> usize {
    let size = unsafe { libc::sysconf(name) };
    if size <= 0 {
        fallback
    } else {
        size as usize
    }
}

fn lookup_user_name(uid: u32) -> Option<String> {
    let mut pwd = MaybeUninit::<libc::passwd>::uninit();
    let mut result = std::ptr::null_mut();
    let buf_len = sysconf_size(libc::_SC_GETPW_R_SIZE_MAX, 1024);
    let mut buf = vec![0u8; buf_len];

    let rc = unsafe {
        libc::getpwuid_r(
            uid as libc::uid_t,
            pwd.as_mut_ptr(),
            buf.as_mut_ptr() as *mut libc::c_char,
            buf.len(),
            &mut result,
        )
    };

    if rc != 0 || result.is_null() {
        return None;
    }

    let pwd = unsafe { pwd.assume_init() };
    if pwd.pw_name.is_null() {
        return None;
    }

    Some(unsafe { CStr::from_ptr(pwd.pw_name) }
        .to_string_lossy()
        .into_owned())
}

fn lookup_group_name(gid: u32) -> Option<String> {
    let mut grp = MaybeUninit::<libc::group>::uninit();
    let mut result = std::ptr::null_mut();
    let buf_len = sysconf_size(libc::_SC_GETGR_R_SIZE_MAX, 1024);
    let mut buf = vec![0u8; buf_len];

    let rc = unsafe {
        libc::getgrgid_r(
            gid as libc::gid_t,
            grp.as_mut_ptr(),
            buf.as_mut_ptr() as *mut libc::c_char,
            buf.len(),
            &mut result,
        )
    };

    if rc != 0 || result.is_null() {
        return None;
    }

    let grp = unsafe { grp.assume_init() };
    if grp.gr_name.is_null() {
        return None;
    }

    Some(unsafe { CStr::from_ptr(grp.gr_name) }
        .to_string_lossy()
        .into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_path_rejects_relative() {
        let result = FileService::validate_path("relative/path");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_path_rejects_traversal() {
        let result = FileService::validate_path_for_create("/home/../etc/passwd");
        assert!(result.is_err());
    }
}
