#!/bin/bash
# KumoDash 供应链安全检查脚本
# 检测依赖漏洞、许可证问题和可疑依赖

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
REPORT_DIR="$SCRIPT_DIR/reports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  KumoDash Supply Chain Security Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORT_DIR/supply_chain_$TIMESTAMP.md"

echo "# Supply Chain Security Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

total_issues=0

# ============================================
# 1. Rust Backend Security Checks
# ============================================

echo -e "${YELLOW}[1/5] Checking Rust dependencies...${NC}"
echo "## Rust Backend" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

cd "$BACKEND_DIR"

# Check if cargo-audit is installed
if command -v cargo-audit &> /dev/null; then
    echo "  Running cargo-audit..."
    echo "### cargo-audit (Known Vulnerabilities)" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    if cargo audit 2>&1 | tee -a "$REPORT_FILE"; then
        echo -e "  ${GREEN}✓ No known vulnerabilities${NC}"
    else
        echo -e "  ${RED}✗ Vulnerabilities found!${NC}"
        ((total_issues++))
    fi
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    echo -e "  ${YELLOW}⚠ cargo-audit not installed. Install with: cargo install cargo-audit${NC}"
    echo "### cargo-audit: Not installed" >> "$REPORT_FILE"
fi

# Check if cargo-deny is installed
if command -v cargo-deny &> /dev/null; then
    echo "  Running cargo-deny..."
    echo "### cargo-deny (License & Source Check)" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    if cargo deny check 2>&1 | tee -a "$REPORT_FILE"; then
        echo -e "  ${GREEN}✓ All dependency policies passed${NC}"
    else
        echo -e "  ${YELLOW}⚠ Policy warnings/errors found${NC}"
        ((total_issues++))
    fi
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    echo -e "  ${YELLOW}⚠ cargo-deny not installed. Install with: cargo install cargo-deny${NC}"
    echo "### cargo-deny: Not installed" >> "$REPORT_FILE"
fi

# Check Cargo.lock exists and is committed
if [ -f "Cargo.lock" ]; then
    echo -e "  ${GREEN}✓ Cargo.lock exists${NC}"
else
    echo -e "  ${RED}✗ Cargo.lock missing - supply chain risk!${NC}"
    ((total_issues++))
fi

# ============================================
# 2. Frontend Security Checks
# ============================================

echo ""
echo -e "${YELLOW}[2/5] Checking Node.js dependencies...${NC}"
echo "## Frontend (Node.js)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

cd "$FRONTEND_DIR"

# Check pnpm-lock.yaml exists
if [ -f "pnpm-lock.yaml" ]; then
    echo -e "  ${GREEN}✓ pnpm-lock.yaml exists${NC}"
else
    echo -e "  ${RED}✗ pnpm-lock.yaml missing - supply chain risk!${NC}"
    ((total_issues++))
fi

# Run pnpm audit
if command -v pnpm &> /dev/null; then
    echo "  Running pnpm audit..."
    echo "### pnpm audit" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    if pnpm audit 2>&1 | tee -a "$REPORT_FILE"; then
        echo -e "  ${GREEN}✓ No known vulnerabilities${NC}"
    else
        echo -e "  ${YELLOW}⚠ Audit warnings found${NC}"
    fi
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    echo -e "  ${YELLOW}⚠ pnpm not installed${NC}"
fi

# ============================================
# 3. Check for Typosquatting
# ============================================

echo ""
echo -e "${YELLOW}[3/5] Checking for potential typosquatting...${NC}"
echo "## Typosquatting Check" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Common typosquatting patterns to check in Cargo.toml
SUSPICIOUS_PATTERNS=(
    "axurn"      # typo for axum
    "tockio"     # typo for tokio
    "serda"      # typo for serde
    "reqwest"    # often confused (this is correct)
    "sqlx-"      # check for fake sqlx variants
)

cd "$BACKEND_DIR"
echo "Checking Cargo.toml for suspicious dependencies..."
suspicious_found=0
for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
    if grep -qi "^${pattern}" Cargo.toml 2>/dev/null; then
        echo -e "  ${RED}⚠ Suspicious dependency pattern: $pattern${NC}"
        ((suspicious_found++))
    fi
done

if [ $suspicious_found -eq 0 ]; then
    echo -e "  ${GREEN}✓ No obvious typosquatting detected${NC}"
    echo "✓ No suspicious patterns found" >> "$REPORT_FILE"
else
    echo "⚠ $suspicious_found suspicious patterns found" >> "$REPORT_FILE"
    ((total_issues++))
fi
echo "" >> "$REPORT_FILE"

# ============================================
# 4. Check dependency freshness
# ============================================

echo ""
echo -e "${YELLOW}[4/5] Checking dependency freshness...${NC}"
echo "## Outdated Dependencies" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

cd "$BACKEND_DIR"
if command -v cargo-outdated &> /dev/null; then
    echo "### Rust (cargo-outdated)" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    cargo outdated 2>&1 | head -30 | tee -a "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
else
    echo -e "  ${YELLOW}⚠ cargo-outdated not installed. Install with: cargo install cargo-outdated${NC}"
    echo "### cargo-outdated: Not installed" >> "$REPORT_FILE"
fi

cd "$FRONTEND_DIR"
if command -v pnpm &> /dev/null; then
    echo "" >> "$REPORT_FILE"
    echo "### Node.js (pnpm outdated)" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    pnpm outdated 2>&1 | head -30 | tee -a "$REPORT_FILE" || true
    echo '```' >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# ============================================
# 5. Generate SBOM
# ============================================

echo ""
echo -e "${YELLOW}[5/5] Generating Software Bill of Materials (SBOM)...${NC}"
echo "## SBOM Generation" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

cd "$BACKEND_DIR"
if command -v cargo-sbom &> /dev/null; then
    cargo sbom > "$REPORT_DIR/sbom_rust_$TIMESTAMP.json" 2>/dev/null
    echo -e "  ${GREEN}✓ Rust SBOM generated: sbom_rust_$TIMESTAMP.json${NC}"
    echo "✓ Rust SBOM: sbom_rust_$TIMESTAMP.json" >> "$REPORT_FILE"
else
    echo -e "  ${YELLOW}⚠ cargo-sbom not installed. Install with: cargo install cargo-sbom${NC}"
    
    # Fallback: generate basic dependency list
    echo "  Generating basic dependency list..."
    cargo tree --prefix none > "$REPORT_DIR/deps_rust_$TIMESTAMP.txt" 2>/dev/null
    echo -e "  ${GREEN}✓ Dependency list: deps_rust_$TIMESTAMP.txt${NC}"
    echo "✓ Dependency list: deps_rust_$TIMESTAMP.txt" >> "$REPORT_FILE"
fi

# ============================================
# Summary
# ============================================

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"

echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"

if [ $total_issues -eq 0 ]; then
    echo -e "${GREEN}✓ No critical supply chain issues found${NC}"
    echo "✓ No critical issues found" >> "$REPORT_FILE"
else
    echo -e "${RED}⚠ Found $total_issues potential issues - review report${NC}"
    echo "⚠ Found $total_issues potential issues" >> "$REPORT_FILE"
fi

echo ""
echo "Report saved to: $REPORT_FILE"
echo ""

echo "### Recommended Tools" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Install missing tools for complete coverage:" >> "$REPORT_FILE"
echo '```bash' >> "$REPORT_FILE"
echo "cargo install cargo-audit cargo-deny cargo-outdated cargo-sbom" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

exit $total_issues
