//! Configuration module

pub mod settings;

pub use settings::Settings;

use clap::Parser;
use std::path::PathBuf;

#[derive(Parser, Debug, Clone)]
#[command(name = "kumadash")]
#[command(about = "Lightweight cloud server control panel")]
pub struct CliArgs {
    /// Data directory path
    #[arg(long, default_value = "./data")]
    pub data_dir: PathBuf,
    
    /// Database URL (SQLite)
    #[arg(long, default_value = "")]
    pub database_url: String,
    
    /// Debug mode (disable HTTPS, use HTTP only)
    #[arg(long, default_value = "false")]
    pub debug: bool,
}

impl CliArgs {
    pub fn database_url(&self) -> String {
        if self.database_url.is_empty() {
            format!("sqlite:{}/kumodash.db?mode=rwc", self.data_dir.display())
        } else {
            self.database_url.clone()
        }
    }
    
    pub fn is_debug_mode(&self) -> bool {
        self.debug
    }
}
