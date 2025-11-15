# Ticross Registration System - Implementation Summary

## ✅ Completed Implementation

### 1. Database Schema Updated (`config.php`)
- **Email column**: Made `NULL` (nullable for anonymous users)
- **Password column**: Made `NULL` (anonymous users don't have passwords)
- **New columns added**:
  - `secret TEXT` - Stores 8-character random token
  - `secret_type TEXT` - Type of token: `email_verification` or `password_reset`
  - `secret_created_at DATETIME` - When token was generated
  - `email_verified_at DATETIME` - When email was verified
- **Improved column comments**: Updated to reflect Ticross game (not chat)

### 2. Token Generation System (`auth.php`)
- **`generateRandomSecret(length)`** - Creates 8-char alphanumeric tokens
  - Uses cryptographically secure `random_int()`
  - Format: `ABC12345` (uppercase + numbers)
  - Very easy for users to type but secure (36^8 possibilities)
  
- **`setUserSecret(userId, secretType)`** - Sets token for user
  - Automatically generates new 8-char secret
  - Sets timestamp for expiration checking
  
- **`verifyUserSecret(userId, secret, type, hours)`** - Validates token
  - Constant-time comparison with `hash_equals()` (prevents timing attacks)
  - Checks type matches
  - Checks expiration based on hours parameter
  
- **`isSecretExpired(timestamp, hours)`** - Simple expiration check

- **`clearUserSecret(userId)`** - Removes token after successful use

### 3. Registration Flow A: Anonymous Users
**Endpoint**: `POST /api/auth/register-anonymous`

**Behavior:**
- ✅ Creates user without email or password
- ✅ Generates unique auto-name if not provided (e.g., `User_A1B2C3D4`)
- ✅ Sets authentication cookie immediately
- ✅ Prevents logged-in users from creating another anonymous account
- ✅ Returns authenticated user object

**Use Case:** User wants to play immediately without providing email

---

### 4. Registration Flow B: Email Registration
**Endpoint**: `POST /api/auth/register`

**Behavior - New User:**
- ✅ Creates new user with email + password
- ✅ Validates email format
- ✅ Validates password strength (6+ chars)
- ✅ Generates 8-char verification token
- ✅ Sends verification email via `mail()`
- ✅ Does NOT log user in (awaiting verification)

**Behavior - Binding to Anonymous:**
- ✅ If user has auth cookie (anonymous), binds email to that user
- ✅ Sets password for previously passwordless user
- ✅ User remains authenticated via original cookie
- ✅ Sends verification email

**Behavior - Duplicate Email (Verified):**
- ✅ Returns 409 error
- ✅ Suggests password reset flow

**Behavior - Duplicate Email (Pending, <2 hours):**
- ✅ Returns 409 error
- ✅ Tells user exactly how many minutes to wait
- ✅ Prevents email blocking indefinitely

**Behavior - Duplicate Email (Pending, >2 hours expired):**
- ✅ Reassigns email to new registrant
- ✅ Old unverified user loses email (but account persists)
- ✅ Generates new verification token

---

### 5. Email Verification Flow
**Endpoint**: `POST /api/auth/verify-email`

**Behavior:**
- ✅ Accepts either auth token (logged in) or user_id + code
- ✅ Validates token against stored secret
- ✅ Checks expiration (2 hours)
- ✅ Prevents already-verified emails from reverification
- ✅ Sets `email_verified = 1` and `email_verified_at` timestamp
- ✅ Sets `registered_at` timestamp (marks user as fully registered)
- ✅ Clears secret token after successful use
- ✅ Sets auth cookie (user is now logged in)

**Error Cases Handled:**
- Invalid or expired code
- Already verified
- No email associated
- User not found

---

### 6. Resend Verification Email
**Endpoint**: `POST /api/auth/resend-verification-email`

**Behavior:**
- ✅ Allows resending verification email
- ✅ Generates new verification code
- ✅ Doesn't allow resend if last email sent <2 hours ago
- ✅ Returns success even if email doesn't exist (prevents enumeration)
- ✅ Returns success if already verified (prevents enumeration)

---

### 7. Password Reset Flow
**Endpoint 1**: `POST /api/auth/forgot-password`

**Behavior:**
- ✅ Only works for verified emails
- ✅ Generates password reset token
- ✅ Sends reset email with code + link
- ✅ Returns success even if email not found (prevents enumeration)
- ✅ Token expires after 1 hour

**Endpoint 2**: `POST /api/auth/reset-password`

**Behavior:**
- ✅ Accepts user_id + reset code + new password
- ✅ Validates token against stored secret
- ✅ Checks expiration (1 hour)
- ✅ Updates password hash
- ✅ Clears reset token after use
- ✅ User can then login with new password

---

### 8. Email Functions
**`sendVerificationEmail(email, secret, name)`**
- ✅ Sends via PHP `mail()` function
- ✅ Includes 8-char code in email body
- ✅ Includes verification link with code as parameter
- ✅ Includes expiration time (2 hours)
- ✅ Sanitizes user name with `htmlspecialchars()`

**`sendPasswordResetEmail(email, secret, name)`**
- ✅ Sends via PHP `mail()` function
- ✅ Includes 8-char code in email body
- ✅ Includes reset link with code as parameter
- ✅ Includes expiration time (1 hour)
- ✅ Sanitizes user name with `htmlspecialchars()`

---

### 9. Helper Functions
**`setAuthCookie(token)`**
- ✅ Centralized cookie setting
- ✅ HttpOnly, SameSite=Lax, 24-hour expiration
- ✅ Set `secure=true` in production

**`formatUserResponse(user)`**
- ✅ Formats user data for API responses
- ✅ Includes email verification status
- ✅ Includes registered_at timestamp

---

## 🔒 Security Features Implemented

| Feature | Implementation |
|---------|-----------------|
| **Token Security** | Uses cryptographically secure random generation |
| **Timing Attacks** | `hash_equals()` for constant-time comparison |
| **Email Enumeration** | Silent failures on /forgot-password and /resend endpoints |
| **Password Hashing** | `PASSWORD_DEFAULT` (bcrypt) |
| **Token Expiration** | Time-based (2 hrs verification, 1 hr reset) |
| **Cookie Security** | HttpOnly, SameSite, 24-hour expiration |
| **XSS Prevention** | `htmlspecialchars()` in emails |
| **Password Requirements** | Minimum 6 characters, strength can be enhanced |
| **Email Validation** | `filter_var(..., FILTER_VALIDATE_EMAIL)` |

---

## 📊 Configuration Options

In `auth.php`, easily adjustable:
```php
$emailVerificationExpirationHours = 2;  // How long until verification expires
$passwordResetExpirationHours = 1;     // How long until reset token expires
```

---

## 📧 Email Configuration

**Current Setup (Hetzner):**
- Uses PHP `mail()` function
- Sender: `noreply@ticross.local`
- Content-Type: `text/plain; charset=UTF-8`

**To verify email is working:**
```bash
php -r "mail('your@email.com', 'Test', 'This is a test');"
```

**To switch to external service:**
Edit `sendVerificationEmail()` and `sendPasswordResetEmail()` functions to use SendGrid, Mailgun, etc.

---

## 🧪 Testing Checklist

All scenarios covered in `/api/TEST_REGISTRATION.php`:

### Basic Flows
- [ ] Anonymous user registration
- [ ] Email registration (new user)
- [ ] Email registration (bind to anonymous)
- [ ] Email verification with valid code
- [ ] Login after verification
- [ ] Logout

### Edge Cases
- [ ] Duplicate email (verified) → 409
- [ ] Duplicate email (pending <2hrs) → 409 with wait time
- [ ] Duplicate email (pending >2hrs) → Reassignment
- [ ] Invalid email format → 400
- [ ] Weak password (<6 chars) → 400
- [ ] Token expiration (2+ hours) → Invalid
- [ ] Already verified email → Error
- [ ] Invalid token → Error

### Email Features
- [ ] Resend verification email
- [ ] Forgot password flow
- [ ] Reset password with valid code
- [ ] Reset password with expired code

---

## 📁 Files Modified/Created

| File | Changes |
|------|---------|
| `/backend/api/config.php` | Updated schema: nullable email/password, added secret columns |
| `/backend/api/auth.php` | Added 7 new endpoints + 11 helper functions |
| `/backend/api/REGISTRATION_API.md` | **NEW**: Complete API documentation |
| `/backend/api/TEST_REGISTRATION.php` | **NEW**: Testing guide with curl examples |

---

## 🎯 What's Ready for Frontend

### Endpoints Available
```
POST /api/auth/register-anonymous          # Register without email
POST /api/auth/register                    # Register with email
POST /api/auth/verify-email                # Verify email with code
POST /api/auth/resend-verification-email   # Resend code
POST /api/auth/forgot-password             # Request reset
POST /api/auth/reset-password              # Set new password
POST /api/auth/login                       # Login (existing)
POST /api/auth/logout                      # Logout (existing)
GET  /api/auth/current-user                # Get user info (existing)
```

### Frontend Implementation Needed
1. **Anonymous Login Page** - Button to register anonymously
2. **Email Registration Form** - Email + Password
3. **Email Verification Page** - Input for 6-8 char code
4. **Password Reset Form** - "Forgot Password?" flow
5. **Profile Page** - Show email verification status

---

## 🚀 Next Steps

1. **Test the API** using curl commands in `TEST_REGISTRATION.php`
2. **Update frontend** to use new registration endpoints
3. **Configure email** on Hetzner hosting
4. **Monitor logs** for email delivery issues
5. **Set production variables**:
   - Change `$secret` to long random string
   - Set `secure=true` on cookies (requires HTTPS)
   - Update `From:` email address

---

## 💡 Future Enhancements

- [ ] Social login (Google, GitHub)
- [ ] Email confirmation before public profile
- [ ] Rate limiting on verification/reset attempts
- [ ] Account deletion endpoint
- [ ] Change email endpoint (for verified users)
- [ ] Two-factor authentication
- [ ] OAuth2 integration
- [ ] Custom email templates (HTML)
- [ ] Email verification enforcement (block features until verified)

---

## ❓ Questions Addressed

### Q: What about anonymous users without email?
**A:** They can play indefinitely. Account persists in database with unique name. Can register email later to "upgrade" to verified user.

### Q: What if user registers email but never verifies?
**A:** After 2 hours, email is available for someone else. Original user's account keeps name but loses email binding.

### Q: Can user change email after verification?
**A:** Not yet implemented. Would need separate endpoint. Current design focuses on registration flow.

### Q: Is password reset secure?
**A:** Yes - only works for verified emails, 1-hour expiration, uses same token mechanism.

### Q: How do we prevent abuse (spam registrations)?
**A:** Add rate limiting per IP/email - not yet implemented, recommended for production.

---

Generated: 2025-11-08
Status: ✅ Ready for Testing & Frontend Integration
