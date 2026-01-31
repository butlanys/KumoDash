//! I18n middleware for setting request locale

use axum::{
    body::Body,
    http::Request,
    middleware::Next,
    response::Response,
};

use crate::utils::i18n::parse_accept_language;

/// Middleware to set the locale from Accept-Language header
pub async fn i18n_middleware(request: Request<Body>, next: Next) -> Response {
    // Extract locale from Accept-Language header
    let locale = parse_accept_language(request.headers());
    
    // Set the locale for this request
    locale.activate();
    
    // Continue processing the request
    next.run(request).await
}
