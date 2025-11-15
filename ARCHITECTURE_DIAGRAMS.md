# Ticross Registration System - Architecture & Flow Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      TICROSS FRONTEND                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Login      │  │  Register    │  │   Verify     │          │
│  │   Page       │  │   Pages      │  │   Email      │          │
│  │              │  │              │  │   Page       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │   API_EXAMPLES.js Functions       │
            │   (JavaScript/TypeScript)         │
            │                                   │
            │ - registerAnonymous()            │
            │ - registerWithEmail()            │
            │ - verifyEmail()                  │
            │ - forgotPassword()               │
            │ - resetPassword()                │
            │ - login()                        │
            │ - getCurrentUser()               │
            └───────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────────┐
        │  HTTP Requests (JSON + Cookies)             │
        │                                              │
        │  POST /api/auth.php/register-anonymous      │
        │  POST /api/auth.php/register                │
        │  POST /api/auth.php/verify-email            │
        │  POST /api/auth.php/forgot-password         │
        │  POST /api/auth.php/reset-password          │
        │  GET  /api/auth.php/current-user            │
        │  POST /api/auth.php/login                   │
        └──────────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────────┐
        │  /backend/api/auth.php                      │
        │                                              │
        │  Handler Functions:                         │
        │  - handleRegisterAnonymous()                │
        │  - handleRegister()                         │
        │  - handleVerifyEmail()                      │
        │  - handleForgotPassword()                   │
        │  - handleResetPassword()                    │
        │  - handleLogin()                            │
        │  - getCurrentUser()                         │
        │                                              │
        │  Helper Functions:                          │
        │  - generateRandomSecret()                   │
        │  - setUserSecret()                          │
        │  - verifyUserSecret()                       │
        │  - sendVerificationEmail()                  │
        │  - sendPasswordResetEmail()                 │
        └──────────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────────┐
        │  SQLite Database (/backend/api/ticross.sqlite)│
        │                                              │
        │  users table:                               │
        │  - id, name, email, password_hash          │
        │  - secret, secret_type, secret_created_at  │
        │  - email_verified, email_verified_at       │
        │  - blocked, registered_at, created_at      │
        │                                              │
        │  permissions table:                         │
        │  - user_id, permission, entity_id          │
        └──────────────────────────────────────────────┘
```

---

## 🔄 Registration Flow: Anonymous → Email → Verified

```
USER                    FRONTEND                    BACKEND                   DATABASE
│                          │                           │                          │
├─ Click "Play"             │                           │                          │
│  Anonymously              │                           │                          │
├────────────────────────→ │                           │                          │
│                          │ POST /register-            │                          │
│                          │ anonymous                 │                          │
│                          ├──────────────────────────→ │                          │
│                          │                           │ Generate 8-char name    │
│                          │                           │ Create user             │
│                          │                           ├─────────────────────────→
│                          │                           │                          │ INSERT user
│                          │                           │◄─────────────────────────┤
│                          │  ✅ 200 OK                │                          │
│                          │  user: {id, name}         │                          │
│                          │◄──────────────────────────┤                          │
│ Set auth_token           │                           │                          │
│ cookie                   │                           │                          │
│◄──────────────────────────                          │                          │
│                          │                           │                          │
│ Can now PLAY             │                           │                          │
│ (Anonymous Account)      │                           │                          │
│ ✅ PLAYING ✅            │                           │                          │
│                          │                           │                          │
├─ Click "Add Email"       │                           │                          │
│  to Register             │                           │                          │
├────────────────────────→ │                           │                          │
│                          │ POST /register            │                          │
│                          │ {email, password}         │                          │
│                          ├──────────────────────────→ │                          │
│                          │                           │ Check email exists     │
│                          │                           │ Bind to user           │
│                          │                           │ Create verification    │
│                          │                           │ token (8 chars)        │
│                          │                           ├─────────────────────────→
│                          │                           │                          │ UPDATE user
│                          │                           │◄─────────────────────────┤
│                          │  ✅ 200 OK                │                          │
│                          │  code: ABC12345           │                          │
│                          │  (for dev, removed prod)  │                          │
│                          │◄──────────────────────────┤                          │
│ Show verification        │                           │ Send email              │
│ code input               │◄──────────────────────────→ SMTP/mail() ────→ 📧    │
│                          │                           │                          │
│ Can still PLAY           │                           │                          │
│ (Awaiting verification)  │                           │                          │
│ ✅ PLAYING ✅            │                           │                          │
│                          │                           │                          │
├─ Check email             │                           │                          │
├─ Enter code from email   │                           │                          │
├────────────────────────→ │                           │                          │
│                          │ POST /verify-email        │                          │
│                          │ {code}                    │                          │
│                          ├──────────────────────────→ │                          │
│                          │                           │ Verify code            │
│                          │                           │ Check expiration (2h)  │
│                          │                           │ Mark verified          │
│                          │                           │ Set registered_at      │
│                          │                           │ Clear token            │
│                          │                           ├─────────────────────────→
│                          │                           │                          │ UPDATE user
│                          │                           │◄─────────────────────────┤
│                          │  ✅ 200 OK                │                          │
│                          │  user: {email_verified}   │                          │
│                          │◄──────────────────────────┤                          │
│ Update UI                │                           │                          │
│ Show "Email Verified"    │                           │                          │
│ ✅ VERIFIED ✅           │                           │                          │
│                          │                           │                          │
│ Can now also login with  │                           │                          │
│ email + password later   │                           │                          │
│                          │                           │                          │
```

---

## 📧 Password Reset Flow

```
USER                    FRONTEND                    BACKEND                   DATABASE
│                          │                           │                          │
├─ Click "Forgot           │                           │                          │
│  Password?"              │                           │                          │
├────────────────────────→ │                           │                          │
│                          │ POST /forgot-password     │                          │
│                          │ {email}                   │                          │
│                          ├──────────────────────────→ │                          │
│                          │                           │ Find user by email     │
│                          │                           │ (only if verified)     │
│                          │                           │ Create reset token     │
│                          │                           │ (8 chars, 1h exp)      │
│                          │                           ├─────────────────────────→
│                          │                           │                          │ UPDATE user
│                          │                           │◄─────────────────────────┤
│                          │  ✅ 200 OK                │ Send email              │
│                          │  (no email leaked)        │◄──────────────────────→ SMTP
│                          │◄──────────────────────────┤                          │
│                          │                           │                          │
├─ Check email             │                           │                          │
├─ Click reset link        │                           │                          │
├─ Enter new password      │                           │                          │
├────────────────────────→ │                           │                          │
│                          │ POST /reset-password      │                          │
│                          │ {user_id, code,          │                          │
│                          │  password}               │                          │
│                          ├──────────────────────────→ │                          │
│                          │                           │ Verify token           │
│                          │                           │ Check expiration (1h)  │
│                          │                           │ Update password        │
│                          │                           │ Clear token            │
│                          │                           ├─────────────────────────→
│                          │                           │                          │ UPDATE user
│                          │                           │◄─────────────────────────┤
│                          │  ✅ 200 OK                │                          │
│                          │◄──────────────────────────┤                          │
│                          │                           │                          │
│ Show success message     │                           │                          │
│ Redirect to login        │                           │                          │
├────────────────────────→ │                           │                          │
│                          │ POST /login               │                          │
│                          │ {email, password}         │                          │
│                          ├──────────────────────────→ │                          │
│                          │                           │ Verify credentials     │
│                          │                           ├─────────────────────────→
│                          │                           │                          │ SELECT user
│                          │                           │◄─────────────────────────┤
│                          │  ✅ 200 OK                │                          │
│                          │  auth_token cookie       │                          │
│                          │◄──────────────────────────┤                          │
│ Set auth_token           │                           │                          │
│ cookie                   │                           │                          │
│ Redirect to game         │                           │                          │
│ ✅ LOGGED IN ✅          │                           │                          │
│                          │                           │                          │
```

---

## 🎯 User State Machine

```
┌─────────────┐
│  NOT FOUND  │  (No user)
└─────────────┘
       │
       │ POST /register-anonymous
       │ POST /register
       ↓
┌─────────────────────────────────┐
│  ANONYMOUS                      │
│  ├─ id: 1                      │
│  ├─ name: User_A1B2C3D4        │
│  ├─ email: NULL                │
│  ├─ password_hash: NULL        │
│  ├─ email_verified: false      │
│  └─ secret: NULL               │
└─────────────────────────────────┘
       │
       │ Can play immediately! ✅
       │
       ├─ POST /register {email, password}
       │  (Binds email to this user)
       │  (Generates verification token)
       │  (Sends email)
       │
       ↓
┌─────────────────────────────────┐
│  PENDING VERIFICATION           │
│  ├─ id: 1                      │
│  ├─ email: user@example.com    │
│  ├─ password_hash: (set)       │
│  ├─ email_verified: false      │
│  ├─ secret: ABC12345           │
│  ├─ secret_type: email_verify  │
│  ├─ secret_created_at: NOW     │
│  └─ Can still PLAY! ✅          │
└─────────────────────────────────┘
       │
       │ Timeout: 2 hours → email becomes available
       │ OR:
       ├─ POST /verify-email {code}
       │  (Validates token)
       │  (Clears token)
       │  (Sets email_verified_at)
       │  (Sets registered_at)
       │  (Sets auth cookie)
       │
       ↓
┌─────────────────────────────────┐
│  FULLY REGISTERED & VERIFIED    │
│  ├─ id: 1                      │
│  ├─ email: user@example.com    │
│  ├─ password_hash: (set)       │
│  ├─ email_verified: true       │
│  ├─ email_verified_at: NOW     │
│  ├─ registered_at: NOW         │
│  ├─ secret: NULL               │
│  └─ Can PLAY & LOGIN! ✅ ✅    │
└─────────────────────────────────┘
       │
       │ (If forgot password)
       ├─ POST /forgot-password
       │  (Creates password_reset token)
       │  (Sends reset email)
       │
       ↓
┌─────────────────────────────────┐
│  PENDING PASSWORD RESET         │
│  ├─ All fields same             │
│  ├─ secret: DEF67890            │
│  ├─ secret_type: password_reset │
│  ├─ secret_created_at: NOW     │
│  └─ (1-hour expiration)        │
└─────────────────────────────────┘
       │
       ├─ POST /reset-password {code, new_pass}
       │  (Validates token)
       │  (Updates password_hash)
       │  (Clears token)
       │
       ↓
┌─────────────────────────────────┐
│  FULLY REGISTERED & VERIFIED    │
│  (With new password)            │
│  └─ Can PLAY & LOGIN! ✅ ✅    │
└─────────────────────────────────┘

```

---

## 🛡️ Security Flow

```
Request                                  Validation
  │                                          │
  ├─ HTTP/JSON                              │
  │  (method, headers, body)               │
  │                                          ↓
  ├─ Cookie (if present)                   ├─ Check HTTP method (POST/GET)
  │  (auth_token)                          ├─ Check Content-Type
  │                                          ├─ Parse JSON
  ├─ Email/Password                         │  (PDOException on invalid)
  │                                          └─ Check for required fields
  ├─ Token/Code (6-8 chars)                
  │  (for verification)                    Verification
  │                                          │
  └─ User ID (optional)                     ├─ Verify auth token (if present)
                                             │  ├─ Decode payload
       Input Sanitization                    │  ├─ Check signature
            │                                │  └─ Check expiration
            │                                │
            ├─ Email: filter_var()           ├─ Verify secret code (if present)
            │  FILTER_VALIDATE_EMAIL         │  ├─ hash_equals() [constant-time]
            │                                │  ├─ Check type matches
            ├─ Password: strlen() >= 6       │  └─ Check expiration
            │                                │
            ├─ Code: hex validation          ├─ Check user exists
            │                                │  └─ SELECT by ID
            └─ User ID: intval()             │
                                             └─ Check permissions
       Database Query                         (MANAGE_USERS, etc)
            │
            ├─ Prepared statements            Response
            │  (PDO::prepare)                 │
            │  (No string concatenation)     └─ HTTP status code
            │                                   ├─ 200 OK
            ├─ Password hashing               ├─ 400 Bad Request
            │  (PASSWORD_DEFAULT = bcrypt)    ├─ 401 Unauthorized
            │                                  ├─ 403 Forbidden
            ├─ Token generation              ├─ 404 Not Found
            │  (random_int() for each char)  └─ 409 Conflict
            │
            └─ Transaction control            JSON Response
               (beginTransaction/commit)       ├─ success: bool
                                              ├─ error: string (if error)
                                              ├─ user: object (if success)
                                              └─ message: string

       Cookie Setting
            │
            ├─ HttpOnly ✓
            │  (JS cannot access)
            │
            ├─ SameSite=Lax ✓
            │  (CSRF protection)
            │
            ├─ Path=/
            │
            ├─ Expires: +24 hours
            │
            └─ Secure: false (true in HTTPS)

```

---

## 🔄 Token Lifecycle

```
EMAIL VERIFICATION TOKEN
═════════════════════════

User registers with email
         │
         ├─ generateRandomSecret(8)
         │  └─ "ABC12345" (8 uppercase alphanumeric)
         │
         ├─ Storage:
         │  ├─ secret = "ABC12345"
         │  ├─ secret_type = "email_verification"
         │  ├─ secret_created_at = NOW
         │
         ├─ Sent in email:
         │  ├─ Code: ABC12345
         │  ├─ Link: /verify-email?code=ABC12345
         │
         ├─ User clicks or enters code
         │
         ├─ Validation:
         │  ├─ hash_equals(stored, provided)
         │  ├─ Check type = email_verification
         │  ├─ Check age < 2 hours
         │
         ├─ If valid:
         │  ├─ Set email_verified = 1
         │  ├─ Set email_verified_at = NOW
         │  ├─ Set registered_at = NOW
         │  ├─ Clear secret
         │  ├─ Set auth cookie
         │  └─ ✅ SUCCESS
         │
         └─ If invalid/expired:
            └─ User can call /resend-verification-email
               └─ New token generated (starts timer again)

PASSWORD RESET TOKEN
═══════════════════════

User clicks "Forgot Password"
         │
         ├─ User provides email
         │
         ├─ Server finds user (email must be verified!)
         │
         ├─ generateRandomSecret(8)
         │  └─ "DEF67890"
         │
         ├─ Storage:
         │  ├─ secret = "DEF67890"
         │  ├─ secret_type = "password_reset"
         │  ├─ secret_created_at = NOW
         │
         ├─ Sent in email:
         │  ├─ Code: DEF67890
         │  ├─ Link: /reset-password?code=DEF67890
         │
         ├─ User provides code + new password
         │
         ├─ Validation:
         │  ├─ hash_equals(stored, provided)
         │  ├─ Check type = password_reset
         │  ├─ Check age < 1 hour
         │
         ├─ If valid:
         │  ├─ Hash new password (PASSWORD_DEFAULT)
         │  ├─ Update password_hash
         │  ├─ Clear secret
         │  └─ ✅ SUCCESS
         │
         └─ If invalid/expired:
            └─ User can call /forgot-password again
               └─ New token generated

AUTH COOKIE
═════════════════════════

After successful login/verification
         │
         ├─ generateSignedToken(userId)
         │  ├─ Create payload:
         │  │  ├─ user_id: 123
         │  │  ├─ iat: 1699447400
         │  │  └─ exp: 1699533800 (+24h)
         │  │
         │  ├─ Base64 encode payload
         │  ├─ HMAC-SHA256 sign with secret
         │  └─ Return: "payload.signature"
         │
         ├─ setAuthCookie(token)
         │  ├─ Set cookie: auth_token = token
         │  ├─ HttpOnly: true (JS can't see it)
         │  ├─ SameSite: Lax (CSRF protection)
         │  ├─ Path: /
         │  ├─ Expires: +24 hours
         │  └─ Secure: false (true in production HTTPS)
         │
         ├─ Browser stores cookie
         │
         ├─ Cookie sent in every request (credentials: 'include')
         │
         ├─ On each request:
         │  ├─ Server extracts token from cookie
         │  ├─ Decodes and verifies signature
         │  ├─ Checks expiration
         │  ├─ Returns user_id if valid
         │  └─ Returns false if invalid/expired
         │
         └─ After 24 hours:
            ├─ Cookie expires automatically
            ├─ Browser deletes cookie
            └─ User must login again

```

---

## 📊 Database Schema Visualization

```
users TABLE
╔════╦═══════════════╦═════════════════╦══════════════════╗
║ id ║ name          ║ email           ║ password_hash    ║
╠════╬═══════════════╬═════════════════╬══════════════════╣
║ 1  ║ admin         ║ admin@exam.com  ║ (bcrypt hash)    ║
║ 2  ║ User_A1B2C3D4 ║ NULL            ║ NULL             ║  Anonymous
║ 3  ║ John Doe      ║ john@exam.com   ║ (bcrypt hash)    ║  Pending
║ 4  ║ Jane Smith    ║ jane@exam.com   ║ (bcrypt hash)    ║  Verified
╚════╩═══════════════╩═════════════════╩══════════════════╝

║ avatar_data_url  ║ blocked ║ email_verified ║ email_verified_at
╟──────────────────╢─────────╢────────────────╢──────────────────
║ (null)           ║ 0       ║ 1              ║ 2025-11-08 10:00
║ (null)           ║ 0       ║ 0              ║ NULL
║ (data_url)       ║ 0       ║ 0              ║ NULL
║ (data_url)       ║ 0       ║ 1              ║ 2025-11-08 09:00
╟──────────────────╢─────────╢────────────────╢──────────────────

║ secret    ║ secret_type          ║ secret_created_at       ║ registered_at
╟───────────╢──────────────────────╢─────────────────────────╢────────────────
║ NULL      ║ NULL                 ║ NULL                    ║ 2025-11-08 09:00
║ NULL      ║ NULL                 ║ NULL                    ║ NULL
║ ABC12345  ║ email_verification   ║ 2025-11-08 10:30:00     ║ NULL
║ NULL      ║ NULL                 ║ NULL                    ║ 2025-11-08 09:00
╟───────────╢──────────────────────╢─────────────────────────╢────────────────

║ created_at
╟────────────────────────
║ 2025-11-08 08:00:00
║ 2025-11-08 10:15:00
║ 2025-11-08 10:25:00
║ 2025-11-08 09:00:00
╚═══════════════════════

KEY STATES:
═══════════
Row 1: Admin (verified, has permissions)
Row 2: Anonymous (no email, can play)
Row 3: Pending (has email & password, waiting for verification)
Row 4: Fully Registered (verified, can login & play)

```

---

## 🚀 Deployment Pipeline

```
Development
   ↓
   ├─ 1. Run config.php to initialize DB
   ├─ 2. Test endpoints with curl (TEST_REGISTRATION.php)
   ├─ 3. Test frontend with API_EXAMPLES.js
   ├─ 4. Review email sending
   └─ 5. Check database contents

Staging (Optional)
   ↓
   ├─ 1. Test with real users
   ├─ 2. Monitor email delivery
   ├─ 3. Test expiration flows (wait 2 hours)
   ├─ 4. Test edge cases
   └─ 5. Load testing

Production
   ↓
   ├─ 1. Backup database
   ├─ 2. Deploy auth.php + config.php
   ├─ 3. Update $secret to long random string
   ├─ 4. Set cookies secure=true (HTTPS only)
   ├─ 5. Configure SPF/DKIM/DMARC
   ├─ 6. Test endpoints
   ├─ 7. Monitor logs
   ├─ 8. Set up backups
   └─ 9. Launch! 🚀

```

---

This documentation provides visual understanding of:
- System architecture
- User flows and state transitions
- Security validation flow
- Token lifecycle
- Database structure
- Deployment process

For more details, see the other documentation files in the repository.
