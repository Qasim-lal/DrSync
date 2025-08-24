# Development Workflow & Git Guidelines
# DrSync Project

## 🌿 Branch Strategy

### Protected Branches
- **`main`** - Production releases only (protected)
- **`develop`** - Integration branch (protected)

### Working Branches
- **`feature/*`** - All development work
- **`hotfix/*`** - Critical production fixes
- **`release/*`** - Release preparation

## 🔄 Development Process

### 1. Starting New Work
```bash
# Always start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/task-description
# Example: feature/patient-crud-api
# Example: feature/appointment-scheduler
# Example: feature/whatsapp-integration
```

### 2. Working on Feature
```bash
# Make your changes
# Commit frequently with descriptive messages
git add .
git commit -m "feat: implement patient CRUD endpoints"

# Push feature branch
git push -u origin feature/task-description
```

### 3. Completing Feature
1. **Push final changes** to feature branch
2. **Create Pull Request** from `feature/task-description` → `develop`
3. **Code Review** (if applicable)
4. **Merge PR** to develop
5. **Delete feature branch** after merge

### 4. Never Do This ❌
```bash
# NEVER push directly to protected branches
git checkout develop
git commit -m "some changes"
git push origin develop  # ❌ FORBIDDEN

git checkout main
git commit -m "some changes"  
git push origin main     # ❌ FORBIDDEN
```

## 📋 Task-Based Development

### Task Workflow Example
```bash
# Starting TASK-013: Implement database models
git checkout develop
git pull origin develop
git checkout -b feature/database-models-task-013

# Work on the task...
# Multiple commits as you progress
git commit -m "feat: create user model with validation"
git commit -m "feat: add patient model with relationships"
git commit -m "feat: implement appointment model"
git commit -m "test: add model validation tests"

# Push when ready for review
git push -u origin feature/database-models-task-013

# Create PR: feature/database-models-task-013 → develop
# After merge, delete the feature branch
```

## 🎯 Branch Naming Conventions

### Feature Branches
- `feature/task-number-description`
- `feature/patient-management`
- `feature/whatsapp-booking`
- `feature/database-models-task-013`

### Hotfix Branches (for production issues)
- `hotfix/critical-security-fix`
- `hotfix/payment-bug-fix`

### Release Branches
- `release/v1.0.0`
- `release/phase-2-mvp`

## 📝 Commit Message Format

### Format
```
type(scope): description

[optional body]

[optional footer]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code formatting (no logic changes)
- **refactor**: Code refactoring
- **test**: Adding or modifying tests
- **chore**: Maintenance tasks

### Examples
```bash
git commit -m "feat(api): implement patient CRUD endpoints"
git commit -m "fix(ui): resolve icon sizing issues"
git commit -m "docs: update API documentation"
git commit -m "test(auth): add JWT token validation tests"
```

## 🔒 Branch Protection Rules

### Main Branch Protection
- No direct pushes allowed
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to administrators only

### Develop Branch Protection
- No direct pushes allowed
- Require pull request from feature branches
- Require status checks to pass (when CI/CD is set up)
- Allow merge commits

## 🚀 Release Process

### Creating a Release
```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# Finalize version, update docs, etc.
# Test release candidate

# Merge to main for production
git checkout main
git merge release/v1.0.0
git tag v1.0.0
git push origin main --tags

# Merge back to develop
git checkout develop
git merge release/v1.0.0
git push origin develop

# Delete release branch
git branch -d release/v1.0.0
```

## ⚡ Quick Reference

### Daily Development
```bash
# Start work
git checkout develop && git pull origin develop
git checkout -b feature/my-task

# During work
git add . && git commit -m "progress on my task"
git push -u origin feature/my-task

# When done
# 1. Push final changes
# 2. Create PR to develop
# 3. After merge, cleanup
git checkout develop
git pull origin develop
git branch -d feature/my-task
```

### Emergency Hotfix
```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# Fix and test
git commit -m "fix: resolve critical security issue"
git push -u origin hotfix/critical-issue

# PR to main for immediate release
# Then PR to develop to sync changes
```

## 🛡️ Enforcement

This workflow is **mandatory** for all team members and contributors:

1. **No exceptions** for pushing to `main` or `develop`
2. **All work** must go through feature branches
3. **Pull requests required** for all merges
4. **Code review recommended** for complex features
5. **Feature branches deleted** after successful merge

## 📞 Support

If you need help with Git workflow:
1. Check this document first
2. Ask team lead for guidance
3. Use `git status` and `git branch -a` to check current state
4. When in doubt, create a feature branch!

---

**Remember: Feature branches are cheap, mistakes on main/develop are expensive!** 🎯
