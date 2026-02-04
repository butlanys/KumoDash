//! Data models

pub mod admin;
pub mod audit;
pub mod files;
pub mod monitoring;
pub mod system;
pub mod systemd;
pub mod terminal;
pub mod token;

pub use admin::{Admin, AdminCredentials, AdminResponse, LoginRequest, PasswordChangeRequest, SecuritySettings, SetupRequest};
pub use audit::{AuditAction, AuditLog};
pub use files::*;
pub use monitoring::{
    AlertThresholds, MetricsConfig, SystemAlert, SystemAlertsResponse, SystemMetricsPoint,
    SystemMetricsResponse, SystemMetricsRow,
};
pub use system::{DiskIoInfo, DiskMountInfo, MemoryInfo, NetworkInfo, SystemStatus};
pub use systemd::{
    SystemdLogEntry, SystemdLogsResponse, SystemdUnit, SystemdUnitCreateRequest,
    SystemdUnitFile, SystemdUnitFileResponse, SystemdUnitFileUpdateRequest,
    SystemdUnitsResponse,
};
pub use terminal::*;
pub use token::{LogoutRequest, LogoutResponse, RefreshToken, RefreshTokenRequest, TokenPairResponse, TokenRefreshResponse, UserInfo};
