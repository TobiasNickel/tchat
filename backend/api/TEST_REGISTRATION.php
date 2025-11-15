#!/usr/bin/env php
<?php
/**
 * Ticross Registration API - Quick Test Script
 * 
 * This script demonstrates and tests the new registration/email verification flows.
 * Run from command line: php test-registration.php
 * 
 * Or use curl commands below for manual testing.
 */

echo "=== Ticross Registration API Test Script ===\n\n";

// For manual testing, use these curl commands:

echo "MANUAL TESTING WITH CURL:\n";
echo "=========================\n\n";

echo "1. ANONYMOUS REGISTRATION:\n";
echo "   curl -X POST http://localhost:8080/ticross/api/auth.php/register-anonymous \\\n";
echo "     -H 'Content-Type: application/json' \\\n";
echo "     -d '{\"name\": \"TestUser\"}'\n\n";

echo "2. EMAIL REGISTRATION (New User):\n";
echo "   curl -X POST http://localhost:8080/ticross/api/auth.php/register \\\n";
echo "     -H 'Content-Type: application/json' \\\n";
echo "     -d '{\"email\": \"test@example.com\", \"password\": \"TestPass123\", \"name\": \"Test User\"}'\n\n";

echo "3. EMAIL REGISTRATION (Bind to Anonymous):\n";
echo "   # First register anonymous, copy the auth_token cookie\n";
echo "   curl -X POST http://localhost:8080/ticross/api/auth.php/register-anonymous \\\n";
echo "     -H 'Content-Type: application/json' \\\n";
echo "     -c cookies.txt \\\n";
echo "     -d '{}'\n";
echo "\n   # Then register email (cookie will be auto-sent):\n";
echo "   curl -X POST http://localhost:8080/ticross/api/auth.php/register \\\n";
echo "     -H 'Content-Type: application/json' \\\n";
echo "     -b cookies.txt \\\n";
echo "     -d '{\"email\": \"test2@example.com\", \"password\": \"TestPass123\"}'\n\n";

echo "4. VERIFY EMAIL:\n";
echo "   # Replace CODE with the actual code from the email/response\n";
echo "   curl -X POST http://localhost:8080/ticross/api/auth.php/verify-email \\\n";
echo "     -H 'Content-Type: application/json' \\\n";
echo "     -d '{\"user_id\": 1, \"code\": \"ABC12345\"}'\n\n";

echo "5. RESEND VERIFICATION EMAIL:\n";
echo "   curl -X POST http://localhost:8080/ticross/api/auth.php/resend-verification-email \\\n";
echo "     -H 'Content-Type: application/json' \\\n";
echo "     -d '{\"email\": \"test@example.com\"}'\n\n";

echo "6. REQUEST PASSWORD RESET:\n";
echo "   curl -X POST http://localhost:8080/ticross/api/auth.php/forgot-password \\\n";
echo "     -H 'Content-Type: application/json' \\\n";
echo "     -d '{\"email\": \"test@example.com\"}'\n\n";

echo "7. RESET PASSWORD:\n";
echo "   # Replace CODE with the actual code from the reset email\n";
echo "   curl -X POST http://localhost:8080/ticross/api/auth.php/reset-password \\\n";
echo "     -H 'Content-Type: application/json' \\\n";
echo "     -d '{\"user_id\": 1, \"code\": \"ABC12345\", \"password\": \"NewPass456\"}'\n\n";

echo "8. LOGIN:\n";
echo "   curl -X POST http://localhost:8080/ticross/api/auth.php/login \\\n";
echo "     -H 'Content-Type: application/json' \\\n";
echo "     -c cookies.txt \\\n";
echo "     -d '{\"email\": \"test@example.com\", \"password\": \"NewPass456\"}'\n\n";

echo "9. GET CURRENT USER:\n";
echo "   curl -X GET http://localhost:8080/ticross/api/auth.php/current-user \\\n";
echo "     -H 'Authorization: Bearer TOKEN' \\\n";
echo "     -b cookies.txt\n\n";

echo "10. LOGOUT:\n";
echo "    curl -X POST http://localhost:8080/ticross/api/auth.php/logout\n\n";

echo "\n=== TEST SCENARIOS ===\n";
echo "======================\n\n";

echo "SCENARIO 1: Complete Flow (Anonymous → Email → Verified)\n";
echo "1. Call /register-anonymous\n";
echo "2. Call /register with email (using anonymous cookie)\n";
echo "3. Get verification code from response or check emails\n";
echo "4. Call /verify-email with code\n";
echo "5. Verify user is now email_verified=true\n";
echo "6. User can now login with email/password\n\n";

echo "SCENARIO 2: Direct Email Registration (No Anonymous Step)\n";
echo "1. Call /register with email (no prior login)\n";
echo "2. New user created, verification email sent\n";
echo "3. Call /verify-email with code\n";
echo "4. User logged in\n\n";

echo "SCENARIO 3: Duplicate Email (Already Verified)\n";
echo "1. Try /register with email that exists and is verified\n";
echo "2. Expect 409 error: 'Email already registered'\n";
echo "3. User should use /forgot-password to reset\n\n";

echo "SCENARIO 4: Duplicate Email (Pending Verification, Not Expired)\n";
echo "1. Register with email A\n";
echo "2. Immediately try /register with same email A again\n";
echo "3. Expect 409 error: 'Email verification already in progress'\n\n";

echo "SCENARIO 5: Duplicate Email (Pending Verification, EXPIRED)\n";
echo "1. Register with email A\n";
echo "2. Wait 2+ hours (or manually update secret_created_at in DB)\n";
echo "3. Try /register with same email A again\n";
echo "4. Success! Email reassigned to new user\n";
echo "5. Old user loses email binding\n\n";

echo "SCENARIO 6: Resend Verification Email\n";
echo "1. Register with email\n";
echo "2. Call /resend-verification-email with same email\n";
echo "3. New verification code sent\n";
echo "4. Old code no longer works\n";
echo "5. New code works for verification\n\n";

echo "SCENARIO 7: Password Reset Flow\n";
echo "1. Register and verify email\n";
echo "2. Call /forgot-password with email\n";
echo "3. Get reset code from email\n";
echo "4. Call /reset-password with code and new password\n";
echo "5. User can now login with new password\n\n";

echo "SCENARIO 8: Email Format Validation\n";
echo "1. Try /register with invalid email\n";
echo "2. Expect 400 error: 'Invalid email format'\n\n";

echo "SCENARIO 9: Password Strength Validation\n";
echo "1. Try /register with password < 6 chars\n";
echo "2. Expect 400 error: 'Password must be at least 6 characters'\n\n";

echo "SCENARIO 10: Token Expiration\n";
echo "1. Register with email\n";
echo "2. Wait 2+ hours (or manually set secret_created_at to past)\n";
echo "3. Try /verify-email with original code\n";
echo "4. Expect 400 error: 'Invalid or expired verification code'\n\n";

echo "\n=== DATABASE QUERIES FOR TESTING ===\n";
echo "======================================\n\n";

echo "View all users:\n";
echo "  SELECT id, name, email, email_verified, email_verified_at, secret, secret_type, secret_created_at FROM users;\n\n";

echo "Check pending verifications:\n";
echo "  SELECT * FROM users WHERE email_verified = 0 AND email IS NOT NULL;\n\n";

echo "Reset a user's verification (for testing expiration):\n";
echo "  UPDATE users SET secret_created_at = datetime('now', '-3 hours') WHERE id = 1;\n\n";

echo "Clear all secrets:\n";
echo "  UPDATE users SET secret = NULL, secret_type = NULL, secret_created_at = NULL;\n\n";

echo "Delete test users:\n";
echo "  DELETE FROM users WHERE id > 1; -- (keeping admin at id 1)\n\n";

echo "\n=== CURL HELPER FUNCTIONS ===\n";
echo "==============================\n\n";

echo "Save auth token from response:\n";
echo "  TOKEN=\$(curl ... | jq -r '.user.token')\n\n";

echo "Use saved token in next request:\n";
echo "  curl -H \"Authorization: Bearer \$TOKEN\" ...\n\n";

echo "Save and use cookies:\n";
echo "  curl -c cookies.txt ...  # Save cookies\n";
echo "  curl -b cookies.txt ...  # Use saved cookies\n\n";

echo "Format JSON responses nicely:\n";
echo "  curl ... | jq '.' \n\n";

echo "\n=== IMPORTANT NOTES ===\n";
echo "========================\n\n";

echo "1. Email functionality uses PHP mail() function\n";
echo "   - Check if mail is configured on your server\n";
echo "   - Test with: php -r \"mail('test@example.com', 'Test', 'Body');\" \n\n";

echo "2. Verification tokens are sent in response for development\n";
echo "   - In production, this should be removed\n";
echo "   - Only include in email\n\n";

echo "3. Cookie handling:\n";
echo "   - Cookies are HttpOnly (can't access from JS)\n";
echo "   - Cookies are SameSite=Lax\n";
echo "   - Set to Secure in production with HTTPS\n\n";

echo "4. CORS is enabled for all origins (*):\n";
echo "   - Change this in production for security\n\n";

echo "5. Secret tokens are 8 uppercase alphanumeric characters\n";
echo "   - Example: ABC12345\n";
echo "   - Simple for users to type\n";
echo "   - Hard to brute force (36^8 combinations)\n\n";

echo "6. Expiration times:\n";
echo "   - Email verification: 2 hours\n";
echo "   - Password reset: 1 hour\n";
echo "   - Auth token (cookie): 24 hours\n\n";

?>
