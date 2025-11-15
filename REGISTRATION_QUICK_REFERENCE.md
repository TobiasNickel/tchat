# 🎮 Ticross Registration API - Quick Reference

## Overview
Complete user registration system with:
- ✅ Anonymous user registration (no email needed)
- ✅ Email registration with verification
- ✅ 2-hour email verification window
- ✅ Password reset flow
- ✅ Automatic token expiration
- ✅ Automatic email reassignment after expiration

---

## 🔑 Core Concepts

### Tokens (Secrets)
- **Format**: 8 uppercase alphanumeric characters (e.g., `ABC12345`)
- **Generation**: Cryptographically secure random
- **Storage**: `users.secret` column
- **Type**: `users.secret_type` → `email_verification` or `password_reset`
- **Expiration**: 2 hours (email) or 1 hour (reset)

### User States
| State | Email | Email_Verified | Password | Can Login | Can Play |
|-------|-------|-----------------|----------|-----------|----------|
| Anonymous | ❌ | ❌ | ❌ | ❌ | ✅ |
| Pending Verification | ✅ | ❌ | ✅ | ❌ | ✅* |
| Verified | ✅ | ✅ | ✅ | ✅ | ✅ |

*Anonymous users can keep playing while waiting to verify email

---

## 📋 API Endpoints

### 1️⃣ Anonymous Registration
```
POST /api/auth/register-anonymous
{
  "name": "OptionalName"  // Optional, generates random if not provided
}

✅ Response 200:
{
  "success": true,
  "user": {
    "id": 1,
    "name": "User_A1B2C3D4",
    "email": null,
    "email_verified": false
  }
}

// Sets: auth_token cookie (user is now logged in)
```

---

### 2️⃣ Email Registration
```
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"  // Optional if updating anonymous user
}

✅ Response 200:
{
  "success": true,
  "user_id": 1,
  "requires_verification": true,
  "message": "Check email. Verification code: ABC12345"
}

❌ 409 (Email already verified):
{
  "error": "Email already registered. Use password reset."
}

❌ 409 (Pending verification, not expired):
{
  "error": "Email verification already in progress. Try in 45 minutes."
}

// If user had anonymous cookie: stays logged in, email bound to account
// If no cookie: NOT logged in yet (needs email verification)
```

---

### 3️⃣ Verify Email
```
POST /api/auth/verify-email
{
  "code": "ABC12345",
  "user_id": 1  // Only needed if not authenticated
}

✅ Response 200:
{
  "success": true,
  "message": "Email verified!",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "email_verified": true,
    "registered_at": "2025-11-08T10:37:00"
  }
}

// Sets: auth_token cookie (user is now logged in)
// Clears: secret, secret_type, secret_created_at
```

---

### 4️⃣ Resend Verification Email
```
POST /api/auth/resend-verification-email
{
  "email": "user@example.com"
}

✅ Response 200:
{
  "success": true,
  "message": "Verification email sent."
}

// Always returns success (prevents email enumeration)
// Generates new token
// Doesn't allow resend if <2 hours since last send
```

---

### 5️⃣ Forgot Password
```
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}

✅ Response 200:
{
  "success": true,
  "message": "If email exists & verified, reset email sent."
}

// Always returns success (prevents email enumeration)
// Only works for verified emails
// Generates password_reset token (1-hour expiration)
```

---

### 6️⃣ Reset Password
```
POST /api/auth/reset-password
{
  "user_id": 1,
  "code": "DEF67890",
  "password": "NewPassword456"
}

✅ Response 200:
{
  "success": true,
  "message": "Password reset. Login with new password."
}

// Updates password_hash
// Clears reset token
// User can now login
```

---

## 🔄 User Flows

### Flow 1: Anonymous → Email → Verified
```
1. POST /register-anonymous
   → Gets auth_token cookie
   → User plays anonymously

2. POST /register with email (cookie sent automatically)
   → Email bound to account
   → Verification email sent
   → User STAYS logged in as anonymous (cookie valid)

3. POST /verify-email with code from email
   → email_verified = 1
   → registered_at set
   → Auth token still valid
   → User can now also login with email/password
```

---

### Flow 2: Direct Email Registration
```
1. POST /register with email (no prior cookie)
   → New user created
   → Verification email sent
   → User NOT logged in

2. POST /verify-email with code
   → email_verified = 1
   → auth_token cookie set
   → User now logged in
```

---

### Flow 3: Password Reset
```
1. POST /forgot-password with email
   → Reset token generated
   → Email with code sent

2. User clicks link or enters code manually
   → Retrieves code from URL or input

3. POST /reset-password with code + new password
   → password_hash updated
   → Token cleared
   → User can now login with new password

4. POST /login with email + new password
   → auth_token cookie set
   → User logged in
```

---

## ⚠️ Edge Cases Handled

### Email Already Registered (Verified)
```
❌ 409 Conflict
User must use password reset to access account
```

### Email Pending Verification (<2 hours old)
```
❌ 409 Conflict
Shows how long user must wait
Message: "Try again in 45 minutes"
```

### Email Pending Verification (>2 hours old)
```
✅ 200 OK
Email reassigned to new registrant
Old account loses email but persists
User can create new registration with same email
```

### Anonymous User Registers Email
```
✅ 200 OK
Email bound to existing anonymous user
User stays logged in
User doesn't need to verify to keep playing
User must verify to fully register & login with email/password
```

### Token Expired
```
❌ 400 Bad Request
"Invalid or expired verification code"
User can request new token via /resend-verification-email
```

---

## 🧪 Quick Test

### Using curl
```bash
# 1. Register anonymous
curl -X POST http://localhost:8080/ticross/api/auth.php/register-anonymous \
  -H 'Content-Type: application/json' \
  -c cookies.txt \
  -d '{"name":"TestUser"}'

# 2. Register with email (uses cookie)
curl -X POST http://localhost:8080/ticross/api/auth.php/register \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# 3. Verify email (replace CODE with actual code)
curl -X POST http://localhost:8080/ticross/api/auth.php/verify-email \
  -H 'Content-Type: application/json' \
  -d '{"user_id":1,"code":"ABC12345"}'

# 4. Get current user
curl -X GET http://localhost:8080/ticross/api/auth.php/current-user \
  -b cookies.txt
```

---

## 🛡️ Security Notes

✅ **Enabled:**
- Cryptographically secure token generation
- Constant-time token comparison (no timing attacks)
- HTTPS cookie support (set in production)
- HttpOnly cookies (JS can't access)
- SameSite=Lax (CSRF protection)
- Email enumeration prevention
- Token expiration
- Password hashing (bcrypt)
- Email validation

⚠️ **Production Checklist:**
- [ ] Change `$secret` to long random string
- [ ] Set cookies `secure=true` (requires HTTPS)
- [ ] Update `From:` email address
- [ ] Configure SPF/DKIM/DMARC DNS records
- [ ] Add rate limiting (IP-based)
- [ ] Monitor email delivery
- [ ] Backup database regularly
- [ ] Review and test email templates

---

## 📊 Database Schema

```sql
users table:
- id INTEGER PRIMARY KEY
- name TEXT NOT NULL UNIQUE
- email TEXT UNIQUE                    -- NULL for anonymous
- password_hash TEXT                   -- NULL for anonymous
- avatar_data_url TEXT
- blocked BOOLEAN DEFAULT 0
- email_verified BOOLEAN DEFAULT 0
- email_verified_at DATETIME
- secret TEXT                          -- 8-char token
- secret_type TEXT                     -- email_verification|password_reset
- secret_created_at DATETIME
- registered_at DATETIME               -- NULL until verified
- created_at DATETIME DEFAULT NOW
```

---

## 🎯 For Frontend Developers

### Required Pages/Forms

1. **Login Page**
   - Email input
   - Password input
   - "Forgot password?" link

2. **Register Anonymous Page**
   - Optional name input
   - Register button

3. **Register with Email Page**
   - Email input
   - Password input
   - Name input (optional)
   - Register button

4. **Email Verification Page**
   - Large code input (uppercase, 8 chars)
   - Resend button
   - Shows: "Expires in X hours"

5. **Forgot Password Page**
   - Email input
   - Request reset button

6. **Password Reset Page**
   - Code input
   - New password input
   - Confirm button

7. **Profile Page**
   - Show: email, email_verified status
   - Show: created_at, registered_at
   - Future: Change email, change password

### API Calls Summary

| Page | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| Login | `/login` | POST | Login with email/password |
| Register Anonymous | `/register-anonymous` | POST | Create anon user |
| Register | `/register` | POST | Register with email |
| Email Verification | `/verify-email` | POST | Verify with code |
| Resend Code | `/resend-verification-email` | POST | Get new code |
| Forgot Password | `/forgot-password` | POST | Request reset |
| Reset Password | `/reset-password` | POST | Set new password |
| Profile | `/current-user` | GET | Get user info |

---

## 📚 Documentation Files

- **`REGISTRATION_API.md`** - Complete API reference
- **`TEST_REGISTRATION.php`** - Testing guide with curl examples
- **`IMPLEMENTATION_SUMMARY.md`** - Technical details and architecture
- **This file** - Quick reference guide

---

## ❓ Common Questions

**Q: Can user play while email pending?**
A: Yes! Anonymous account works fully. Email registration just adds login capability.

**Q: What if user never verifies email?**
A: After 2 hours, email becomes available for others. Original account persists with just username.

**Q: Can I delete my account?**
A: Not yet implemented. Would need DELETE endpoint.

**Q: Can I change my email?**
A: Not yet implemented. Would need endpoint to rebind email.

**Q: What's minimum password length?**
A: 6 characters. Enforce stronger passwords on frontend.

**Q: How long are tokens valid?**
A: Email verification: 2 hours | Password reset: 1 hour | Auth cookie: 24 hours

**Q: Can someone guess the token?**
A: Very unlikely. 8 uppercase alphanumeric = 36^8 ≈ 2.8 trillion combinations.

---

## 🚀 Deployment Checklist

- [ ] Database migrated (run config.php)
- [ ] Admin user created
- [ ] Email service tested (php -r "mail('test@example.com', 'Test', 'Body');")
- [ ] Secret key changed (update `$secret` in auth.php)
- [ ] HTTPS configured (update cookie `secure=true`)
- [ ] SPF/DKIM records configured
- [ ] Frontend pages created
- [ ] Rate limiting added (optional)
- [ ] Monitoring set up
- [ ] Backups configured

---

**Status**: ✅ Ready for Production (with checklist items completed)

**Last Updated**: 2025-11-08
