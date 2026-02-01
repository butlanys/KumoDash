#!/bin/bash
# KumoDash Security Test Runner
# Usage: ./run-security-tests.sh [base_url]

set -e

BASE_URL="${1:-http://localhost:8443}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="$SCRIPT_DIR/reports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  KumoDash Security Test Suite${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "Target: $BASE_URL"
echo ""

# Create reports directory
mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if tools are installed
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        echo "Install with:"
        case "$1" in
            nuclei)
                echo "  go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest"
                ;;
            hurl)
                echo "  cargo install hurl"
                echo "  # or: brew install hurl (macOS)"
                echo "  # or: apt install hurl (Debian/Ubuntu)"
                ;;
        esac
        return 1
    fi
    return 0
}

# Run Hurl tests
run_hurl_tests() {
    echo -e "${YELLOW}[1/2] Running Hurl Security Tests...${NC}"
    
    if ! check_tool hurl; then
        echo -e "${RED}Skipping Hurl tests${NC}"
        return 1
    fi
    
    HURL_REPORT="$REPORT_DIR/hurl_report_$TIMESTAMP.html"
    HURL_JSON="$REPORT_DIR/hurl_report_$TIMESTAMP.json"
    
    cd "$SCRIPT_DIR/hurl"
    
    # Run all hurl files
    local failed=0
    for hurl_file in *.hurl; do
        echo -e "  Testing: $hurl_file"
        if hurl --test --variable "base_url=$BASE_URL" "$hurl_file" 2>&1; then
            echo -e "    ${GREEN}✓ PASSED${NC}"
        else
            echo -e "    ${RED}✗ FAILED${NC}"
            failed=1
        fi
    done
    
    # Generate combined report
    hurl --test --variable "base_url=$BASE_URL" \
        --report-html "$REPORT_DIR/hurl_html_$TIMESTAMP" \
        --report-json "$HURL_JSON" \
        *.hurl 2>&1 || true
    
    echo -e "  Report: $HURL_JSON"
    return $failed
}

# Run Nuclei scan
run_nuclei_scan() {
    echo ""
    echo -e "${YELLOW}[2/2] Running Nuclei Vulnerability Scan...${NC}"
    
    if ! check_tool nuclei; then
        echo -e "${RED}Skipping Nuclei scan${NC}"
        return 1
    fi
    
    NUCLEI_REPORT="$REPORT_DIR/nuclei_report_$TIMESTAMP.json"
    NUCLEI_MD="$REPORT_DIR/nuclei_report_$TIMESTAMP.md"
    
    # Run nuclei with custom templates
    nuclei -u "$BASE_URL" \
        -t "$SCRIPT_DIR/nuclei/" \
        -j -o "$NUCLEI_REPORT" \
        -severity critical,high,medium \
        -stats \
        2>&1
    
    # Check results - our templates test that security is WORKING
    # A match means the security check passed (e.g., SQLi was rejected)
    if [ -s "$NUCLEI_REPORT" ]; then
        local match_count=$(wc -l < "$NUCLEI_REPORT")
        echo -e "${GREEN}✓ Security tests passed: $match_count checks verified${NC}"
        
        # Generate markdown report
        echo "# Nuclei Security Test Report" > "$NUCLEI_MD"
        echo "Generated: $(date)" >> "$NUCLEI_MD"
        echo "" >> "$NUCLEI_MD"
        echo "## Verified Security Controls" >> "$NUCLEI_MD"
        echo "" >> "$NUCLEI_MD"
        cat "$NUCLEI_REPORT" | jq -r '. | "### \(.info.name)\n- **Status**: ✓ Passed\n- **URL**: \(.["matched-at"] // .host)\n- **Description**: \(.info.description)\n"' >> "$NUCLEI_MD" 2>/dev/null || true
        
        return 0
    else
        echo -e "${YELLOW}⚠ No security tests matched - check template configuration${NC}"
        return 1
    fi
}

# Main execution
echo ""
hurl_result=0
nuclei_result=0

run_hurl_tests || hurl_result=1
run_nuclei_scan || nuclei_result=1

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"

if [ $hurl_result -eq 0 ]; then
    echo -e "Hurl Tests:   ${GREEN}PASSED${NC}"
else
    echo -e "Hurl Tests:   ${RED}FAILED${NC}"
fi

if [ $nuclei_result -eq 0 ]; then
    echo -e "Nuclei Scan:  ${GREEN}PASSED${NC}"
else
    echo -e "Nuclei Scan:  ${RED}ISSUES FOUND${NC}"
fi

echo ""
echo "Reports saved to: $REPORT_DIR"
echo ""

exit $((hurl_result + nuclei_result))
