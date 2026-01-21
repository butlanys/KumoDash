//! JWT authentication middleware

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};

use crate::utils::error::AppError;
use crate::utils::jwt::{extract_bearer_token, verify_token};

/// Authenticated user information extracted from JWT
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: i64,
    pub username: String,
}

/// JWT authentication middleware
pub async fn auth_middleware(
    State(state): State<crate::api::AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    // Extract Authorization header
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) => extract_bearer_token(header).ok_or(AppError::TokenInvalid)?,
        None => return Err(AppError::TokenInvalid),
    };

    // Verify token
    let claims = verify_token(token, &state.settings.jwt_secret)?;

    // Check token type
    if claims.claims.token_type != "access" {
        return Err(AppError::TokenInvalid);
    }

    // Create auth user
    let auth_user = AuthUser {
        id: claims.claims.sub.parse().map_err(|_| AppError::TokenInvalid)?,
        username: claims.claims.username,
    };

    // Insert auth user into request extensions
    request.extensions_mut().insert(auth_user);

    Ok(next.run(request).await)
}
