# Ticross Registration & Email Verification API

## Overview

This document describes the complete user registration, email verification, and password reset flows implemented in the Ticross backend.

## Database Schema Changes

The `users` table now includes the following new columns:

| Column | Type | Description |
|--------|------|-------------|
| `email` | TEXT UNIQUE NULL | User email (nullable for anonymous users) |
| `password_hash` | TEXT NULL | Password hash (nullable for anonymous users) |
| `email_verified` | BOOLEAN | Whether email has been verified |
| `email_verified_at` | DATETIME | Timestamp when email was verified |
| `secret` | TEXT | Current verification/reset token (8 chars) |
| `secret_type` | TEXT | Type of token: `email_verification` or `password_reset` |
| `secret_created_at` | DATETIME | When the token was generated |
| `registered_at` | DATETIME | When the user fully registered (null for anonymous) |

## Registration Flows

### Flow A: Anonymous User Registration

**Endpoint:** `POST /api/auth/register-anonymous`

**Purpose:** Create an unregistered user who can play anonymously. User gets authenticated with a session cookie.

**Request:**
```json
{
  "name": "Optional custom name"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "name": "User_12345678",
    "email": null,
    "email_verified": false,
    "avatar_data_url": null,
    "created_at": "2025-11-08T10:30:00",
    "registered_at": null
  },
  "message": "Anonymous user created successfully. You can now register with an email."
}
```

**Constraints:**
- User must NOT be already logged in
- If no name provided, generates random: `User_[8-char-hex]`
- Name must be unique
- Sets `auth_token` cookie automatically

---

### Flow B: Email Registration (with Verification)

**Endpoint:** `POST /api/auth/register`

**Purpose:** Register a user with email. Sends verification email. If anonymous user is logged in, binds email to existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Optional name (used if creating new user)"
}
```

**Response (Success - New User):**
```json
{
  "success": true,
  "user_id": 124,
  "requires_verification": true,
  "message": "Registration successful! Please check your email to verify your address. Verification code: ABC12345"
}
```

**Response (Success - Binding to Anonymous):**
```json
{
  "success": true,
  "user_id": 123,
  "requires_verification": true,
  "message": "Registration successful! Please check your email to verify your address. Verification code: ABC12345"
}
```

**Error Cases:**

1. **Email already verified (409):**
```json
{
  "error": "Email already registered. Please use password reset if you forgot your password."
}
```

2. **Email pending verification (not expired) (409):**
```json
{
  "error": "Email verification already in progress. Please check your email or try again in 45 minutes."
}
```

3. **Invalid email format (400):**
```json
{
  "error": "Invalid email format"
}
```

4. **Weak password (400):**
```json
{
  "error": "Password must be at least 6 characters long"
}
```

**Key Features:**
- If email exists but verification expired (2 hours), the email is reassigned to the new user
- Anonymous users remain logged in during this flow (cookie auth persists)
- Creates `secret` (8 random alphanumeric), sets `secret_type = 'email_verification'`
- Sends verification email with token and link
- Does NOT log user in until email verified (except if binding anonymous user)

---

### Flow C: Email Verification

**Endpoint:** `POST /api/auth/verify-email`

**Purpose:** Verify email address with the token received in verification email.

**Request (Option 1 - Authenticated User):**
```json
{
  "code": "ABC12345"
}
```

**Request (Option 2 - Unauthenticated User):**
```json
{
  "user_id": 124,
  "code": "ABC12345"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "user": {
    "id": 124,
    "name": "John Doe",
    "email": "user@example.com",
    "email_verified": true,
    "avatar_data_url": null,
    "created_at": "2025-11-08T10:35:00",
    "registered_at": "2025-11-08T10:37:00"
  }
}
```

**Error Cases:**

1. **Invalid/expired code (400):**
```json
{
  "error": "Invalid or expired verification code"
}
```

2. **Already verified (400):**
```json
{
  "error": "Email is already verified"
}
```

3. **No email associated (400):**
```json
{
  "error": "No email associated with this account"
}
```

**Key Features:**
- Token expires after 2 hours
- Sets `email_verified = 1`, `email_verified_at`, `registered_at`
- Clears `secret`, `secret_type`, `secret_created_at`
- Sets authentication cookie (user is now logged in)

---

## Email Verification Resend

**Endpoint:** `POST /api/auth/resend-verification-email`

**Purpose:** Resend verification email if user missed it or wants a new code.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification email sent. Please check your email."
}
```

**Security Notes:**
- Returns success even if email doesn't exist (prevents email enumeration)
- Returns success if email already verified
- Doesn't allow resend if verification email was sent less than 2 hours ago
- Generates new `secret` token

---

## Password Reset Flows

### Step 1: Request Password Reset

**Endpoint:** `POST /api/auth/forgot-password`

**Purpose:** Send password reset token via email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If this email exists and is verified, a password reset email will be sent."
}
```

**Security Notes:**
- Only works with verified emails
- Doesn't reveal if email exists (prevents user enumeration)
- Sets `secret_type = 'password_reset'`, generates new 8-char secret
- Token expires after 1 hour

---

### Step 2: Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Purpose:** Set new password using reset token.

**Request:**
```json
{
  "user_id": 124,
  "code": "ABC12345",
  "password": "newSecurePassword456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password."
}
```

**Error Cases:**

1. **Invalid/expired code (400):**
```json
{
  "error": "Invalid or expired reset code"
}
```

2. **Weak password (400):**
```json
{
  "error": "Password must be at least 6 characters long"
}
```

**Key Features:**
- Updates `password_hash`
- Clears `secret`, `secret_type`, `secret_created_at`
- Token expires after 1 hour

---

## Edge Cases & Special Handling

### Email Already Taken (Verified)
- User cannot register with that email
- Suggestion: Use "Password Reset" flow

### Email Already Taken (Pending Verification, not expired)
- User cannot register
- User gets message: "Email verification already in progress. Try again in X minutes."
- Verification period: 2 hours

### Email Already Taken (Pending Verification, expired)
- Email is reassigned to the new registrant
- Old unverified account still exists but loses email binding
- New user receives new verification token
- Prevents indefinite email blocking

### Anonymous User Registers with Email
- If anonymous user is logged in (has auth_token cookie)
- Email is bound to existing anonymous user
- User remains logged in
- User is NOT automatically logged in until email verified

### User Without Email Tries to Reset Password
- Endpoint rejects request (no email to send reset to)
- Should only work with verified emails

### Multiple Anonymous Users
- Each gets unique auto-generated name
- Can coexist without email binding

---

## Secret Token Generation & Validation

### Generation (8 Characters)
```php
generateRandomSecret(8)
// Returns: "ABC12345" (uppercase alphanumeric)
```

### Storage
```
secret: "ABC12345"
secret_type: "email_verification" | "password_reset"
secret_created_at: "2025-11-08T10:32:00"
```

### Validation
- Must match stored secret exactly (case-sensitive)
- Must match secret_type
- Must not be expired:
  - Email verification: 2 hours
  - Password reset: 1 hour

### After Successful Verification/Reset
- All three fields cleared (set to NULL)
- New secret cannot be generated until next request

---

## Authentication Cookie

**Cookie Name:** `auth_token`

**Value:** Signed JWT token
```
base64_encoded_payload.signature
```

**Payload:**
```json
{
  "user_id": 124,
  "iat": 1699447400,
  "exp": 1699533800
}
```

**Expiration:** 24 hours

**Options:**
- `httponly`: true (can't access via JavaScript)
- `samesite`: Lax
- `secure`: false (set to true in production with HTTPS)
- `path`: /

---

## Login After Registration

### If Email Verified
User can login with email/password immediately after verification.

### If Email Not Yet Verified
- User is NOT logged in after registration submission
- User must verify email first
- After verification, user gets auth token + cookie

### Anonymous to Email Binding
- User stays logged in as anonymous user
- After email registration, user still uses original auth token
- After email verification, auth token is refreshed for the new fully-registered state

---

## Email Templates

### Verification Email
```
Subject: Verify your Ticross account email

Hi [Name],

Please verify your email by entering this code:

[8-CHAR CODE]

Or click this link:
https://[domain]/verify-email?code=[CODE]

This code expires in 2 hours.

If you didn't request this, please ignore this email.

Best regards,
Ticross Team
```

### Password Reset Email
```
Subject: Reset your Ticross password

Hi [Name],

Please reset your password using this code:

[8-CHAR CODE]

Or click this link:
https://[domain]/reset-password?code=[CODE]

This code expires in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
Ticross Team
```

---

## Email Sending

Currently uses PHP `mail()` function:
- Sends from: `noreply@ticross.local`
- Content-Type: `text/plain; charset=UTF-8`
- Works with Hetzner webhosting (SPF/DKIM configured)

**Future Improvement:** Could integrate with SendGrid, Mailgun, or other service providers by updating `sendVerificationEmail()` and `sendPasswordResetEmail()` functions.

---

## Testing Checklist

- [ ] Anonymous user registration (no email)
- [ ] Register with email (new user)
- [ ] Bind email to anonymous user
- [ ] Email verification with correct token
- [ ] Email verification with invalid/expired token
- [ ] Email already verified error
- [ ] Duplicate email (verified) registration
- [ ] Duplicate email (pending, not expired)
- [ ] Duplicate email (pending, expired) - reassignment
- [ ] Resend verification email
- [ ] Forgot password flow
- [ ] Reset password with valid token
- [ ] Reset password with expired token
- [ ] Password strength validation (< 6 chars rejected)
- [ ] Email format validation
- [ ] Verify 2-hour expiration works
- [ ] Verify auth cookie is set
- [ ] Verify user can login after verification
- [ ] Verify anonymous user without email can't reset password

---

## Security Considerations

1. **Token Generation:** Uses cryptographically secure `random_int()` for 8-char token
2. **Token Comparison:** Uses `hash_equals()` to prevent timing attacks
3. **Email Enumeration:** Endpoints don't reveal if email exists (silent failures)
4. **Password Security:** Minimum 6 characters, uses `PASSWORD_DEFAULT` hashing
5. **Expiration:** 2 hours for email verification, 1 hour for password reset
6. **Cookie Security:** HttpOnly, SameSite=Lax, set to Secure in production
7. **XSS Prevention:** Email content is sanitized with `htmlspecialchars()`
8. **CSRF Protection:** SameSite cookie attribute prevents CSRF

---

## API Summary

| Endpoint | Method | Authentication | Purpose |
|----------|--------|-----------------|---------|
| `/auth/register-anonymous` | POST | No | Create anonymous user |
| `/auth/register` | POST | No (or token) | Register with email |
| `/auth/verify-email` | POST | No (or token) | Verify email with token |
| `/auth/resend-verification-email` | POST | No | Resend verification email |
| `/auth/forgot-password` | POST | No | Request password reset |
| `/auth/reset-password` | POST | No | Set new password |
| `/auth/login` | POST | No | Login with email/password |
| `/auth/logout` | POST | No | Logout and clear cookie |
| `/auth/current-user` | GET | Yes | Get authenticated user info |
