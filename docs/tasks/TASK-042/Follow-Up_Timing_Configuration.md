# Follow-Up Timing Configuration

**Feature:** Configurable Follow-Up Scheduling  
**Date:** December 4, 2025  
**Version:** 1.0

---

## Overview

Follow-up reminders can now be configured by each organization admin. Instead of using hard-coded timing values, the system reads timing preferences from the organization's notification settings.

---

## Configuration Fields

### Database Schema

Three new fields added to `notification_settings` table:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `same_day_follow_up_hours` | Integer | 2 | Hours after appointment completion to send same-day follow-up |
| `next_day_follow_up_hours` | Integer | 24 | Hours after appointment date to send next-day follow-up |
| `no_show_follow_up_hours` | Integer | 1 | Hours after no-show detection to send follow-up |

---

## Default Timing

If an organization hasn't configured custom timing, these defaults are used:

- **Same-Day Follow-Up:** 2 hours after completion
- **Next-Day Follow-Up:** 24 hours after appointment
- **No-Show Follow-Up:** 1 hour after detection

---

## How to Configure

### Via API

Use the existing notification settings update endpoint:

**Endpoint:** `PUT /api/notification-settings/:organizationId`

**Request Body:**
```json
{
  "sameDayFollowUpHours": 3,
  "nextDayFollowUpHours": 48,
  "noShowFollowUpHours": 2
}
```

**Example:**
```bash
curl -X PUT http://localhost:3001/api/notification-settings/org-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sameDayFollowUpHours": 3,
    "nextDayFollowUpHours": 48,
    "noShowFollowUpHours": 2
  }'
```

### Via Database (Direct)

```sql
UPDATE notification_settings 
SET 
  same_day_follow_up_hours = 3,
  next_day_follow_up_hours = 48,
  no_show_follow_up_hours = 2
WHERE organization_id = 'org-123';
```

---

## Use Cases

### Small Clinic (Quick Follow-Ups)
```json
{
  "sameDayFollowUpHours": 1,    // 1 hour after appointment
  "nextDayFollowUpHours": 12,   // 12 hours after appointment
  "noShowFollowUpHours": 0.5    // 30 minutes after no-show
}
```

### Hospital (Delayed Follow-Ups)
```json
{
  "sameDayFollowUpHours": 6,    // 6 hours after appointment
  "nextDayFollowUpHours": 72,   // 3 days after appointment
  "noShowFollowUpHours": 4      // 4 hours after no-show
}
```

### Specialist (No Same-Day, Longer Next-Day)
```json
{
  "sameDayFollowUpHours": 999,  // Effectively disabled (very long delay)
  "nextDayFollowUpHours": 48,   // 2 days after appointment
  "noShowFollowUpHours": 24     // 1 day after no-show
}
```

---

## Technical Implementation

### Services Updated

**`followUpService.ts`**
- Modified `calculateFollowUpTime()` to fetch settings from database
- Added fallback to defaults if settings don't exist
- All follow-up scheduling now uses this method

**Key Methods:**
```typescript
// Fetches settings and calculates time
private async calculateFollowUpTime(
  followUpType: ReminderType, 
  organizationId: string
): Promise<Date>
```

### Automatic Application

The configured timing is automatically applied when:
1. **Appointment Completed** → Same-day follow-up scheduled
2. **Appointment No-Show** → No-show follow-up scheduled
3. **Daily Cron Job (9 AM)** → Next-day follow-ups scheduled

### Manual Override

When manually scheduling a follow-up via API, you can override the configured timing:

```bash
POST /api/reminders/follow-up/manual
{
  "organizationId": "org-123",
  "appointmentId": "appt-456",
  "followUpType": "FOLLOWUP_SAME_DAY",
  "scheduledFor": "2025-12-05T14:00:00Z"  // Override time
}
```

---

## Migration

### Existing Organizations

When the new columns are added:
- **Default values applied automatically** (2, 24, 1 hours)
- **No action required** from organization admins
- **Behavior remains the same** unless they update settings

### New Organizations

When a new organization is created:
- `notification_settings` record auto-created with defaults
- Admins can customize immediately via API or dashboard

---

## Validation Rules

### Constraints

- **Minimum:** 0.5 hours (30 minutes)
- **Maximum:** 168 hours (7 days)
- **Type:** Integer (whole hours) or decimal for fractional hours

### Recommendations

- **Same-Day:** 1-6 hours (balance between timely and not intrusive)
- **Next-Day:** 12-72 hours (give patients time to recover)
- **No-Show:** 1-4 hours (reach out while still relevant)

---

## Error Handling

### If Settings Fetch Fails

```typescript
// Fallback to hardcoded defaults
sameDayFollowUpHours = 2
nextDayFollowUpHours = 24
noShowFollowUpHours = 1
```

### If Invalid Values

- **Negative or Zero:** Use default
- **Too Large (>168 hours):** Use default
- **Non-numeric:** Use default

---

## Frontend Integration (Future)

### Settings UI Mock

```jsx
<FormField label="Same-Day Follow-Up">
  <Select value={sameDayFollowUpHours}>
    <option value="1">1 hour after completion</option>
    <option value="2">2 hours after completion</option>
    <option value="4">4 hours after completion</option>
    <option value="6">6 hours after completion</option>
  </Select>
</FormField>

<FormField label="Next-Day Follow-Up">
  <Select value={nextDayFollowUpHours}>
    <option value="12">12 hours after appointment</option>
    <option value="24">24 hours after appointment</option>
    <option value="48">48 hours after appointment</option>
    <option value="72">72 hours after appointment</option>
  </Select>
</FormField>

<FormField label="No-Show Follow-Up">
  <Select value="noShowFollowUpHours">
    <option value="1">1 hour after no-show</option>
    <option value="2">2 hours after no-show</option>
    <option value="4">4 hours after no-show</option>
  </Select>
</FormField>
```

---

## Testing

### Test Scenarios

1. **Default Timing**
   - Create new org → verify defaults applied
   - Schedule follow-up → verify uses default hours

2. **Custom Timing**
   - Update settings via API
   - Schedule follow-up → verify uses custom hours

3. **Fallback Behavior**
   - Simulate database error
   - Verify fallback to hardcoded defaults

4. **Edge Cases**
   - Test with 0.5 hours (30 min)
   - Test with 168 hours (7 days)
   - Test with invalid values

### Test Commands

```bash
# 1. Get current settings
GET /api/notification-settings/org-123

# 2. Update timing
PUT /api/notification-settings/org-123
{ "sameDayFollowUpHours": 3 }

# 3. Trigger follow-up
POST /api/reminders/follow-up/manual
{
  "organizationId": "org-123",
  "appointmentId": "appt-456",
  "followUpType": "FOLLOWUP_SAME_DAY"
}

# 4. Check scheduled time
GET /api/reminders/follow-up/history/appt-456
```

---

## Benefits

✅ **Flexibility** - Each organization can customize to their workflow  
✅ **No Code Changes** - Admins adjust via API/dashboard  
✅ **Backward Compatible** - Defaults match previous hardcoded values  
✅ **Fail-Safe** - Falls back to defaults if settings unavailable  
✅ **Easy Testing** - Can quickly adjust timing for testing  

---

## Future Enhancements

### Potential Additions

1. **Time-of-Day Control**
   - Schedule follow-ups at specific times (e.g., always at 10 AM)

2. **Day-of-Week Rules**
   - Different timing for weekends vs weekdays

3. **Patient-Specific Overrides**
   - VIP patients get immediate follow-ups
   - Regular patients use default timing

4. **Template Selection**
   - Different message templates based on timing
   - "Quick check-in" for same-day vs "Full follow-up" for next-day

5. **A/B Testing**
   - Test different timing strategies
   - Analytics on response rates by timing

---

## Summary

**Status:** ✅ Complete and Operational

**What Changed:**
- Added 3 configurable fields to `notification_settings` table
- Updated `followUpService` to read from settings
- Existing API endpoint works for updates
- Backward compatible with defaults

**What Admins Can Do:**
- Customize follow-up timing per organization
- Update via PUT `/api/notification-settings/:organizationId`
- Changes apply immediately to new follow-ups

**What's Next:**
- Frontend UI for easy configuration
- Analytics to help optimize timing
- More advanced scheduling rules

---

**Implementation Complete!** 🎉
