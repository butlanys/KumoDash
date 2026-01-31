//! I18n utilities for localization

use axum::{
    extract::FromRequestParts,
    http::{request::Parts, HeaderMap},
};

/// Default locale when no Accept-Language header is present
pub const DEFAULT_LOCALE: &str = "zh-CN";

/// Supported locales
pub const SUPPORTED_LOCALES: &[&str] = &["zh-CN", "zh", "en"];

/// Locale extractor from request headers
#[derive(Debug, Clone)]
pub struct Locale(pub String);

impl Locale {
    /// Get the locale string
    pub fn as_str(&self) -> &str {
        &self.0
    }
    
    /// Set the current locale for this request context
    pub fn activate(&self) {
        rust_i18n::set_locale(self.as_str());
    }
}

impl Default for Locale {
    fn default() -> Self {
        Self(DEFAULT_LOCALE.to_string())
    }
}

impl<S> FromRequestParts<S> for Locale
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        Ok(parse_accept_language(&parts.headers))
    }
}

/// Parse Accept-Language header and return the best matching locale
pub fn parse_accept_language(headers: &HeaderMap) -> Locale {
    let accept_language = headers
        .get("Accept-Language")
        .and_then(|v| v.to_str().ok())
        .unwrap_or(DEFAULT_LOCALE);

    // Parse Accept-Language header (e.g., "zh-CN,zh;q=0.9,en;q=0.8")
    let locale = accept_language
        .split(',')
        .filter_map(|part| {
            let mut parts = part.trim().split(';');
            let lang = parts.next()?.trim();
            let quality: f32 = parts
                .next()
                .and_then(|q| q.trim().strip_prefix("q="))
                .and_then(|q| q.parse().ok())
                .unwrap_or(1.0);
            Some((lang, quality))
        })
        .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(lang, _)| lang)
        .unwrap_or(DEFAULT_LOCALE);

    // Match to supported locales
    let matched = match_locale(locale);
    Locale(matched.to_string())
}

/// Match a locale string to a supported locale
fn match_locale(locale: &str) -> &'static str {
    // Exact match
    for supported in SUPPORTED_LOCALES {
        if locale.eq_ignore_ascii_case(supported) {
            return supported;
        }
    }

    // Prefix match (e.g., "zh" matches "zh-CN")
    let prefix = locale.split('-').next().unwrap_or(locale);
    for supported in SUPPORTED_LOCALES {
        if supported.starts_with(prefix) {
            return supported;
        }
    }

    DEFAULT_LOCALE
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_match_locale() {
        assert_eq!(match_locale("zh-CN"), "zh-CN");
        assert_eq!(match_locale("zh"), "zh"); // Exact match to "zh"
        assert_eq!(match_locale("en"), "en");
        assert_eq!(match_locale("en-US"), "en"); // Prefix match
        assert_eq!(match_locale("fr"), "zh-CN"); // Fallback
    }
}
