# KumoDash Security Testing

This directory contains security tests for the KumoDash API using **Nuclei** (vulnerability scanning) and **Hurl** (API testing).

## Prerequisites

### Install Hurl
```bash
# Using cargo (recommended)
cargo install hurl

# macOS
brew install hurl

# Debian/Ubuntu
apt install hurl
```

### Install Nuclei
```bash
# Using Go
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# macOS
brew install nuclei
```

## Directory Structure

```
tests/security/
├── nuclei/                      # Nuclei vulnerability templates
│   ├── auth-bypass.yaml         # Auth bypass detection
│   ├── auth-path-bypass.yaml    # Auth path validation
│   ├── jwt-none.yaml            # JWT none algorithm attack
│   ├── path-traversal.yaml      # Path traversal detection
│   └── sqli-login.yaml          # SQL injection tests
├── hurl/                        # Hurl API test files
│   ├── auth-security.hurl       # Authentication tests
│   ├── input-validation.hurl    # XSS, SQLi, path traversal
│   ├── setup-security.hurl      # Setup endpoint security
│   └── refresh-token.hurl       # Token refresh tests
├── reports/                     # Generated reports (gitignored)
├── run-security-tests.sh        # API security test runner
├── supply-chain-check.sh        # Supply chain security checker
└── README.md
```

## Usage

### Run All Security Tests
```bash
# Start backend first (default port: 8443)
cd backend && cargo run -- --data-dir ./data --debug &

# Run tests
./tests/security/run-security-tests.sh http://localhost:8443
```

### Run Individual Hurl Tests
```bash
# Single file
hurl --test --variable base_url=http://localhost:8443 tests/security/hurl/auth-security.hurl

# With verbose output
hurl --test --very-verbose --variable base_url=http://localhost:8443 tests/security/hurl/auth-security.hurl
```

### Run Nuclei Scan Only
```bash
nuclei -u http://localhost:8443 -t tests/security/nuclei/ -severity critical,high,medium
```

## Test Coverage

### Authentication Security
- SQL injection in login credentials
- JWT none algorithm attack
- Malformed JWT handling
- Authentication bypass attempts
- Empty/missing Authorization headers

### Input Validation
- XSS in various input fields
- Path traversal attacks
- JSON injection
- Large payload handling
- Special characters (null bytes, Unicode)
- Content-Type validation

### Setup Endpoint
- Token validation security
- Weak password rejection
- Post-initialization hiding (404)

### Token Security
- Refresh token validation
- Expired token handling
- Token replay prevention

## Interpreting Results

### Hurl Output
- `✓ PASSED` - API correctly rejects malicious input
- `✗ FAILED` - Potential vulnerability found

### Nuclei Output
- Findings are saved to `reports/nuclei_report_*.json`
- Critical/High severity issues require immediate attention

## Adding New Tests

### Hurl Test Template
```hurl
# Test description
POST {{base_url}}/api/v1/endpoint
Content-Type: application/json
{
  "field": "malicious-input"
}
HTTP 400
[Asserts]
jsonpath "$.success" == false
```

### Nuclei Template Template
```yaml
id: kumodash-new-test

info:
  name: Test Name
  author: KumoDash Security Team
  severity: high
  description: Test description
  tags: category

http:
  - raw:
      - |
        POST /api/endpoint HTTP/1.1
        Host: {{Hostname}}
        Content-Type: application/json

        {"malicious": "payload"}

    matchers:
      - type: status
        status:
          - 400
```

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Security Tests
  run: |
    ./tests/security/run-security-tests.sh http://localhost:8443
```

## Supply Chain Security

检测依赖漏洞、许可证问题和可疑依赖：

```bash
# 安装工具
cargo install cargo-audit cargo-deny

# 运行供应链检查
./tests/security/supply-chain-check.sh
```

### 检查项目

| 检查类型 | 工具 | 说明 |
|---------|------|------|
| 已知漏洞 | cargo-audit | 检测 RustSec 数据库中的漏洞 |
| 许可证合规 | cargo-deny | 验证依赖许可证是否允许 |
| 依赖来源 | cargo-deny | 确保依赖来自 crates.io |
| Typosquatting | 自定义脚本 | 检测常见拼写错误的包名 |
| 锁文件完整性 | CI workflow | 确保 Cargo.lock 存在 |
| SBOM 生成 | cargo-sbom | 生成软件物料清单 |
| Node.js 漏洞 | pnpm audit | 前端依赖安全审计 |

### GitHub Actions

供应链安全检查会在以下情况自动运行：
- 推送到 main/dev 分支时修改了依赖文件
- 每天 UTC 2:00 定时扫描
- Pull Request 时
