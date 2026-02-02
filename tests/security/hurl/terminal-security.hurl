# KumoDash API Security Tests - Terminal
# Run: hurl --test --variable base_url=https://localhost:8443 terminal-security.hurl

# ============================================
# 1. Authentication Required Tests
# ============================================

# Test: Create session without auth
POST {{base_url}}/api/v1/terminal/sessions
Content-Type: application/json
{}
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

# Test: List sessions without auth
GET {{base_url}}/api/v1/terminal/sessions
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

# Test: Terminate session without auth
DELETE {{base_url}}/api/v1/terminal/sessions/fake-session-id
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Terminate all sessions without auth
DELETE {{base_url}}/api/v1/terminal/sessions
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Reconnect session without auth
POST {{base_url}}/api/v1/terminal/sessions/fake-session-id/reconnect
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Get scrollback without auth
GET {{base_url}}/api/v1/terminal/sessions/fake-session-id/scrollback
HTTP 401
[Asserts]
jsonpath "$.success" == false

# ============================================
# 2. Invalid Token Tests
# ============================================

# Test: Create session with invalid token
POST {{base_url}}/api/v1/terminal/sessions
Content-Type: application/json
Authorization: Bearer invalid-token
{}
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: List sessions with malformed JWT
GET {{base_url}}/api/v1/terminal/sessions
Authorization: Bearer abc.def.ghi
HTTP 401
[Asserts]
jsonpath "$.success" == false

# ============================================
# 3. Session ID Injection Tests
# ============================================

# Test: SQL Injection in session ID (terminate)
DELETE {{base_url}}/api/v1/terminal/sessions/' OR '1'='1
Authorization: Bearer invalid-token
HTTP 401

# Test: Path traversal in session ID
DELETE {{base_url}}/api/v1/terminal/sessions/../../etc/passwd
Authorization: Bearer invalid-token
HTTP 401

# Test: SQL Injection in reconnect endpoint
POST {{base_url}}/api/v1/terminal/sessions/' UNION SELECT 1--/reconnect
Authorization: Bearer invalid-token
HTTP 401

# ============================================
# 4. Input Validation Tests
# ============================================

# Test: Invalid JSON body for create session
POST {{base_url}}/api/v1/terminal/sessions
Content-Type: application/json
Authorization: Bearer invalid-token
{invalid json}
HTTP 401

# Test: XSS in session name (should be sanitized or rejected)
POST {{base_url}}/api/v1/terminal/sessions
Content-Type: application/json
Authorization: Bearer invalid-token
{
  "name": "<script>alert(1)</script>"
}
HTTP 401

# Test: Very long session name
POST {{base_url}}/api/v1/terminal/sessions
Content-Type: application/json
Authorization: Bearer invalid-token
{
  "name": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
HTTP 401

# Test: Command injection in shell parameter
POST {{base_url}}/api/v1/terminal/sessions
Content-Type: application/json
Authorization: Bearer invalid-token
{
  "shell": "/bin/bash; rm -rf /"
}
HTTP 401

# Test: Path traversal in cwd parameter
POST {{base_url}}/api/v1/terminal/sessions
Content-Type: application/json
Authorization: Bearer invalid-token
{
  "cwd": "../../etc"
}
HTTP 401

# ============================================
# 5. WebSocket Endpoint Protection
# ============================================

# Test: WebSocket upgrade without token
GET {{base_url}}/api/v1/terminal/ws/fake-session-id
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: WebSocket upgrade with invalid session ID format
GET {{base_url}}/api/v1/terminal/ws/' OR '1'='1
HTTP 401
