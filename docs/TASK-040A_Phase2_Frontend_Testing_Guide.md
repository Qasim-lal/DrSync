# TASK-040A Phase 2 - Frontend Testing Guide

**Date:** October 21, 2025  
**Status:** Ready for Testing  
**Components:** 4 React components + 1 service layer

---

## 🎯 Testing Overview

This guide will help you test the Phase 2 notification settings frontend components that were implemented alongside the backend APIs.

### Components to Test:
1. ✅ **PresetSelector** - Apply BUDGET/RECOMMENDED/PREMIUM presets
2. ✅ **CostCalculator** - Real-time cost calculation
3. ✅ **PresetComparison** - Side-by-side preset comparison
4. ✅ **SpendingCapConfig** - Monthly spending cap management

---

## 🚀 Quick Start

### 1. Ensure Services Are Running

```powershell
# Check if containers are running
docker ps --filter "name=drsync"

# You should see:
# - drsync_backend_dev (port 3001)
# - drsync_frontend_dev (port 3000)
# - drsync_postgres_dev (port 5432)
# - drsync_redis_dev (port 6379)
```

### 2. Access the Test Page

Open your browser and navigate to:

```
http://localhost:3000/admin/notification-settings
```

**Note:** If you get a 404, the page was just created. The Next.js dev server should auto-compile it.

---

## 📋 Test Scenarios

### Test 1: Preset Selector Component

**Objective:** Verify preset modes can be applied

**Steps:**
1. Navigate to the test page
2. Locate the "Notification Presets" section
3. You should see 3 cards: Budget, Recommended, Premium
4. Click on **"Budget"** preset
5. Wait for loading spinner
6. Verify:
   - ✅ Toast notification appears saying "BUDGET preset applied successfully"
   - ✅ Card has a checkmark and blue ring
   - ✅ Debug info shows "Current Preset: BUDGET"

**Expected Behavior:**
- One-click switches between presets
- Loading state during API call
- Success/error feedback via toast
- Visual indicator for current preset

---

### Test 2: Cost Calculator Component

**Objective:** Verify cost calculation works

**Steps:**
1. Locate the "Monthly Cost Calculator" section
2. Change appointment count to **500**
3. Click **"Calculate"** button
4. Verify:
   - ✅ 3 summary cards appear:
     - Total Messages
     - Cost per Message (PKR 3.50)
     - Estimated Cost
   - ✅ Breakdown table shows all notification types
   - ✅ Enabled types show counts > 0
   - ✅ Disabled types show count = 0
   - ✅ Total at bottom matches summary

**Test Different Scenarios:**
- Try 0 appointments (should show PKR 0)
- Try 10,000 appointments (should calculate correctly)
- Click Calculate multiple times (should update)

---

### Test 3: Preset Comparison Component

**Objective:** Verify preset comparison displays correctly

**Steps:**
1. Locate the "Preset Comparison" section
2. You should see:
   - Current configuration card (blue)
   - 3 preset cards (Budget, Recommended, Premium)
3. Verify each card shows:
   - ✅ Monthly cost (PKR amount)
   - ✅ Message count
   - ✅ Savings (green arrow down) OR Additional cost (orange arrow up)
   - ✅ Percentage change

**Test Recommendation Logic:**
- If on PREMIUM: Should suggest Budget/Recommended to save money
- If on BUDGET: Should suggest upgrade opportunities
- Green "Cost Savings Opportunity" box appears when applicable

---

### Test 4: Spending Cap Configuration

**Objective:** Verify spending cap management

**Steps:**
1. Locate the "Spending Cap Configuration" section
2. Toggle **"Enable Spending Cap"** ON
3. Verify:
   - ✅ Toggle animates to blue
   - ✅ Form fields appear:
     - Monthly Cap input (PKR)
     - Alert Threshold slider (50%-95%)
4. Enter **10000** in Monthly Cap
5. Drag Alert Threshold slider to **80%**
6. Verify current usage display:
   - ✅ Progress bar appears
   - ✅ Color coding (green/orange/red based on usage)
   - ✅ Status message updates
7. Click **"Save Spending Cap Settings"**
8. Verify:
   - ✅ "Saving..." appears on button
   - ✅ Toast notification on success

**Test Edge Cases:**
- Try saving with empty cap (should show error)
- Try negative numbers (should validate)
- Toggle OFF and verify form disappears

---

## 🔍 Component-Specific Tests

### PresetSelector.tsx

**Visual Tests:**
- [ ] Cards have proper icons (💵, ✨, 🏆)
- [ ] Color coding matches (green, blue, purple)
- [ ] Hover effects work
- [ ] Current preset shows checkmark
- [ ] Loading spinner overlays card during application

**Functional Tests:**
- [ ] API call to `/api/notification-settings/:orgId/preset`
- [ ] Success toast with preset name
- [ ] Error toast on API failure
- [ ] Callback triggers page reload
- [ ] Disabled state during loading prevents double-clicks

---

### CostCalculator.tsx

**Visual Tests:**
- [ ] Input field accepts numbers only
- [ ] Calculate button changes to "Calculating..." during API call
- [ ] 3 summary cards have proper colors (blue, green, purple)
- [ ] Table has proper headers and alignment
- [ ] Enabled/Disabled badges are color-coded
- [ ] Loading spinner during calculation

**Functional Tests:**
- [ ] API call to `/api/notification-settings/:orgId/calculate-cost?appointments=X`
- [ ] Numbers format correctly (commas for thousands)
- [ ] Currency displays as "PKR X.XX"
- [ ] Breakdown items match enabled settings
- [ ] Total calculation is accurate
- [ ] Error handling shows user-friendly message

---

### PresetComparison.tsx

**Visual Tests:**
- [ ] Current config card highlighted in blue
- [ ] 3 preset cards in grid layout
- [ ] Arrows point correctly (down for savings, up for additional)
- [ ] Color coding for savings/costs (green/orange)
- [ ] Percentage changes calculated correctly
- [ ] Recommendation boxes appear when appropriate

**Functional Tests:**
- [ ] API call to `/api/notification-settings/:orgId/compare-presets?appointments=X`
- [ ] Savings calculated as: `current.cost - preset.cost`
- [ ] Additional cost calculated as: `preset.cost - current.cost`
- [ ] Percentage shows: `(change / current) * 100`
- [ ] Recommendation logic triggers correctly
- [ ] Based on correct appointment count

---

### SpendingCapConfig.tsx

**Visual Tests:**
- [ ] Toggle switch animates smoothly
- [ ] Toggle is blue when ON, gray when OFF
- [ ] Form fields only show when enabled
- [ ] Slider has proper range (50-95)
- [ ] Slider value displays in real-time
- [ ] Progress bar colors change based on usage (green → orange → red)
- [ ] Status icons change (✓ → ⚠️ → ❌)

**Functional Tests:**
- [ ] API call to `/api/notification-settings/:orgId` with PUT
- [ ] Sends: `{ monthlyCap, alertThreshold }`
- [ ] Validation: cap must be > 0
- [ ] Progress bar calculation: `(currentSpend / cap) * 100`
- [ ] isNearCap when: `percentageUsed >= alertThreshold`
- [ ] isOverCap when: `percentageUsed >= 100`
- [ ] Success toast on save
- [ ] Error toast on failure

---

## 🧪 API Integration Tests

### Verify Backend Endpoints

```bash
# Test Organization ID (from your test data)
ORG_ID="test-org-dr-demo"

# 1. Get current settings
curl http://localhost:3001/api/notification-settings/$ORG_ID

# 2. Apply preset
curl -X POST http://localhost:3001/api/notification-settings/$ORG_ID/preset \
  -H "Content-Type: application/json" \
  -d '{"preset":"RECOMMENDED"}'

# 3. Calculate cost
curl http://localhost:3001/api/notification-settings/$ORG_ID/calculate-cost?appointments=800

# 4. Compare presets
curl http://localhost:3001/api/notification-settings/$ORG_ID/compare-presets?appointments=800
```

---

## 🐛 Troubleshooting

### Issue: Page shows 404

**Solution:**
```powershell
# Restart frontend container to pick up new page
docker restart drsync_frontend_dev

# Watch logs
docker logs -f drsync_frontend_dev
```

### Issue: API calls fail with CORS error

**Check:**
- Backend is running on port 3001
- NEXT_PUBLIC_API_URL is set correctly
- Backend has CORS enabled for localhost:3000

### Issue: "Organization not found" error

**Solution:**
- The default org ID is `test-org-dr-demo`
- Create test data by running backend tests:
  ```powershell
  docker exec drsync_backend_dev npm test tests/notificationSettingsPhase2.test.ts
  ```

### Issue: Components not rendering

**Check browser console for:**
- Import errors (component path incorrect)
- TypeScript errors (type mismatches)
- Runtime errors (null reference exceptions)

### Issue: Styles look broken

**Verify:**
- Tailwind CSS is configured
- `tailwindcss` dependency is installed
- Styles are being applied (check element inspector)

---

## ✅ Expected Test Results

### All Tests Passing Should Show:

1. **PresetSelector:**
   - ✅ 3 cards visible and clickable
   - ✅ Presets apply in <2 seconds
   - ✅ Toast notifications appear
   - ✅ Current preset indicator updates

2. **CostCalculator:**
   - ✅ Calculation completes in <1 second
   - ✅ All 12 notification types in breakdown
   - ✅ Numbers format correctly
   - ✅ Total matches sum of enabled types

3. **PresetComparison:**
   - ✅ Shows accurate cost differences
   - ✅ Recommendations make sense
   - ✅ Percentages calculate correctly
   - ✅ Visual indicators clear

4. **SpendingCapConfig:**
   - ✅ Toggle works smoothly
   - ✅ Slider updates in real-time
   - ✅ Progress bar reflects actual usage
   - ✅ Saves successfully to backend

---

## 📊 Performance Benchmarks

**Target Performance:**
- Page load: <3 seconds
- Preset application: <2 seconds
- Cost calculation: <1 second
- Preset comparison: <1.5 seconds
- Settings save: <1 second

**To Test:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Perform actions
4. Check request/response times

---

## 📝 Test Report Template

```markdown
## Test Execution Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** Docker containers on localhost

### PresetSelector Component
- [ ] Visual rendering: PASS / FAIL
- [ ] Preset application: PASS / FAIL
- [ ] Toast notifications: PASS / FAIL
- [ ] Loading states: PASS / FAIL
- **Issues:** [List any issues]

### CostCalculator Component
- [ ] Input handling: PASS / FAIL
- [ ] Cost calculation: PASS / FAIL
- [ ] Breakdown accuracy: PASS / FAIL
- [ ] Error handling: PASS / FAIL
- **Issues:** [List any issues]

### PresetComparison Component
- [ ] Comparison display: PASS / FAIL
- [ ] Savings calculation: PASS / FAIL
- [ ] Recommendations: PASS / FAIL
- [ ] Visual indicators: PASS / FAIL
- **Issues:** [List any issues]

### SpendingCapConfig Component
- [ ] Toggle functionality: PASS / FAIL
- [ ] Cap configuration: PASS / FAIL
- [ ] Progress visualization: PASS / FAIL
- [ ] Save operation: PASS / FAIL
- **Issues:** [List any issues]

### Overall Assessment
- **Status:** PASS / FAIL / NEEDS WORK
- **Critical Issues:** [List]
- **Minor Issues:** [List]
- **Recommendations:** [List]
```

---

## 🎉 Success Criteria

Phase 2 frontend is considered **FULLY TESTED** when:

- ✅ All 4 components render without errors
- ✅ All API integrations work correctly
- ✅ Visual design matches specifications
- ✅ User interactions are smooth and responsive
- ✅ Error handling provides clear feedback
- ✅ Performance meets benchmarks
- ✅ No console errors in browser
- ✅ Mobile responsive (bonus)

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Docker logs: `docker logs drsync_frontend_dev`
3. Check backend logs: `docker logs drsync_backend_dev`
4. Verify test data exists in database
5. Restart containers if needed

---

**Happy Testing! 🚀**
