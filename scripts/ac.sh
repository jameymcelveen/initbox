#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# =============================================================================
# Stage all changes
# =============================================================================

echo -e "${CYAN}Staging all changes...${NC}"
git add .

# Check if there are any staged changes
if git diff --cached --quiet; then
    echo -e "${YELLOW}No changes to commit.${NC}"
    exit 0
fi

# =============================================================================
# Generate commit message from staged changes
# =============================================================================

echo -e "${CYAN}Analyzing staged changes...${NC}"

# Get list of changed files with their status
CHANGES=$(git diff --cached --name-status)

# Count different types of changes
ADDED=$(echo "$CHANGES" | grep -c "^A" || true)
MODIFIED=$(echo "$CHANGES" | grep -c "^M" || true)
DELETED=$(echo "$CHANGES" | grep -c "^D" || true)
RENAMED=$(echo "$CHANGES" | grep -c "^R" || true)

# Get the list of files (just names, for context)
FILES=$(git diff --cached --name-only)
FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')

# Identify primary directories/areas affected
DIRS=$(echo "$FILES" | xargs -I {} dirname {} | sort -u | head -3)

# Build summary parts
PARTS=()
[ "$ADDED" -gt 0 ] && PARTS+=("add $ADDED file(s)")
[ "$MODIFIED" -gt 0 ] && PARTS+=("update $MODIFIED file(s)")
[ "$DELETED" -gt 0 ] && PARTS+=("remove $DELETED file(s)")
[ "$RENAMED" -gt 0 ] && PARTS+=("rename $RENAMED file(s)")

# Join parts with commas
MESSAGE=$(IFS=', '; echo "${PARTS[*]}")

# Add context about affected areas
if [ -n "$DIRS" ]; then
    # Get unique top-level directories
    TOP_DIRS=$(echo "$FILES" | cut -d'/' -f1 | sort -u | head -3 | tr '\n' ', ' | sed 's/,$//' | sed 's/,/, /g')
    if [ -n "$TOP_DIRS" ]; then
        MESSAGE="$MESSAGE in $TOP_DIRS"
    fi
fi

# Capitalize first letter
MESSAGE="$(echo "${MESSAGE:0:1}" | tr '[:lower:]' '[:upper:]')${MESSAGE:1}"

echo -e "${CYAN}Commit message: ${NC}${MESSAGE}"

# =============================================================================
# Show what will be committed
# =============================================================================

echo -e "\n${CYAN}Changes to be committed:${NC}"
git diff --cached --stat

# =============================================================================
# Commit
# =============================================================================

echo -e "\n${CYAN}Committing...${NC}"
git commit -m "$MESSAGE"

echo -e "\n${GREEN}✓ Changes committed successfully!${NC}"
echo -e "${GREEN}Message: ${NC}${MESSAGE}"

