//! JWT token utilities

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, TokenData, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::error::AppError;

/// JWT Claims for access token
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    /// Subject (user id)
    pub sub: String,
    /// Username
    pub username: String,
    /// Expiration time (Unix timestamp)
    pub exp: i64,
    /// Issued at time (Unix timestamp)
    pub iat: i64,
    /// Token type: "access" or "refresh"
    pub token_type: String,
    /// Unique token ID
    pub jti: String,
}

/// Token pair containing access and refresh tokens
#[derive(Debug, Serialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub token_type: String,
}

/// Generate an access token
pub fn generate_access_token(
    user_id: &str,
    username: &str,
    secret: &str,
    expires_minutes: i64,
) -> Result<String, AppError> {
    let now = Utc::now();
    let exp = now + Duration::minutes(expires_minutes);

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        exp: exp.timestamp(),
        iat: now.timestamp(),
        token_type: "access".to_string(),
        jti: Uuid::new_v4().to_string(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalError(format!("Token generation failed: {e}")))
}

/// Generate a refresh token
pub fn generate_refresh_token(
    user_id: &str,
    username: &str,
    secret: &str,
    expires_days: i64,
) -> Result<(String, String), AppError> {
    let now = Utc::now();
    let exp = now + Duration::days(expires_days);
    let jti = Uuid::new_v4().to_string();

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        exp: exp.timestamp(),
        iat: now.timestamp(),
        token_type: "refresh".to_string(),
        jti: jti.clone(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalError(format!("Token generation failed: {e}")))?;

    Ok((token, jti))
}

/// Generate a token pair (access + refresh)
pub fn generate_token_pair(
    user_id: &str,
    username: &str,
    secret: &str,
    access_expires_minutes: i64,
    refresh_expires_days: i64,
) -> Result<(TokenPair, String), AppError> {
    let access_token =
        generate_access_token(user_id, username, secret, access_expires_minutes)?;
    let (refresh_token, refresh_jti) =
        generate_refresh_token(user_id, username, secret, refresh_expires_days)?;

    Ok((
        TokenPair {
            access_token,
            refresh_token,
            expires_in: access_expires_minutes * 60,
            token_type: "Bearer".to_string(),
        },
        refresh_jti,
    ))
}

/// Verify and decode a token
pub fn verify_token(token: &str, secret: &str) -> Result<TokenData<Claims>, AppError> {
    let validation = Validation::default();

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => AppError::TokenExpired,
        _ => AppError::TokenInvalid,
    })
}

/// Extract token from Authorization header
pub fn extract_bearer_token(auth_header: &str) -> Option<&str> {
    auth_header.strip_prefix("Bearer ")
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-secret-key";

    #[test]
    fn test_generate_and_verify_access_token() {
        let token = generate_access_token("1", "admin", TEST_SECRET, 15).unwrap();
        let claims = verify_token(&token, TEST_SECRET).unwrap();

        assert_eq!(claims.claims.sub, "1");
        assert_eq!(claims.claims.username, "admin");
        assert_eq!(claims.claims.token_type, "access");
    }

    #[test]
    fn test_generate_token_pair() {
        let (pair, _jti) =
            generate_token_pair("1", "admin", TEST_SECRET, 15, 7).unwrap();

        assert!(!pair.access_token.is_empty());
        assert!(!pair.refresh_token.is_empty());
        assert_eq!(pair.token_type, "Bearer");
        assert_eq!(pair.expires_in, 15 * 60);
    }

    #[test]
    fn test_invalid_token() {
        let result = verify_token("invalid-token", TEST_SECRET);
        assert!(result.is_err());
    }

    #[test]
    fn test_extract_bearer_token() {
        assert_eq!(
            extract_bearer_token("Bearer abc123"),
            Some("abc123")
        );
        assert_eq!(extract_bearer_token("abc123"), None);
    }
}
