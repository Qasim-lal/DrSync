# Repository Cleanup Guide
**Date:** October 11, 2025  
**Purpose:** Maintain a clean Git repository by identifying and removing unnecessary files

---

## ✅ Already Completed Cleanup

### Files Removed (October 11, 2025)
- ✅ `create-org.sql` - Temporary test SQL file

### .gitignore Updated
Added the following patterns to prevent tracking temporary files:
```
# SQL test/temp files (exclude migration files)
create-org.sql
create_*.sql
query_*.sql
test_*.sql
*_test.sql
*_temp.sql
debug_*.sql
invitation_token.txt
*.token
```

---

## 🔍 Files Currently Tracked (Review Needed)

### Development/Test Files (Consider Removing)
These files are currently in the repository but might not be needed:

1. **Test/Debug Files:**
   - `backend/TEST_IMPLEMENTATION_FINAL_SUMMARY.md` - Test summary (might be temporary)
   - `backend/tests/health-check-debug.test.ts` - Debug test file
   - `frontend/src/app/pwa-debug/page.tsx` - PWA debug page

2. **Documentation Files (Keep These):**
   - `docs/TASK-036A-006_TEST_MESSAGE_COMPLETE.md` - Legitimate documentation ✅
   - `docs/WHATSAPP_WIZARD_E2E_TEST_REPORT.md` - Test report documentation ✅

### Migration Files (Keep These) ✅
All files under `backend/prisma/migrations/` should be kept - these are essential:
- `backend/migrations/init.sql`
- `backend/prisma/migrations/*/migration.sql`

---

## 🧹 How to Clean Up Repository

### Step 1: Identify Unnecessary Files
```powershell
# Find all SQL files (excluding migrations)
git ls-files | Select-String -Pattern '\.sql$' | Where-Object { $_ -notmatch 'migrations' }

# Find debug/test files
git ls-files | Select-String -Pattern 'debug|TEST_|temp|_test'

# Find token/credential files
git ls-files | Select-String -Pattern 'token|credential|secret|password'
```

### Step 2: Review Files Before Removing
```powershell
# Check file history to see if it's temporary
git log --oneline --follow -- filename.ext

# See when file was last modified
git log -1 --format="%ai" -- filename.ext
```

### Step 3: Remove Unnecessary Files
```powershell
# Remove from git tracking (keeps local copy)
git rm --cached filename.ext

# Remove from git tracking (deletes local copy)
git rm filename.ext
```

### Step 4: Update .gitignore
Add patterns to prevent re-tracking:
```
# Add patterns to .gitignore
echo "pattern_to_ignore" >> .gitignore
```

### Step 5: Commit and Push
```powershell
git add .gitignore
git commit -m "chore: Remove unnecessary files from repository"
git push origin branch-name
```

---

## 📋 Recommended .gitignore Patterns

### Already Added ✅
- SQL test files (`create_*.sql`, `query_*.sql`, etc.)
- Token files (`*.token`, `invitation_token.txt`)
- Database files (`*.sqlite`, `*.db`)

### Consider Adding
If you encounter these file types, add to .gitignore:

```gitignore
# Development artifacts
*.local.sql
*.dump
*.backup.sql

# IDE specific
.vscode/settings.json
.idea/workspace.xml

# Build artifacts
*.map
*.bundle.js

# Test coverage
coverage/
.nyc_output/

# Temporary files
*.swp
*.swo
*~
```

---

## 🚫 Files to NEVER Commit

### Sensitive Data
- ❌ `.env` files with real credentials
- ❌ `*.key` or `*.pem` files (SSL certificates, private keys)
- ❌ Database dumps with user data
- ❌ API tokens or credentials
- ❌ `secrets.json` or similar

### Large Binary Files
- ❌ Large images (use a CDN instead)
- ❌ Video files
- ❌ Compiled binaries (unless absolutely necessary)
- ❌ Database files
- ❌ Log files

### Generated Files
- ❌ `node_modules/` (always install fresh)
- ❌ `dist/` or `build/` directories
- ❌ `.next/` cache directories
- ❌ Coverage reports

---

## 🔄 Regular Maintenance Checklist

### Weekly Check
- [ ] Review untracked files: `git status`
- [ ] Check for large files: `git ls-files | xargs du -h | sort -h | tail -20`
- [ ] Verify .gitignore is working

### Monthly Check
- [ ] Review all tracked files: `git ls-files | wc -l`
- [ ] Check for files that match ignore patterns: `git check-ignore -v *`
- [ ] Review and update .gitignore patterns

### Before Each Release
- [ ] Remove debug/test files
- [ ] Verify no sensitive data is committed
- [ ] Check repository size: `git count-objects -vH`
- [ ] Clean up unused branches

---

## 🛠️ Useful Git Commands

### Check Repository Health
```powershell
# Count total files in repository
git ls-files | Measure-Object -Line

# Find largest files
git ls-files | xargs du -h | sort -h | Select-Object -Last 20

# Check repository size
git count-objects -vH

# List all tracked files
git ls-files
```

### Find Specific File Types
```powershell
# Find all SQL files
git ls-files '*.sql'

# Find all test files
git ls-files '*test*'

# Find files with specific pattern
git ls-files | Select-String -Pattern 'pattern'
```

### Clean Up Local Repository
```powershell
# Remove untracked files (dry run)
git clean -n

# Remove untracked files (for real)
git clean -f

# Remove untracked directories
git clean -fd

# Remove ignored files too
git clean -fdx
```

---

## 📊 Current Repository Status

### Files in Repository
- **Total tracked files:** Run `git ls-files | Measure-Object -Line`
- **Repository size:** Run `git count-objects -vH`

### Clean Status (October 11, 2025)
- ✅ Working tree clean
- ✅ Temporary SQL files ignored
- ✅ Token files ignored
- ✅ No sensitive data committed

---

## 🎯 Best Practices

### Before Committing
1. **Review changes:** `git status` and `git diff`
2. **Check for secrets:** Look for passwords, tokens, keys
3. **Verify .gitignore:** Ensure temporary files won't be committed
4. **Use meaningful commits:** Clear, descriptive commit messages

### During Development
1. **Use .env files:** Never commit credentials
2. **Keep test files separate:** Don't commit temporary test files
3. **Clean as you go:** Remove unused files regularly
4. **Update .gitignore:** Add patterns as soon as you create temporary files

### Repository Organization
1. **Documentation in /docs:** Keep all docs in one place ✅
2. **Tests in /tests:** Separate test files from source code ✅
3. **Migrations tracked:** Always commit database migrations ✅
4. **Config templates:** Commit `.env.example`, not `.env`

---

## 🚨 Emergency Cleanup

If you accidentally committed sensitive data:

### Option 1: Remove from Last Commit (Not Pushed Yet)
```powershell
# Remove file from last commit
git reset HEAD^ -- filename
git commit --amend
```

### Option 2: Remove from History (Already Pushed)
⚠️ **WARNING:** This rewrites history - coordinate with team!
```powershell
# Remove file from all history
git filter-branch --tree-filter 'rm -f path/to/file' HEAD

# Force push (dangerous!)
git push origin --force
```

### Option 3: Use BFG Repo-Cleaner (Recommended)
```powershell
# Install BFG
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove file from history
java -jar bfg.jar --delete-files filename.ext
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## ✅ Checklist: Is This File Ready to Commit?

Before adding any file to git, ask:

- [ ] Is this file part of the source code?
- [ ] Does it contain sensitive information?
- [ ] Is it generated by a build process?
- [ ] Is it temporary or for debugging only?
- [ ] Will other developers need this file?
- [ ] Is it already covered by .gitignore?
- [ ] Is the file size reasonable (< 1MB)?

If you answered "No" to any question except "Will other developers need this file?", **DO NOT COMMIT**.

---

## 📚 Additional Resources

- [GitHub .gitignore templates](https://github.com/github/gitignore)
- [Git documentation](https://git-scm.com/doc)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Git LFS for large files](https://git-lfs.github.com/)

---

**Last Updated:** October 11, 2025  
**Status:** ✅ Repository is clean and well-maintained
