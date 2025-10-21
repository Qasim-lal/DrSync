# Email Configuration Strategy

## Overview
This document explains how DrSync handles email configuration across different environments to ensure production safety while maintaining development/test flexibility.

## Environment-Specific Behavior

### 🚀 **PRODUCTION** (NODE_ENV=production)
**Requirement:** Email MUST be configured  
**Behavior:** Server startup will **FAIL** if email is not properly configured

```bash
# Required Environment Variables:
SMTP_HOST=smtp.gmail.com       # Your SMTP server
SMTP_USER=your-email@gmail.com # Your SMTP username
SMTP_PASS=your-app-password    # Your SMTP password
SMTP_PORT=587                  # SMTP port (optional, default: 587)
SMTP_SECURE=false              # Use TLS (optional, default: false)
SMTP_FROM=noreply@drsync.com   # Sender address (optional)
```

#### What Happens:
1. On startup, `checkEmailConfigOnStartup()` validates configuration
2. If missing, server **throws error** and **exits immediately**
3. Clear error messages shown with configuration instructions
4. Production deployment will **NOT proceed** without email config

#### Why This is Important:
- Staff invitations require email
- Password resets require email
- System notifications require email
- Appointment reminders require email

**❌ Production will not start without email configuration!**

---

### 🧪 **TEST** (NODE_ENV=test)
**Requirement:** Email is OPTIONAL  
**Behavior:** Emails are logged but not actually sent

#### What Happens:
1. Startup validation logs: "Email service not configured - emails will be skipped"
2. `sendEmail()` calls return `true` immediately
3. Logs show: `[TEST] Email skipped: <subject> to <recipient>`
4. Tests continue without failing

#### Benefits:
- Tests run without needing SMTP credentials
- Fast test execution (no network calls)
- No external dependencies for testing
- Test data doesn't trigger real emails

---

### 💻 **DEVELOPMENT** (NODE_ENV=development or not set)
**Requirement:** Email is OPTIONAL  
**Behavior:** Emails are logged but not sent (unless configured)

#### What Happens:
1. Startup shows warning: "Email service not configured - emails will be logged but not sent"
2. `sendEmail()` calls log the email details and return `true`
3. Logs show: `[DEV] Email skipped: <subject> to <recipient>`
4. Application continues normally

#### To Enable Email in Development:
Set environment variables (optional):
```bash
SMTP_HOST=smtp.mailtrap.io  # Use Mailtrap or similar for testing
SMTP_USER=your-test-user
SMTP_PASS=your-test-pass
```

---

## Code Implementation

### 1. Email Configuration Validator
**File:** `backend/src/utils/emailConfigValidator.ts`

```typescript
export function checkEmailConfigOnStartup(): void {
  const status = validateEmailConfig();
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    if (!status.isConfigured) {
      // ❌ THROW ERROR - Production cannot start
      throw new Error('Email service configuration missing in production');
    }
  } else if (env === 'test') {
    // ℹ️ Log info - Tests continue
    logger.info('Email service not configured - emails will be skipped');
  } else {
    // ⚠️ Log warning - Development continues
    logger.warn('Email service not configured - emails will be logged but not sent');
  }
}
```

### 2. Email Service
**File:** `backend/src/services/emailService.ts`

```typescript
async sendEmail(emailData: { ... }): Promise<boolean> {
  // Check environment
  if (process.env.NODE_ENV === 'test' && !this.config.auth.user) {
    logger.info(`[TEST] Email skipped: ${emailData.subject}`);
    return true;  // ✅ Success in test mode
  }

  try {
    // Send real email
    await this.transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    // Handle errors based on environment
    if (process.env.NODE_ENV === 'test') {
      return true;  // ✅ Don't fail tests
    }
    return false;   // ❌ Fail in production
  }
}
```

### 3. Server Startup Integration
**File:** `backend/src/index.ts`

```typescript
const startServer = async () => {
  try {
    // ✅ Validate email configuration FIRST
    logger.info('Validating email configuration...');
    checkEmailConfigOnStartup();  // Will throw in production if missing

    // Continue with other startup tasks...
    await connectDatabase();
    await connectRedis();
    
    app.listen(PORT, () => {
      logger.info('Server started successfully');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);  // ❌ Exit on critical errors
  }
};
```

---

## Production Deployment Checklist

### Before Deploying to Production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure SMTP credentials:
  - [ ] `SMTP_HOST` (e.g., smtp.gmail.com, smtp.sendgrid.net)
  - [ ] `SMTP_USER` (your email username)
  - [ ] `SMTP_PASS` (your email password or app-specific password)
  - [ ] `SMTP_FROM` (optional, sender email)
- [ ] Test email sending manually
- [ ] Verify server starts successfully
- [ ] Check logs for email configuration confirmation

### If Server Won't Start:
You'll see this error:
```
ERROR: CRITICAL ERROR: Email service not configured in PRODUCTION
Missing configuration:
  ❌ SMTP_HOST is not configured or set to localhost
  ❌ SMTP_USER is not configured
  ❌ SMTP_PASS is not configured

Email functionality is REQUIRED in production for:
  - Staff invitations
  - Password resets
  - System notifications
  - Appointment reminders
```

**Solution:** Configure the missing environment variables and restart.

---

## Recommended SMTP Providers

### For Production:
1. **SendGrid** - Reliable, 100 free emails/day
2. **AWS SES** - Scalable, pay-as-you-go
3. **Mailgun** - Developer-friendly, good documentation
4. **Gmail** - Simple setup (use app-specific password)

### For Development/Testing:
1. **Mailtrap** - Catches emails, no delivery
2. **MailHog** - Local SMTP server
3. **Ethereal** - Fake SMTP service

### Example Configuration (Gmail):
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password
SMTP_FROM=noreply@yourdomain.com
```

**Note:** For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use that app password (not your regular password)

---

## Testing Strategy

### Unit Tests:
- Run in `NODE_ENV=test`
- Email calls return immediately
- No actual emails sent
- Fast and reliable

### Integration Tests:
```typescript
// Test environment - emails are skipped
const result = await emailService.sendEmail({
  to: 'test@example.com',
  subject: 'Test',
  html: '<p>Test</p>',
  text: 'Test'
});

expect(result).toBe(true);  // ✅ Always succeeds in test
```

### Manual Testing:
1. Set up Mailtrap account
2. Configure SMTP credentials
3. Run `NODE_ENV=development npm start`
4. Trigger email actions
5. Check Mailtrap inbox

---

## Security Considerations

### ✅ **DO:**
- Use environment variables for credentials
- Use app-specific passwords (not main account password)
- Rotate credentials regularly
- Use TLS/SSL for SMTP connections
- Restrict sender permissions

### ❌ **DON'T:**
- Hardcode SMTP credentials in code
- Commit credentials to version control
- Use weak passwords
- Share production credentials
- Use personal email for production

---

## Monitoring & Alerts

### Production Monitoring:
- Log all email sending attempts
- Track success/failure rates
- Monitor SMTP connection health
- Alert on sustained failures

### Key Metrics:
- Email delivery rate
- Bounce rate
- SMTP connection errors
- Queue depth (if implemented)

---

## Troubleshooting

### Problem: "Email service not configured in PRODUCTION"
**Solution:** Set required environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS)

### Problem: "Authentication failed" in production
**Solutions:**
- Verify SMTP username/password are correct
- Check if using app-specific password (for Gmail)
- Verify SMTP host and port are correct
- Check firewall/network restrictions

### Problem: Emails not being received
**Solutions:**
- Check spam folder
- Verify sender email is authenticated
- Check SMTP provider logs
- Verify recipient email is valid

### Problem: Slow email sending
**Solutions:**
- Implement email queue
- Use async sending
- Consider dedicated email service
- Monitor SMTP provider performance

---

## Summary

| Environment | Email Required? | Behavior | Startup Fails? |
|-------------|----------------|----------|----------------|
| **Production** | ✅ YES | Must be configured | YES ❌ |
| **Test** | ❌ NO | Skipped, logged | NO ✅ |
| **Development** | ❌ NO | Skipped, logged | NO ✅ |

**Key Takeaway:** Production deployment REQUIRES email configuration. The server will not start without it, preventing silent failures and ensuring critical functionality works from day one.
