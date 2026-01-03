#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# =============================================================================
# Pre-flight checks
# =============================================================================

echo -e "${CYAN}Checking for uncommitted changes...${NC}"

# Check for staged changes
if ! git diff --cached --quiet; then
    echo -e "${RED}Error: You have staged changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Check for unstaged changes
if ! git diff --quiet; then
    echo -e "${RED}Error: You have unstaged changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Check for untracked files (that are not ignored)
if [ -n "$(git ls-files --others --exclude-standard)" ]; then
    echo -e "${RED}Error: You have untracked files. Please add, commit, or ignore them first.${NC}"
    git ls-files --others --exclude-standard
    exit 1
fi

echo -e "${GREEN}Working directory is clean.${NC}"

# =============================================================================
# Get version info
# =============================================================================

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${CYAN}Current version: v${CURRENT_VERSION}${NC}"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Bump minor version, reset patch
NEW_MINOR=$((MINOR + 1))
NEW_VERSION="${MAJOR}.${NEW_MINOR}.0"
NEW_TAG="v${NEW_VERSION}"

echo -e "${CYAN}New version: ${NEW_TAG}${NC}"

# =============================================================================
# Get changelog entries
# =============================================================================

# Get the last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
    echo -e "${YELLOW}No previous tags found. Including all commits.${NC}"
    COMMITS=$(git log --pretty=format:"%s" --no-merges)
else
    echo -e "${CYAN}Getting changes since ${LAST_TAG}...${NC}"
    COMMITS=$(git log "${LAST_TAG}"..HEAD --pretty=format:"%s" --no-merges)
fi

# Filter out wip and tag commits, format as bullet list
CHANGES=$(echo "$COMMITS" | grep -viE '^(wip|tag|chore\(release\))' | sed 's/^/- /' || echo "- No significant changes")

if [ -z "$CHANGES" ] || [ "$CHANGES" = "- " ]; then
    CHANGES="- Minor updates and improvements"
fi

echo -e "${CYAN}Changes:${NC}"
echo "$CHANGES"

# =============================================================================
# Create branch for release
# =============================================================================

BRANCH_NAME="release/${NEW_TAG}"
echo -e "${CYAN}Creating branch ${BRANCH_NAME}...${NC}"

git checkout -b "$BRANCH_NAME"

# =============================================================================
# Update package.json version
# =============================================================================

echo -e "${CYAN}Updating package.json version...${NC}"
npm version "$NEW_VERSION" --no-git-tag-version

# =============================================================================
# Update CHANGELOG.md
# =============================================================================

echo -e "${CYAN}Updating CHANGELOG.md...${NC}"

# Get current date and time
DATE_TIME=$(date +"%Y %m %d %H:%M")

# Create the new changelog entry
CHANGELOG_ENTRY="${NEW_TAG}

---

${DATE_TIME}

${CHANGES}"

# Prepend to CHANGELOG.md
if [ -f CHANGELOG.md ]; then
    # Create temp file with new entry + existing content
    {
        echo "$CHANGELOG_ENTRY"
        echo ""
        cat CHANGELOG.md
    } > CHANGELOG.tmp
    mv CHANGELOG.tmp CHANGELOG.md
else
    echo "$CHANGELOG_ENTRY" > CHANGELOG.md
fi

# =============================================================================
# Commit and push
# =============================================================================

echo -e "${CYAN}Committing changes...${NC}"
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): ${NEW_TAG}"

echo -e "${CYAN}Creating tag ${NEW_TAG}...${NC}"
git tag "$NEW_TAG"

echo -e "${CYAN}Pushing branch and tag...${NC}"
git push -u origin "$BRANCH_NAME"
git push origin "$NEW_TAG"

# =============================================================================
# Create Pull Request
# =============================================================================

echo -e "${CYAN}Creating pull request...${NC}"

PR_TITLE="Update ${NEW_TAG}"
PR_BODY="## Changes in ${NEW_TAG}

${CHANGES}"

gh pr create \
    --title "$PR_TITLE" \
    --body "$PR_BODY" \
    --base main \
    --head "$BRANCH_NAME"

echo -e "${GREEN}✓ Release PR created successfully!${NC}"
echo -e "${GREEN}  Version: ${NEW_TAG}${NC}"
echo -e "${GREEN}  Branch: ${BRANCH_NAME}${NC}"

