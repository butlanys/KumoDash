# KumoDash Makefile
# Build frontend and backend into a single binary

.PHONY: all clean frontend backend build dev help

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

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite
	cd backend && cargo clean

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

# Help
help:
	@echo "KumoDash Build System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  all       - Build everything (default)"
	@echo "  build     - Build frontend and backend"
	@echo "  frontend  - Build frontend only"
	@echo "  backend   - Build backend (requires frontend)"
	@echo "  dev       - Show development instructions"
	@echo "  clean     - Clean build artifacts"
	@echo "  run       - Build and run the application"
	@echo "  run-debug - Build and run in debug mode"
	@echo "  check     - Run linters and formatters (check mode)"
	@echo "  fmt       - Format code"
	@echo "  help      - Show this help message"
