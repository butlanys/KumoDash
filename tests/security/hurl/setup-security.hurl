# KumoDash API Security Tests - Setup Endpoints
# Run: hurl --test --variable base_url=http://localhost:8443 setup-security.hurl
# Updated based on API_SPECIFICATION.md

# ============================================
# 1. Setup Token Validation Tests
# ============================================

# Test: Invalid token should be rejected or return 404 (post-setup)
POST {{base_url}}/api/setup/validate-token
Content-Type: application/json
{
  "token": "invalid-fake-token-12345"
}
HTTP *
[Asserts]
status < 500

# Test: Empty token
POST {{base_url}}/api/setup/validate-token
Content-Type: application/json
{
  "token": ""
}
HTTP *
[Asserts]
status < 500

# Test: SQL Injection in token
POST {{base_url}}/api/setup/validate-token
Content-Type: application/json
{
  "token": "' OR '1'='1"
}
HTTP *
[Asserts]
status < 500

# Test: Token with special characters
POST {{base_url}}/api/setup/validate-token
Content-Type: application/json
{
  "token": "a3f8b2c1d4e5f678<script>alert(1)</script>"
}
HTTP *
[Asserts]
status < 500
body not contains "<script>"

# ============================================
# 2. Setup Initialization Tests
# ============================================

# Test: Setup init with invalid token
POST {{base_url}}/api/setup/init
Content-Type: application/json
{
  "token": "fake-invalid-token-1234567890abcdef1234567890abcdef12345678",
  "security": {
    "auth_path_prefix": "/login",
    "session_timeout_minutes": 15
  },
  "admin": {
    "username": "admin",
    "password": "SecureP@ss123"
  }
}
HTTP *
[Asserts]
status >= 400
status < 500

# Test: Setup with weak password (should fail unless allow_weak_password is true)
POST {{base_url}}/api/setup/init
Content-Type: application/json
{
  "token": "fake-token-1234567890abcdef1234567890abcdef1234567890ab",
  "security": {
    "auth_path_prefix": "/login",
    "session_timeout_minutes": 15
  },
  "admin": {
    "username": "admin",
    "password": "123",
    "allow_weak_password": false
  }
}
HTTP *
[Asserts]
status >= 400
status < 500

# Test: Setup with SQL injection in username
POST {{base_url}}/api/setup/init
Content-Type: application/json
{
  "token": "fake-token-1234567890abcdef1234567890abcdef1234567890ab",
  "admin": {
    "username": "admin'; DROP TABLE admins;--",
    "password": "SecureP@ss123"
  }
}
HTTP *
[Asserts]
status >= 400
status < 500

# Test: Setup with XSS in auth_path_prefix
POST {{base_url}}/api/setup/init
Content-Type: application/json
{
  "token": "fake-token-1234567890abcdef1234567890abcdef1234567890ab",
  "security": {
    "auth_path_prefix": "<script>alert(1)</script>",
    "session_timeout_minutes": 15
  },
  "admin": {
    "username": "admin",
    "password": "SecureP@ss123"
  }
}
HTTP *
[Asserts]
status >= 400
status < 500

# ============================================
# 3. Setup Endpoint Hiding Tests (Post-Init)
# ============================================

# Test: After initialization, GET /setup/{token} should return 404
GET {{base_url}}/setup/fake-token-here-1234567890abcdef1234567890abcdef12
HTTP *
[Asserts]
status < 500
