#!/usr/bin/env bash
# ==============================================================================
# AuraBI Frontend Test & Verification Suite
#
# Runs:
#  1. TypeScript typecheck (npx tsc --noEmit)
#  2. Unit and integration test suite (npx vitest run)
#  3. Production build (npm run build)
#
# Flags:
#  --e2e        Also run Playwright end-to-end tests
#  --skip-build Skip the production build step
#  --help       Show this help message
# ==============================================================================

set -euo pipefail

# --- Color definitions ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

RUN_E2E=false
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --e2e)
      RUN_E2E=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --help|-h)
      echo "Usage: ./test_suite.sh [--e2e] [--skip-build]"
      echo ""
      echo "Options:"
      echo "  --e2e         Include Playwright end-to-end browser tests"
      echo "  --skip-build  Skip the production Vite build step"
      echo "  --help, -h    Display this help message"
      exit 0
      ;;
    *)
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

START_TOTAL=$(date +%s)

print_header() {
  echo -e "\n${BOLD}${CYAN}======================================================================${NC}"
  echo -e "${BOLD}${CYAN}  $1${NC}"
  echo -e "${BOLD}${CYAN}======================================================================${NC}\n"
}

STATUS_TSC="PENDING"
STATUS_VITEST="PENDING"
STATUS_BUILD="PENDING"
STATUS_E2E="SKIPPED"

# --- 1. TypeScript Static Typecheck ---
print_header "Step 1/3: TypeScript Typecheck (npx tsc --noEmit)"
START_STEP=$(date +%s)

if npx tsc --noEmit; then
  ELAPSED=$(( $(date +%s) - START_STEP ))
  STATUS_TSC="PASSED (${ELAPSED}s)"
  echo -e "\n${GREEN}✔ TypeScript compilation check passed with 0 errors.${NC}"
else
  STATUS_TSC="FAILED"
  echo -e "\n${RED}✘ TypeScript compilation failed.${NC}"
  exit 1
fi

# --- 2. Vitest Test Suite (Unit + Integration) ---
print_header "Step 2/3: Unit & Integration Test Suite (npx vitest run)"
START_STEP=$(date +%s)

if npx vitest run; then
  ELAPSED=$(( $(date +%s) - START_STEP ))
  STATUS_VITEST="PASSED (${ELAPSED}s)"
  echo -e "\n${GREEN}✔ Vitest test suite passed.${NC}"
else
  STATUS_VITEST="FAILED"
  echo -e "\n${RED}✘ Vitest test suite encountered failures.${NC}"
  exit 1
fi

# --- 3. Production Build ---
if [ "$SKIP_BUILD" = false ]; then
  print_header "Step 3/3: Production Build (npm run build)"
  START_STEP=$(date +%s)

  if npm run build; then
    ELAPSED=$(( $(date +%s) - START_STEP ))
    STATUS_BUILD="PASSED (${ELAPSED}s)"
    echo -e "\n${GREEN}✔ Production build succeeded.${NC}"
  else
    STATUS_BUILD="FAILED"
    echo -e "\n${RED}✘ Production build failed.${NC}"
    exit 1
  fi
else
  STATUS_BUILD="SKIPPED"
fi

# --- Optional 4. Playwright E2E Tests ---
if [ "$RUN_E2E" = true ]; then
  print_header "Optional: Playwright E2E Tests (npx playwright test)"
  START_STEP=$(date +%s)

  if npx playwright test; then
    ELAPSED=$(( $(date +%s) - START_STEP ))
    STATUS_E2E="PASSED (${ELAPSED}s)"
    echo -e "\n${GREEN}✔ End-to-end tests passed.${NC}"
  else
    STATUS_E2E="FAILED"
    echo -e "\n${RED}✘ End-to-end tests failed.${NC}"
    exit 1
  fi
fi

# --- Final Summary Report ---
TOTAL_ELAPSED=$(( $(date +%s) - START_TOTAL ))

echo -e "\n${BOLD}${BLUE}======================================================================${NC}"
echo -e "${BOLD}${BLUE}  Test Suite Verification Summary (${TOTAL_ELAPSED}s total)${NC}"
echo -e "${BOLD}${BLUE}======================================================================${NC}"
echo -e "  1. TypeScript Typecheck (tsc --noEmit) : ${GREEN}${STATUS_TSC}${NC}"
echo -e "  2. Test Suite (Vitest)                 : ${GREEN}${STATUS_VITEST}${NC}"
if [ "$STATUS_BUILD" = "SKIPPED" ]; then
  echo -e "  3. Production Build (vite build)       : ${YELLOW}${STATUS_BUILD}${NC}"
else
  echo -e "  3. Production Build (vite build)       : ${GREEN}${STATUS_BUILD}${NC}"
fi
if [ "$RUN_E2E" = true ]; then
  echo -e "  4. E2E Tests (Playwright)              : ${GREEN}${STATUS_E2E}${NC}"
fi
echo -e "${BOLD}${BLUE}======================================================================${NC}"
echo -e "${GREEN}${BOLD}✔ All checks completed successfully!${NC}\n"

