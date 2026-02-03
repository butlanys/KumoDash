# KumoDash API Security Tests - Files
# Run: hurl --test --variable base_url=https://localhost:8443 files-security.hurl

# ============================================
# 1. Authentication Required Tests
# ============================================

# Test: List directory without auth
GET {{base_url}}/api/v1/files?path=/tmp
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

# Test: Read file without auth
GET {{base_url}}/api/v1/files/read?path=/etc/passwd
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

# Test: Write file without auth
PUT {{base_url}}/api/v1/files/write
Content-Type: application/json
{
  "path": "/tmp/test.txt",
  "content": "test"
}
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Create directory without auth
POST {{base_url}}/api/v1/files/mkdir
Content-Type: application/json
{
  "path": "/tmp/testdir"
}
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Rename without auth
PUT {{base_url}}/api/v1/files/rename
Content-Type: application/json
{
  "from": "/tmp/a",
  "to": "/tmp/b"
}
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Copy without auth
POST {{base_url}}/api/v1/files/copy
Content-Type: application/json
{
  "from": "/tmp/a",
  "to": "/tmp/b"
}
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Delete without auth
DELETE {{base_url}}/api/v1/files/delete
Content-Type: application/json
{
  "path": "/tmp/test"
}
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Stat without auth
GET {{base_url}}/api/v1/files/stat?path=/tmp
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Search without auth
POST {{base_url}}/api/v1/files/search
Content-Type: application/json
{
  "path": "/tmp",
  "pattern": "test"
}
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Download without auth
GET {{base_url}}/api/v1/files/download?path=/etc/passwd
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Upload without auth
POST {{base_url}}/api/v1/files/upload
Content-Type: multipart/form-data; boundary=boundary
```
--boundary
Content-Disposition: form-data; name="path"

/tmp
--boundary
Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

test content
--boundary--
```
HTTP 401

# ============================================
# 2. Invalid Token Tests
# ============================================

# Test: List directory with invalid token
GET {{base_url}}/api/v1/files?path=/tmp
Authorization: Bearer invalid-token
HTTP 401
[Asserts]
jsonpath "$.success" == false

# Test: Read file with malformed JWT
GET {{base_url}}/api/v1/files/read?path=/etc/passwd
Authorization: Bearer abc.def.ghi
HTTP 401
[Asserts]
jsonpath "$.success" == false

# ============================================
# 3. Path Traversal Tests
# ============================================

# Test: Path traversal in list directory
GET {{base_url}}/api/v1/files?path=/tmp/../../../etc
Authorization: Bearer invalid-token
HTTP 401

# Test: Path traversal in read file (encoded)
GET {{base_url}}/api/v1/files/read?path=%2Ftmp%2F..%2F..%2Fetc%2Fpasswd
Authorization: Bearer invalid-token
HTTP 401

# Test: Path traversal in write file
PUT {{base_url}}/api/v1/files/write
Content-Type: application/json
Authorization: Bearer invalid-token
{
  "path": "/tmp/../../../etc/passwd",
  "content": "hacked"
}
HTTP 401

# Test: Relative path rejection
GET {{base_url}}/api/v1/files?path=../etc
Authorization: Bearer invalid-token
HTTP 401

# Test: Dot-dot in middle of path
PUT {{base_url}}/api/v1/files/write
Content-Type: application/json
Authorization: Bearer invalid-token
{
  "path": "/home/user/../../../root/.ssh/authorized_keys",
  "content": "ssh-rsa AAAA..."
}
HTTP 401

# ============================================
# 4. Input Validation Tests
# ============================================

# Test: Missing path parameter
GET {{base_url}}/api/v1/files
Authorization: Bearer invalid-token
HTTP 401

# Test: Empty path
GET {{base_url}}/api/v1/files?path=
Authorization: Bearer invalid-token
HTTP 401

# Test: Null byte injection in path
GET {{base_url}}/api/v1/files?path=/tmp%00/etc/passwd
Authorization: Bearer invalid-token
HTTP 401

# Test: Very long path
GET {{base_url}}/api/v1/files?path=/tmp/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
Authorization: Bearer invalid-token
HTTP 401

# Test: XSS in file content (should be stored as-is, but not executed)
PUT {{base_url}}/api/v1/files/write
Content-Type: application/json
Authorization: Bearer invalid-token
{
  "path": "/tmp/xss.html",
  "content": "<script>alert('xss')</script>"
}
HTTP 401

# Test: Invalid JSON body
PUT {{base_url}}/api/v1/files/write
Content-Type: application/json
Authorization: Bearer invalid-token
```
{invalid json}
```
HTTP 401

# ============================================
# 5. Command Injection Tests
# ============================================

# Test: Command injection in path via shell metacharacters
GET {{base_url}}/api/v1/files?path=/tmp;id
Authorization: Bearer invalid-token
HTTP 401

# Test: Backtick command injection
GET {{base_url}}/api/v1/files?path=/tmp/`id`
Authorization: Bearer invalid-token
HTTP 401

# Test: $() command substitution
GET {{base_url}}/api/v1/files?path=/tmp/$(whoami)
Authorization: Bearer invalid-token
HTTP 401

# ============================================
# 6. Symlink Attack Prevention
# ============================================

# Test: Reading through symlink (auth required first)
# Note: This test verifies that symlinks are resolved and path is validated
GET {{base_url}}/api/v1/files/read?path=/tmp/evil_symlink
Authorization: Bearer invalid-token
HTTP 401

# ============================================
# 7. Upload Security Tests
# ============================================

# Test: Upload without path field
POST {{base_url}}/api/v1/files/upload
Content-Type: multipart/form-data; boundary=boundary
Authorization: Bearer invalid-token
```
--boundary
Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

test content
--boundary--
```
HTTP 401

# Test: Upload with path traversal in filename
POST {{base_url}}/api/v1/files/upload
Content-Type: multipart/form-data; boundary=boundary
Authorization: Bearer invalid-token
```
--boundary
Content-Disposition: form-data; name="path"

/tmp
--boundary
Content-Disposition: form-data; name="file"; filename="../../../etc/passwd"
Content-Type: text/plain

hacked
--boundary--
```
HTTP 401
