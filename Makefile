# initbox Makefile
# Run 'make help' for available commands

.PHONY: help install setup-hooks dev build start typecheck clean link unlink test inspect validate

# Default target
.DEFAULT_GOAL := help

# Colors for terminal output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

help: ## Show this help message
	@echo "$(CYAN)initbox$(RESET) - CLI tool to install apps and tools based on YAML formulas"
	@echo ""
	@echo "$(GREEN)Available commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Examples:$(RESET)"
	@echo "  make build          # Build the CLI"
	@echo "  make run            # Run interactive wizard"
	@echo "  make run-dev        # Run dev formula"
	@echo "  make inspect-dev    # Inspect dev formula"

# =============================================================================
# Installation & Setup
# =============================================================================

# Git hook script to prevent commits/pushes to main
define GIT_HOOK_SCRIPT
#!/bin/sh
branch="$$(git symbolic-ref HEAD 2>/dev/null)"
if [ "$$branch" = "refs/heads/main" ]; then
    echo "\\033[31mError: Direct commits to main branch are not allowed.\\033[0m"
    echo "Please create a feature branch and submit a pull request."
    echo ""
    echo "  git checkout -b my-feature"
    echo "  git commit -m 'your message'"
    echo "  git push origin my-feature"
    exit 1
fi
endef
export GIT_HOOK_SCRIPT

setup-hooks: ## Install git hooks to protect main branch
	@if [ ! -f .git/hooks/pre-commit ] || ! grep -q "Direct commits to main" .git/hooks/pre-commit 2>/dev/null; then \
		echo "$(CYAN)Installing git pre-commit hook to protect main branch...$(RESET)"; \
		echo "$$GIT_HOOK_SCRIPT" > .git/hooks/pre-commit; \
		chmod +x .git/hooks/pre-commit; \
		echo "$(GREEN)Git hook installed successfully.$(RESET)"; \
	else \
		echo "$(GREEN)Git hook already installed.$(RESET)"; \
	fi

install: setup-hooks ## Install git hooks and npm dependencies
	npm install

link: build ## Build and link globally for development
	npm link

unlink: ## Unlink the global package
	npm unlink -g initbox

# =============================================================================
# Development
# =============================================================================

dev: ## Run in development mode (with vite-node)
	npm run dev

build: ## Build for production
	npm run build

typecheck: ## Run TypeScript type checking
	npm run typecheck

clean: ## Clean build artifacts
	rm -rf dist
	rm -rf node_modules/.vite

rebuild: clean build ## Clean and rebuild

# =============================================================================
# Running the CLI
# =============================================================================

start: ## Run the built CLI (interactive mode)
	npm run start

run: build ## Build and run interactive wizard
	node dist/cli.js

run-help: build ## Show CLI help
	node dist/cli.js --help

run-dev: build ## Run with dev-formula.yaml
	node dist/cli.js install examples/dev-formula.yaml

run-minimal: build ## Run with minimal-formula.yaml
	node dist/cli.js install examples/minimal-formula.yaml

run-dry: build ## Dry run with dev-formula.yaml
	node dist/cli.js install examples/dev-formula.yaml --dry-run

# =============================================================================
# Formula Operations
# =============================================================================

inspect-dev: build ## Inspect dev-formula.yaml
	node dist/cli.js inspect examples/dev-formula.yaml

inspect-minimal: build ## Inspect minimal-formula.yaml
	node dist/cli.js inspect examples/minimal-formula.yaml

validate-dev: build ## Validate dev-formula.yaml
	node dist/cli.js validate examples/dev-formula.yaml

validate-minimal: build ## Validate minimal-formula.yaml
	node dist/cli.js validate examples/minimal-formula.yaml

# =============================================================================
# Quality Assurance
# =============================================================================

check: typecheck build ## Run all checks (typecheck + build)

lint: ## Run linting (placeholder - add your linter)
	@echo "$(YELLOW)No linter configured. Add eslint or similar.$(RESET)"

test: ## Run tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

# =============================================================================
# Documentation
# =============================================================================

docs: ## List all task README files
	@echo "$(CYAN)Task Documentation:$(RESET)"
	@ls -1 src/tasks/*/README.md 2>/dev/null | sed 's/^/  /' || echo "  No README files found"

# =============================================================================
# Utility
# =============================================================================

tasks: ## List all bundled tasks
	@echo "$(CYAN)Bundled Tasks:$(RESET)"
	@ls -1 src/tasks | grep -v "\.ts$$" | sort | sed 's/^/  /'

versions: build ## Check versions of installed tools
	@echo "$(CYAN)Checking installed tool versions...$(RESET)"
	@echo ""
	@echo "git:        $$(git --version 2>/dev/null || echo 'not installed')"
	@echo "gh:         $$(gh --version 2>/dev/null | head -1 || echo 'not installed')"
	@echo "curl:       $$(curl --version 2>/dev/null | head -1 || echo 'not installed')"
	@echo "jq:         $$(jq --version 2>/dev/null || echo 'not installed')"
	@echo "node:       $$(node --version 2>/dev/null || echo 'not installed')"
	@echo "pnpm:       $$(pnpm --version 2>/dev/null || echo 'not installed')"
	@echo "bun:        $$(bun --version 2>/dev/null || echo 'not installed')"
	@echo "python:     $$(python3 --version 2>/dev/null || echo 'not installed')"
	@echo "docker:     $$(docker --version 2>/dev/null || echo 'not installed')"
	@echo "kubectl:    $$(kubectl version --client --short 2>/dev/null || echo 'not installed')"
	@echo "terraform:  $$(terraform --version 2>/dev/null | head -1 || echo 'not installed')"

