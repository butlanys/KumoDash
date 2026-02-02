# KumoDash Makefile
# Build frontend and backend into a single binary

.PHONY: all clean clean-all frontend backend build dev test test-security help

# Default target
all: build

# Build everything
build: frontend backend
	@echo "Build complete! Binary at: backend/target/release/kumadash"

# Build frontend
frontend:
	@echo "Building frontend..."
	cd frontend && pnpm install && pnpm build

# Build backend (includes embedded frontend)
backend: frontend
	@echo "Building backend..."
	cd backend && cargo build --release

# Development mode
dev:
	@echo "Starting development servers..."
	@echo "Run 'cd frontend && pnpm dev' in one terminal"
	@echo "Run 'cd backend && cargo run -- --debug --data-dir ./data' in another terminal"

# Clean build artifacts (keeps dependencies)
clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite
	cd backend && cargo clean

# Clean everything including dependencies
clean-all:
	@echo "Cleaning all artifacts and dependencies..."
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	cd backend && cargo clean
	@echo "Clean complete. Run 'make build' to reinstall dependencies."

# Run the built binary
run: build
	cd backend && ./target/release/kumadash --data-dir ./data

# Run in debug mode
run-debug: build
	cd backend && ./target/release/kumadash --debug --data-dir ./data

# Check code quality
check:
	@echo "Checking frontend..."
	cd frontend && pnpm lint
	@echo "Checking backend..."
	cd backend && cargo clippy -- -D warnings
	cd backend && cargo fmt --check

# Format code
fmt:
	cd frontend && pnpm lint --fix || true
	cd backend && cargo fmt

# Run backend unit tests
test:
	@echo "Running backend tests..."
	cd backend && cargo test
	@echo ""
	@echo "Tests complete."

# Run API security tests (requires running server)
test-security:
	@echo "Running API security tests..."
	@echo "Note: Server must be running at https://localhost:8443"
	@echo ""
	cd tests/security && ./run-security-tests.sh https://localhost:8443

# Run all tests
test-all: test test-security

# Help
help:
	@echo "KumoDash Build System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Build Targets:"
	@echo "  all          - Build everything (default)"
	@echo "  build        - Build frontend and backend"
	@echo "  frontend     - Build frontend only"
	@echo "  backend      - Build backend (requires frontend)"
	@echo ""
	@echo "Run Targets:"
	@echo "  dev          - Show development instructions"
	@echo "  run          - Build and run the application"
	@echo "  run-debug    - Build and run in debug mode"
	@echo ""
	@echo "Test Targets:"
	@echo "  test         - Run backend unit tests"
	@echo "  test-security- Run API security tests (requires running server)"
	@echo "  test-all     - Run all tests"
	@echo ""
	@echo "Clean Targets:"
	@echo "  clean        - Clean build artifacts (keeps dependencies)"
	@echo "  clean-all    - Clean everything including node_modules and cargo cache"
	@echo ""
	@echo "Code Quality:"
	@echo "  check        - Run linters and formatters (check mode)"
	@echo "  fmt          - Format code"
	@echo "  help         - Show this help message"
