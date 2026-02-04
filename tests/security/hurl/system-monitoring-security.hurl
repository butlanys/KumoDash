# KumoDash API Security Tests - System Monitoring & systemd
# Run: hurl --test --variable base_url=http://localhost:8443 system-monitoring-security.hurl

# ============================================
# 1. Metrics/Alerts Authentication
# ============================================

GET {{base_url}}/api/v1/system/metrics
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

GET {{base_url}}/api/v1/system/alerts
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

# ============================================
# 2. systemd Authentication
# ============================================

GET {{base_url}}/api/v1/systemd/units
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

GET {{base_url}}/api/v1/systemd/units/ssh.service/logs
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

POST {{base_url}}/api/v1/systemd/units/ssh.service/restart
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

GET {{base_url}}/api/v1/systemd/units/ssh.service/file
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

PUT {{base_url}}/api/v1/systemd/units/ssh.service/file
Content-Type: application/json
{
  "content": "[Unit]\\nDescription=Test"
}
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"

POST {{base_url}}/api/v1/systemd/units
Content-Type: application/json
{
  "name": "example.service",
  "content": "[Unit]\\nDescription=Example"
}
HTTP 401
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error.code" == "AUTH_TOKEN_INVALID"
