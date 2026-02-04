//! File management handlers

use axum::{
    body::Body,
    extract::{Multipart, Query, State},
    http::header,
    response::IntoResponse,
    Extension, Json,
};
use rust_i18n::t;
use serde::Deserialize;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio_util::io::ReaderStream;
use tracing::{debug, info};

use crate::api::AppState;
use crate::middleware::auth::AuthUser;
use crate::models::files::{
    CopyRequest, CreateDirRequest, DeleteRequest, DirectoryListing, FileContent, FileInfo,
    FileOperationResult, RenameRequest, SearchRequest, SearchResult, WriteFileRequest,
};
use crate::response::ApiResponse;
use crate::services::files::FileService;
use crate::utils::error::AppError;

/// Query params for list directory
#[derive(Debug, Deserialize)]
pub struct ListDirQuery {
    pub path: String,
    #[serde(default)]
    pub show_hidden: bool,
}

/// List directory contents
pub async fn list_dir(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Query(query): Query<ListDirQuery>,
) -> Result<ApiResponse<DirectoryListing>, AppError> {
    debug!("Listing directory: {}", query.path);

    let listing = FileService::list_dir(&query.path, query.show_hidden).await?;

    Ok(ApiResponse::success(listing))
}

/// Query params for read file
#[derive(Debug, Deserialize)]
pub struct ReadFileQuery {
    pub path: String,
    pub max_size: Option<u64>,
}

/// Read file content
pub async fn read_file(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Query(query): Query<ReadFileQuery>,
) -> Result<ApiResponse<FileContent>, AppError> {
    debug!("Reading file: {}", query.path);

    let content = FileService::read_file(&query.path, query.max_size).await?;

    Ok(ApiResponse::success(content))
}

/// Write file content
pub async fn write_file(
    State(_state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<WriteFileRequest>,
) -> Result<ApiResponse<FileOperationResult>, AppError> {
    info!("User {} writing file: {}", auth_user.id, request.path);

    let result = FileService::write_file(&request.path, &request.content, request.create_dirs).await?;

    Ok(ApiResponse::success_with_message(
        result,
        t!("success.files.written").to_string(),
    ))
}

/// Create directory
pub async fn create_dir(
    State(_state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<CreateDirRequest>,
) -> Result<ApiResponse<FileOperationResult>, AppError> {
    info!("User {} creating directory: {}", auth_user.id, request.path);

    let result = FileService::create_dir(&request.path, request.recursive).await?;

    Ok(ApiResponse::success_with_message(
        result,
        t!("success.files.directory_created").to_string(),
    ))
}

/// Rename/move file or directory
pub async fn rename(
    State(_state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<RenameRequest>,
) -> Result<ApiResponse<FileOperationResult>, AppError> {
    info!(
        "User {} renaming {} to {}",
        auth_user.id, request.from, request.to
    );

    let result = FileService::rename(&request.from, &request.to).await?;

    Ok(ApiResponse::success_with_message(
        result,
        t!("success.files.renamed").to_string(),
    ))
}

/// Copy file or directory
pub async fn copy(
    State(_state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<CopyRequest>,
) -> Result<ApiResponse<FileOperationResult>, AppError> {
    info!(
        "User {} copying {} to {}",
        auth_user.id, request.from, request.to
    );

    let result = FileService::copy(&request.from, &request.to, request.overwrite).await?;

    Ok(ApiResponse::success_with_message(
        result,
        t!("success.files.copied").to_string(),
    ))
}

/// Delete file or directory
pub async fn delete(
    State(_state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<DeleteRequest>,
) -> Result<ApiResponse<FileOperationResult>, AppError> {
    info!("User {} deleting: {}", auth_user.id, request.path);

    let result = FileService::delete(&request.path, request.recursive).await?;

    Ok(ApiResponse::success_with_message(
        result,
        t!("success.files.deleted").to_string(),
    ))
}

/// Query params for stat
#[derive(Debug, Deserialize)]
pub struct StatQuery {
    pub path: String,
}

/// Get file info (stat)
pub async fn stat(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Query(query): Query<StatQuery>,
) -> Result<ApiResponse<FileInfo>, AppError> {
    debug!("Getting file info: {}", query.path);

    let info = FileService::stat(&query.path).await?;

    Ok(ApiResponse::success(info))
}

/// Search files
pub async fn search(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(request): Json<SearchRequest>,
) -> Result<ApiResponse<SearchResult>, AppError> {
    debug!("Searching in {} for: {}", request.path, request.pattern);

    let result = FileService::search(
        &request.path,
        &request.pattern,
        request.max_depth,
        request.max_results,
    )
    .await?;

    Ok(ApiResponse::success(result))
}

/// Query params for download
#[derive(Debug, Deserialize)]
pub struct DownloadQuery {
    pub path: String,
}

/// Download file
pub async fn download(
    State(_state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<DownloadQuery>,
) -> Result<impl IntoResponse, AppError> {
    info!("User {} downloading: {}", auth_user.id, query.path);

    let path = FileService::get_download_path(&query.path).await?;

    let file = File::open(&path).await.map_err(|e| {
        AppError::FileReadError(e.to_string())
    })?;

    let metadata = file.metadata().await.map_err(|e| {
        AppError::FileReadError(e.to_string())
    })?;

    let filename = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "download".to_string());

    let mime_type = mime_guess::from_path(&path)
        .first_or_octet_stream()
        .to_string();

    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    let headers = [
        (header::CONTENT_TYPE, mime_type),
        (
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        ),
        (header::CONTENT_LENGTH, metadata.len().to_string()),
    ];

    Ok((headers, body))
}

/// Upload file via multipart
pub async fn upload(
    State(_state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    mut multipart: Multipart,
) -> Result<ApiResponse<Vec<FileOperationResult>>, AppError> {
    const MAX_UPLOAD_SIZE: u64 = 1024 * 1024 * 1024; // 1GB safety limit
    let mut results = Vec::new();
    let mut target_path: Option<String> = None;

    while let Some(mut field) = multipart.next_field().await.map_err(|e| {
        AppError::ValidationError(format!("Failed to read multipart field: {}", e))
    })? {
        let name = field.name().unwrap_or("").to_string();

        if name == "path" {
            // Target directory path
            target_path = Some(field.text().await.map_err(|e| {
                AppError::ValidationError(format!("Failed to read path field: {}", e))
            })?);
        } else if name == "file" || name == "files" {
            let filename = field
                .file_name()
                .ok_or_else(|| AppError::ValidationError("Missing filename".to_string()))?
                .to_string();

            let target_dir = target_path
                .as_ref()
                .ok_or_else(|| AppError::ValidationError("Target path not specified".to_string()))?;

            let file_path = format!("{}/{}", target_dir.trim_end_matches('/'), filename);

            info!("User {} uploading: {}", auth_user.id, file_path);

            // Validate and write file
            let path = FileService::validate_path_for_create(&file_path)?;

            // Create parent directories
            if let Some(parent) = path.parent() {
                tokio::fs::create_dir_all(parent).await.ok();
            }

            let mut file = File::create(&path).await.map_err(|e| AppError::FileWriteError(e.to_string()))?;
            let mut total_written = 0u64;

            while let Some(chunk) = field.chunk().await.map_err(|e| {
                AppError::ValidationError(format!("Failed to read file chunk: {}", e))
            })? {
                total_written += chunk.len() as u64;
                if total_written > MAX_UPLOAD_SIZE {
                    return Err(AppError::FileTooLarge(total_written, MAX_UPLOAD_SIZE));
                }
                file.write_all(&chunk).await.map_err(|e| AppError::FileWriteError(e.to_string()))?;
            }

            results.push(FileOperationResult {
                path: path.to_string_lossy().to_string(),
            });
        }
    }

    Ok(ApiResponse::success_with_message(
        results,
        t!("success.files.uploaded").to_string(),
    ))
}
