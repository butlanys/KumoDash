//! Password hashing utilities using Argon2

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rust_i18n::t;

use super::error::AppError;

/// Hash a password using Argon2id
pub fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| AppError::InternalError(format!("Password hashing failed: {}", e)))
}

/// Verify a password against a hash
pub fn verify_password(password: &str, password_hash: &str) -> Result<bool, AppError> {
    let parsed_hash = PasswordHash::new(password_hash)
        .map_err(|e| AppError::InternalError(format!("Invalid password hash format: {}", e)))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

/// Validate password strength
/// Requirements: at least 8 characters, contains uppercase, lowercase, and digit
pub fn validate_password_strength(password: &str) -> Result<(), AppError> {
    validate_password_strength_with_mode(password, false)
}

/// Validate password strength with optional weak mode
/// If allow_weak is true, only checks length >= 8
pub fn validate_password_strength_with_mode(password: &str, allow_weak: bool) -> Result<(), AppError> {
    if password.len() < 8 {
        return Err(AppError::ValidationError(
            t!("errors.validation.password_too_short").to_string(),
        ));
    }

    if allow_weak {
        return Ok(());
    }

    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());

    if !has_uppercase || !has_lowercase || !has_digit {
        return Err(AppError::ValidationError(
            t!("errors.validation.password_weak").to_string(),
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify_password() {
        let password = "SecureP@ss123";
        let hash = hash_password(password).unwrap();

        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_password_strength_validation() {
        // Valid password
        assert!(validate_password_strength("SecureP1").is_ok());

        // Too short
        assert!(validate_password_strength("Short1").is_err());

        // No uppercase
        assert!(validate_password_strength("password1").is_err());

        // No lowercase
        assert!(validate_password_strength("PASSWORD1").is_err());

        // No digit
        assert!(validate_password_strength("Password").is_err());
    }
}
