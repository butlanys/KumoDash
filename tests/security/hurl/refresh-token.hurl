# KumoDash API Security Tests - Refresh Token
# Run: hurl --test --variable base_url=http://localhost:8443 refresh-token.hurl
# Updated based on API_SPECIFICATION.md

# ============================================
# 1. Refresh Token Validation
# ============================================

# Test: Refresh with invalid token
POST {{base_url}}/api/v1/auth/refresh
Content-Type: application/json
{
  "refresh_token": "invalid-refresh-token"
}
HTTP *
[Asserts]
status >= 400
status < 500
jsonpath "$.success" == false

# Test: Refresh with empty token
POST {{base_url}}/api/v1/auth/refresh
Content-Type: application/json
{
  "refresh_token": ""
}
HTTP *
[Asserts]
status >= 400
status < 500

# Test: Refresh with malformed JWT
POST {{base_url}}/api/v1/auth/refresh
Content-Type: application/json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.payload"
}
HTTP *
[Asserts]
status >= 400
status < 500
jsonpath "$.success" == false

# Test: Refresh with SQL injection attempt
POST {{base_url}}/api/v1/auth/refresh
Content-Type: application/json
{
  "refresh_token": "' OR '1'='1; DROP TABLE tokens;--"
}
HTTP *
[Asserts]
status >= 400
status < 500

# ============================================
# 2. Token Replay Attack Tests
# ============================================

# Test: Using expired refresh token (exp=1)
POST {{base_url}}/api/v1/auth/refresh
Content-Type: application/json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxfQ.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht"
}
HTTP *
[Asserts]
status >= 400
status < 500

# ============================================
# 3. Missing Field Tests
# ============================================

# Test: Missing refresh_token field
POST {{base_url}}/api/v1/auth/refresh
Content-Type: application/json
{}
HTTP *
[Asserts]
status >= 400
status < 500

# Test: Wrong field name (token instead of refresh_token)
POST {{base_url}}/api/v1/auth/refresh
Content-Type: application/json
{
  "token": "some-token"
}
HTTP *
[Asserts]
status >= 400
status < 500

# Test: Extra unexpected fields (should be ignored or rejected)
POST {{base_url}}/api/v1/auth/refresh
Content-Type: application/json
{
  "refresh_token": "invalid-token",
  "malicious_field": "attack"
}
HTTP *
[Asserts]
status >= 400
status < 500
