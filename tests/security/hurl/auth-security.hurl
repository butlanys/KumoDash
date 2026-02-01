# KumoDash API Security Tests - Authentication
# Run: hurl --test --variable base_url=http://localhost:8443 auth-security.hurl
# Updated based on API_SPECIFICATION.md

# ============================================
# 1. SQL Injection Tests - Login
# ============================================

# Test: SQL Injection in username field
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": "admin' OR '1'='1",
  "password": "test123",
  "auth_path": "login"
}
HTTP *
[Asserts]
status >= 400
status < 500
body not contains "access_token"

# Test: SQL Injection in password field
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": "admin",
  "password": "' OR '1'='1",
  "auth_path": "login"
}
HTTP *
[Asserts]
status >= 400
status < 500
body not contains "access_token"

# Test: UNION-based SQL Injection
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": "admin' UNION SELECT 1,2,3--",
  "password": "test",
  "auth_path": "login"
}
HTTP *
[Asserts]
status >= 400
status < 500
body not contains "access_token"

# Test: SQL Injection in auth_path field
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": "admin",
  "password": "test",
  "auth_path": "' OR '1'='1"
}
HTTP *
[Asserts]
status >= 400
status < 500
body not contains "access_token"

# Test: Invalid auth_path returns 404
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": "admin",
  "password": "test",
  "auth_path": "invalid-path-12345"
}
HTTP 404
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "RESOURCE_NOT_FOUND"

# ============================================
# 2. Authentication Bypass Tests
# ============================================

# Test: Access protected endpoint without token
GET {{base_url}}/api/v1/users/me
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

# Test: Access protected endpoint with invalid Bearer token
GET {{base_url}}/api/v1/users/me
Authorization: Bearer invalid-token-here
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: JWT None Algorithm Attack
GET {{base_url}}/api/v1/users/me
Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyX2lkIjoiMSIsInJvbGUiOiJhZG1pbiJ9.
HTTP 401
[Asserts]
jsonpath "$.success" == false

# ============================================
# 3. System Status Endpoint Protection
# ============================================

# Test: Access system status without auth
GET {{base_url}}/api/v1/system/status
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Access system status with malformed JWT
GET {{base_url}}/api/v1/system/status
Authorization: Bearer abc.def.ghi
HTTP 401

# ============================================
# 4. Password Change Protection
# ============================================

# Test: Change password without auth
PUT {{base_url}}/api/v1/users/me/password
Content-Type: application/json
{
  "current_password": "test",
  "new_password": "NewPassword123"
}
HTTP 401

# ============================================
# 5. Logout Endpoint Protection
# ============================================

# Test: Logout without auth
POST {{base_url}}/api/v1/auth/logout
Content-Type: application/json
{
  "refresh_token": "fake-token"
}
HTTP 401

# ============================================
# 6. Validate Path Tests
# ============================================

# Test: Validate path with valid prefix
POST {{base_url}}/api/v1/auth/validate-path
Content-Type: application/json
{
  "prefix": "login"
}
HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.valid" exists

# Test: Validate path with XSS attempt
POST {{base_url}}/api/v1/auth/validate-path
Content-Type: application/json
{
  "prefix": "<script>alert(1)</script>"
}
HTTP 200
[Asserts]
jsonpath "$.success" == true
body not contains "<script>"
