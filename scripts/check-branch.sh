#!/bin/bash
# Git Branch Protection Helper Script
# Prevents accidental pushes to main or develop branches

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current branch
current_branch=$(git branch --show-current)

# Function to check if we're on a protected branch
check_protected_branch() {
    if [ "$current_branch" = "main" ] || [ "$current_branch" = "develop" ]; then
        echo -e "${RED}❌ ERROR: You are on a protected branch: '$current_branch'${NC}"
        echo -e "${YELLOW}⚠️  NEVER push directly to 'main' or 'develop' branches!${NC}"
        echo ""
        echo -e "${BLUE}📋 Proper workflow:${NC}"
        echo "1. git checkout develop"
        echo "2. git pull origin develop"
        echo "3. git checkout -b feature/your-task-name"
        echo "4. # Make your changes"
        echo "5. git push -u origin feature/your-task-name"
        echo "6. # Create PR: feature/your-task-name → develop"
        echo ""
        echo -e "${GREEN}✅ Create a feature branch first!${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Good! You're on feature branch: '$current_branch'${NC}"
        echo -e "${BLUE}💡 Remember to create a PR to 'develop' when ready!${NC}"
    fi
}

# Function to create a new feature branch
create_feature_branch() {
    echo -e "${BLUE}🌿 Creating a new feature branch...${NC}"
    echo ""
    echo "Enter a descriptive name for your feature (e.g., 'patient-crud-api'):"
    read -p "feature/" feature_name
    
    if [ -z "$feature_name" ]; then
        echo -e "${RED}❌ Feature name cannot be empty!${NC}"
        exit 1
    fi
    
    branch_name="feature/$feature_name"
    
    echo -e "${BLUE}📋 Creating branch: $branch_name${NC}"
    
    # Switch to develop and pull latest
    git checkout develop
    git pull origin develop
    
    # Create and switch to new feature branch
    git checkout -b "$branch_name"
    
    echo -e "${GREEN}✅ Successfully created feature branch: $branch_name${NC}"
    echo -e "${YELLOW}💡 You can now make your changes and commit them!${NC}"
    echo ""
    echo -e "${BLUE}When ready to push:${NC}"
    echo "git push -u origin $branch_name"
}

# Function to show current status
show_status() {
    echo -e "${BLUE}📊 Git Status:${NC}"
    echo "Current branch: $current_branch"
    echo ""
    
    # Show if there are any changes
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
        git status --short
    else
        echo -e "${GREEN}✅ Working directory clean${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📋 Available commands:${NC}"
    echo "./scripts/check-branch.sh check    # Check current branch"
    echo "./scripts/check-branch.sh new      # Create new feature branch"
    echo "./scripts/check-branch.sh status   # Show detailed status"
}

# Main script logic
case "${1:-check}" in
    "check")
        check_protected_branch
        ;;
    "new")
        create_feature_branch
        ;;
    "status")
        show_status
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Usage: ./scripts/check-branch.sh [check|new|status]"
        exit 1
        ;;
esac
