//! KumoDash Backend Library
//!
//! A lightweight cloud server control panel backend built with Axum.

pub mod api;
pub mod config;
pub mod db;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod response;
pub mod services;
pub mod utils;

use std::sync::atomic::AtomicBool;

/// Global flag to control setup routes availability
/// Once setup is complete, this is set to false to disable setup endpoints
pub static SETUP_ROUTES_ENABLED: AtomicBool = AtomicBool::new(true);
