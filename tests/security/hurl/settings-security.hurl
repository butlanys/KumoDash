# KumoDash API Security Tests - Settings
# Run: hurl --test --variable base_url=http://localhost:8443 settings-security.hurl

# ============================================
# 1. Settings Endpoint Authentication
# ============================================

# Test: Get settings without auth
GET {{base_url}}/api/v1/settings
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

# Test: Get settings with invalid token
GET {{base_url}}/api/v1/settings
Authorization: Bearer invalid-token-here
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Update settings without auth
PUT {{base_url}}/api/v1/settings
Content-Type: application/json
{
  "https_port": 9000
}
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Update settings with invalid token
PUT {{base_url}}/api/v1/settings
Content-Type: application/json
Authorization: Bearer invalid-token
{
  "https_port": 9000
}
HTTP 401
[Asserts]
jsonpath "$.success" == false

# ============================================
# 2. Settings Validation Tests
# ============================================

# Note: These tests require a valid auth token
# Use --variable token=<valid_jwt> when running

# Test: Invalid auth_path_prefix (not starting with /)
# PUT {{base_url}}/api/v1/settings
# Content-Type: application/json
# Authorization: Bearer {{token}}
# {
#   "auth_path_prefix": "invalid"
# }
# HTTP 400
# [Asserts]
# jsonpath "$.success" == false

# Test: Invalid session_timeout (out of range)
# PUT {{base_url}}/api/v1/settings
# Content-Type: application/json
# Authorization: Bearer {{token}}
# {
#   "session_timeout_minutes": 9999
# }
# HTTP 400
# [Asserts]
# jsonpath "$.success" == false

# Test: Invalid port (0)
# PUT {{base_url}}/api/v1/settings
# Content-Type: application/json
# Authorization: Bearer {{token}}
# {
#   "https_port": 0
# }
# HTTP 400
# [Asserts]
# jsonpath "$.success" == false

# ============================================
# 3. SQL Injection Tests
# ============================================

# Test: SQL Injection in auth_path_prefix (requires auth)
# PUT {{base_url}}/api/v1/settings
# Content-Type: application/json
# Authorization: Bearer {{token}}
# {
#   "auth_path_prefix": "/' OR '1'='1"
# }
# HTTP 400
# [Asserts]
# jsonpath "$.success" == false

# ============================================
# 4. Restart Endpoints Authentication
# ============================================

# Test: Restart panel without auth
POST {{base_url}}/api/v1/system/restart-panel
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

# Test: Restart panel with invalid token
POST {{base_url}}/api/v1/system/restart-panel
Authorization: Bearer invalid-token
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Restart server without auth
POST {{base_url}}/api/v1/system/restart-server
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

# Test: Restart server with invalid token
POST {{base_url}}/api/v1/system/restart-server
Authorization: Bearer invalid-token
HTTP 401
[Asserts]
jsonpath "$.success" == false
