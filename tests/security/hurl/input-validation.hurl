# KumoDash API Security Tests - Input Validation
# Run: hurl --test --variable base_url=http://localhost:8443 input-validation.hurl
# Updated based on API_SPECIFICATION.md

# ============================================
# 1. XSS Prevention Tests
# ============================================

# Test: XSS in username field
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": "<script>alert('xss')</script>",
  "password": "test123",
  "auth_path": "login"
}
HTTP *
[Asserts]
status >= 400
status < 500
body not contains "<script>"

# Test: XSS in validate-path prefix
POST {{base_url}}/api/v1/auth/validate-path
Content-Type: application/json
{
  "prefix": "<img src=x onerror=alert(1)>"
}
HTTP *
[Asserts]
body not contains "onerror"

# ============================================
# 2. Path Traversal Tests
# ============================================

# Test: Path traversal in static files
GET {{base_url}}/assets/../../../etc/passwd
HTTP *
[Asserts]
body not contains "root:"
status < 500

# Test: Encoded path traversal
GET {{base_url}}/assets/..%2F..%2F..%2Fetc%2Fpasswd
HTTP *
[Asserts]
body not contains "root:"
status < 500

# Test: Double encoded path traversal
GET {{base_url}}/assets/..%252F..%252F..%252Fetc%252Fpasswd
HTTP *
[Asserts]
body not contains "root:"
status < 500

# ============================================
# 3. Large Payload Tests
# ============================================

# Test: Oversized username (potential DoS)
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "password": "test",
  "auth_path": "login"
}
HTTP *
[Asserts]
status < 500

# ============================================
# 4. Special Characters Tests
# ============================================

# Test: Unicode in username
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": "admin\u202e",
  "password": "test",
  "auth_path": "login"
}
HTTP *
[Asserts]
status < 500

# Test: Null byte injection
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": "admin\u0000",
  "password": "test",
  "auth_path": "login"
}
HTTP *
[Asserts]
status < 500

# ============================================
# 5. Content-Type Validation
# ============================================

# Test: Wrong Content-Type (text/plain)
POST {{base_url}}/api/v1/auth/login
Content-Type: text/plain
{"username": "admin", "password": "test", "auth_path": "login"}
HTTP *
[Asserts]
status >= 400

# Test: Missing Content-Type header
POST {{base_url}}/api/v1/auth/login
{"username": "admin", "password": "test", "auth_path": "login"}
HTTP *
[Asserts]
status >= 400

# ============================================
# 6. JSON Injection Tests
# ============================================

# Test: Nested object injection in username
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
  "username": {"$ne": null},
  "password": "test",
  "auth_path": "login"
}
HTTP *
[Asserts]
status >= 400
status < 500
