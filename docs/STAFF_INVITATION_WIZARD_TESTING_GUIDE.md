# Staff Invitation Wizard - Testing Guide
## Complete End-to-End Testing Procedure

**Date:** October 8, 2025  
**Status:** Ready for Testing  
**Estimated Time:** 15-20 minutes

---

## 🎯 Testing Objectives

1. Verify all three pages render correctly
2. Test complete invitation workflow (admin → staff)
3. Validate API integration with backend
4. Check error handling and edge cases
5. Confirm security features work properly

---

## 📋 Pre-Testing Checklist

### ✅ Prerequisites
- [ ] Backend is running: `docker ps | grep drsync_backend_dev`
- [ ] Frontend is running: `docker ps | grep drsync_frontend_dev`
- [ ] Database is accessible
- [ ] You have an admin account to login

### 🔧 Setup
1. **Frontend URL:** http://localhost:5173
2. **Backend URL:** http://localhost:3001
3. **Login as Admin:** Use an existing ORG_ADMIN or SUPER_ADMIN account

---

## 🧪 Test Plan

### TEST 1: Staff Management Page (Empty State)
**URL:** http://localhost:5173/dashboard/staff

**Steps:**
1. Login to the dashboard
2. Navigate to http://localhost:5173/dashboard/staff
3. Verify the page loads without errors

**Expected Results:**
- [ ] Page loads successfully
- [ ] Header shows "Staff Management"
- [ ] If no invitations exist, empty state displays:
  - Icon showing team/people
  - Message: "No staff invitations yet"
  - Button: "Send First Invitation" or "Invite Staff Member"
- [ ] Statistics cards show all zeros (if no invitations)
- [ ] "Back to Dashboard" link is visible

**If Issues:**
- Check browser console for errors (F12)
- Check backend logs: `docker logs drsync_backend_dev`
- Verify authentication token is valid

---

### TEST 2: Staff Invitation Form
**URL:** http://localhost:5173/dashboard/staff/invite

**Steps:**
1. From Staff Management page, click "Invite Staff Member"
2. Fill out the form:
   - **First Name:** John
   - **Last Name:** Doe
   - **Email:** john.doe@example.com (use a real email you can access)
   - **Role:** Select "Doctor"
3. Click "Send Invitation"

**Expected Results:**
- [ ] Form renders with all fields
- [ ] "How it works" information panel displays
- [ ] Email validation works in real-time
- [ ] All 5 roles are selectable:
  - Staff Member
  - Doctor
  - Nurse
  - Receptionist
  - Administrator
- [ ] Submit button shows loading spinner
- [ ] Success screen appears with:
  - Green checkmark icon
  - "Invitation Sent!" message
  - Email address confirmation
  - Two buttons: "View All Invitations" and "Send Another Invitation"

**If Email Validation Fails:**
- Try entering invalid email: "test@invalid" (should show error)
- Try valid email: "test@example.com" (should clear error)

**If Submit Fails:**
- Check backend logs for errors
- Check browser DevTools → Network tab
- Look for `/api/invitations` POST request
- Verify authentication token in request headers

---

### TEST 3: View Invitation in List
**URL:** http://localhost:5173/dashboard/staff

**Steps:**
1. From success screen, click "View All Invitations"
2. Verify the invitation appears in the table

**Expected Results:**
- [ ] Statistics cards update:
  - Total: 1
  - Pending: 1
  - Accepted: 0
  - Expired: 0
- [ ] Table shows one row with:
  - Email: john.doe@example.com
  - Role: DOCTOR
  - Status: PENDING (yellow badge)
  - Invited: Current date/time
  - Expires: 7 days from now
  - Actions: Resend and Cancel buttons

**Test Actions:**
- [ ] Hover over Resend button (refresh icon)
- [ ] Hover over Cancel button (X icon)
- [ ] Don't click them yet (we'll test later)

---

### TEST 4: Get Invitation Token
**This is the tricky part - we need to get the invitation token**

**Option A: Check Backend Logs (Easiest)**
```bash
docker logs drsync_backend_dev | grep "Invitation token"
```
Look for a line containing the JWT token.

**Option B: Check Database (More Reliable)**
```bash
docker exec -it drsync_postgres psql -U admin -d drsync -c "SELECT token FROM staff_invitations WHERE email = 'john.doe@example.com' ORDER BY created_at DESC LIMIT 1;"
```

**Option C: Check Email (If Configured)**
If email service is configured, check the inbox for john.doe@example.com

**Copy the Token:**
The token will be a long string like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### TEST 5: Account Setup Page (Valid Token)
**URL:** http://localhost:5173/setup/[TOKEN]

**Steps:**
1. Paste the token you copied into the URL:
   ```
   http://localhost:5173/setup/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
2. Open this URL in a **new incognito/private window** (to test without authentication)

**Expected Results:**
- [ ] Page loads with "Validating your invitation..." spinner
- [ ] After validation, form appears with:
  - **Header:** "Complete Your Account"
  - **Organization name** displayed
  - **Invitation Info Panel** (blue box) showing:
    - Name: John Doe
    - Email: john.doe@example.com
    - Role: DOCTOR
    - Organization: [Your org name]
  - **Password field** with strength indicator
  - **Confirm Password field**
  - **Phone Number field** (optional)
  - **Terms of Service** text
  - **Complete Account Setup** button

**Test Password Strength:**
1. Enter weak password: "12345678"
   - [ ] Strength shows "Weak password" (red)
   - [ ] Submit button is disabled

2. Enter fair password: "Password123"
   - [ ] Strength shows "Fair password" (yellow)
   - [ ] Submit button is disabled

3. Enter strong password: "Password123!@#"
   - [ ] Strength shows "Strong password" (green)
   - [ ] Strength bar fills up
   - [ ] Score shows 5/6 or 6/6
   - [ ] Submit button remains disabled (need to confirm)

4. Confirm password: "Password123!@#"
   - [ ] No error message appears
   - [ ] Submit button becomes enabled

**Test Password Mismatch:**
1. Password: "Password123!@#"
2. Confirm: "Password123!@"
   - [ ] Error message: "Passwords do not match"
   - [ ] Submit button disabled

---

### TEST 6: Complete Account Setup
**Continuing from TEST 5**

**Steps:**
1. Fill the form:
   - **Password:** Password123!@#
   - **Confirm Password:** Password123!@#
   - **Phone:** +92 300 1234567 (optional)
2. Click "Complete Account Setup"

**Expected Results:**
- [ ] Button shows loading spinner: "Creating Account..."
- [ ] After success:
  - Alert/notification: "Account setup completed successfully! Please log in..."
  - Page redirects to `/login`
- [ ] At login page, you can login with:
  - **Email:** john.doe@example.com
  - **Password:** Password123!@#

**If Account Creation Fails:**
- Check backend logs: `docker logs drsync_backend_dev --tail 50`
- Check for database errors
- Verify token hasn't expired
- Check if email already exists in database

---

### TEST 7: Verify Account Was Created
**After successful account setup**

**Steps:**
1. Login with the new credentials:
   - Email: john.doe@example.com
   - Password: Password123!@#
2. After login, check the role

**Expected Results:**
- [ ] Login succeeds
- [ ] User is redirected to dashboard
- [ ] User has DOCTOR role
- [ ] User belongs to the correct organization

**Verify in Database:**
```bash
docker exec -it drsync_postgres psql -U admin -d drsync -c "SELECT email, role, organization_id FROM users WHERE email = 'john.doe@example.com';"
```

---

### TEST 8: Invitation Status Update
**Back to admin account**

**Steps:**
1. Logout from staff account
2. Login as admin again
3. Navigate to http://localhost:5173/dashboard/staff

**Expected Results:**
- [ ] Statistics update:
  - Total: 1
  - Pending: 0
  - Accepted: 1
  - Expired: 0
- [ ] Invitation status changed to:
  - Status: ACCEPTED (green badge)
  - No action buttons (can't resend/cancel accepted invitations)

---

### TEST 9: Resend Invitation
**Create a new invitation to test resend**

**Steps:**
1. Create another invitation with different email
2. Wait for it to appear in the list
3. Click the Resend button (refresh icon)

**Expected Results:**
- [ ] Success message: "Invitation resent successfully!"
- [ ] New email sent (or token regenerated)
- [ ] Invitation remains in PENDING status
- [ ] Updated timestamp (if shown)

---

### TEST 10: Cancel Invitation
**Use the invitation from TEST 9**

**Steps:**
1. Click the Cancel button (X icon)
2. Confirm in the dialog

**Expected Results:**
- [ ] Confirmation dialog: "Are you sure you want to cancel this invitation?"
- [ ] After confirming:
  - Success message: "Invitation cancelled successfully!"
  - Invitation disappears from list
  - Statistics update (Pending count decreases)

---

### TEST 11: Invalid Token
**Test error handling**

**Steps:**
1. Open in incognito window:
   ```
   http://localhost:5173/setup/invalid-token-12345
   ```

**Expected Results:**
- [ ] Page shows error screen:
  - Red exclamation icon
  - "Invalid Invitation" heading
  - Error message about expired/invalid link
  - "Go to Home" button
  - No form is shown

---

### TEST 12: Expired Token (Optional)
**Only if you can modify database**

**Steps:**
1. Update token expiry in database:
   ```bash
   docker exec -it drsync_postgres psql -U admin -d drsync -c "UPDATE staff_invitations SET expires_at = NOW() - INTERVAL '1 day' WHERE status = 'PENDING' LIMIT 1;"
   ```
2. Try to use that token

**Expected Results:**
- [ ] Same error screen as TEST 11
- [ ] Message mentions expiration

---

### TEST 13: Duplicate Email
**Test backend validation**

**Steps:**
1. Try to create invitation with same email as TEST 2
2. Email: john.doe@example.com (already accepted)

**Expected Results:**
- [ ] Error message: "User with this email already exists" or similar
- [ ] Form doesn't submit
- [ ] Invitation not created

---

## 📊 Test Results Summary

### Overall Status: [ ] PASS / [ ] FAIL

| Test | Status | Notes |
|------|--------|-------|
| TEST 1: Staff Management Page | [ ] PASS [ ] FAIL | |
| TEST 2: Invitation Form | [ ] PASS [ ] FAIL | |
| TEST 3: View in List | [ ] PASS [ ] FAIL | |
| TEST 4: Get Token | [ ] PASS [ ] FAIL | |
| TEST 5: Account Setup Page | [ ] PASS [ ] FAIL | |
| TEST 6: Complete Setup | [ ] PASS [ ] FAIL | |
| TEST 7: Verify Account | [ ] PASS [ ] FAIL | |
| TEST 8: Status Update | [ ] PASS [ ] FAIL | |
| TEST 9: Resend | [ ] PASS [ ] FAIL | |
| TEST 10: Cancel | [ ] PASS [ ] FAIL | |
| TEST 11: Invalid Token | [ ] PASS [ ] FAIL | |
| TEST 12: Expired Token | [ ] PASS [ ] FAIL | |
| TEST 13: Duplicate Email | [ ] PASS [ ] FAIL | |

---

## 🐛 Common Issues & Solutions

### Issue 1: Page Not Loading
**Symptoms:** Blank page, infinite loading
**Solutions:**
- Check browser console (F12)
- Verify frontend is running: `docker ps | grep frontend`
- Check frontend logs: `docker logs drsync_frontend_dev`
- Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Issue 2: API Errors (401 Unauthorized)
**Symptoms:** "Unauthorized" or "Not authenticated"
**Solutions:**
- Check if you're logged in
- Check localStorage for 'token'
- Re-login if token expired
- Verify backend authentication is working

### Issue 3: API Errors (500 Internal Server Error)
**Symptoms:** "Internal Server Error" or "Failed to..."
**Solutions:**
- Check backend logs: `docker logs drsync_backend_dev --tail 100`
- Check database connection
- Verify all backend services are running
- Check Prisma migrations are applied

### Issue 4: Email Not Received
**Symptoms:** No invitation email arrives
**Solutions:**
- This is expected if SMTP is not configured
- Use Option A or B from TEST 4 to get the token
- In production, configure SMTP credentials

### Issue 5: Account Setup Page Shows Error
**Symptoms:** "Invalid or expired invitation link"
**Solutions:**
- Check token hasn't expired (7 days)
- Verify token wasn't already used
- Check invitation status in database
- Try creating a new invitation

---

## ✅ Sign-Off

### Testing Completed By: _________________
### Date: _________________
### Approved for Commit: [ ] YES [ ] NO

### Notes:
```
[Add any additional observations, bugs found, or recommendations]
```

---

**Ready to commit?** If all critical tests pass (1-8), the implementation is ready!

**Found bugs?** Document them and fix before committing.
