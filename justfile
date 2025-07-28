# Development setup
setup:
  pixi install
  pnpm install
  pnpm dev:prepare

# Install dependencies
install:
  pnpm install

# Prepare development environment
prepare:
  pnpm dev:prepare

# Run development server
dev:
  pnpm dev

# Build playground
build:
  pnpm dev:build

# Run linting
lint:
  pnpm lint

# Run tests
test:
  pnpm test

# Run tests in watch mode
test-watch:
  pnpm test:watch

# Release new version
release:
  pnpm release

# Upgrade dependencies
upgrade-deps:
  bunx --bun taze -iuw major
