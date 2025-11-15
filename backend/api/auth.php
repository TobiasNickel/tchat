<?php
// Enable detailed error reporting for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set error handler to catch errors and return as JSON
set_error_handler(function($errno, $errstr, $errfile, $errline) {
  header('Content-Type: application/json');
  http_response_code(500);
  echo json_encode([
    'error' => $errstr,
    'file' => $errfile,
    'line' => $errline,
    'errno' => $errno,
    'type' => 'PHP Error'
  ]);
  exit();
});

// Set exception handler to catch exceptions and return as JSON
set_exception_handler(function($exception) {
  header('Content-Type: application/json');
  http_response_code(500);
  echo json_encode([
    'error' => $exception->getMessage(),
    'file' => $exception->getFile(),
    'line' => $exception->getLine(),
    'trace' => $exception->getTraceAsString(),
    'type' => 'Exception'
  ]);
  exit();
});

include_once './conf.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

// Configuration
$secret = 'your-secret-key-change-this-in-production-make-it-long-and-random';
$dbFile = CONFIG['db_file'];
$emailVerificationExpirationHours = 2;
$passwordResetExpirationHours = 1;

// Database connection
function getDB() {
  global $dbFile;
  try {
    $db = new PDO('sqlite:' . $dbFile);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    return $db;
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
  }
}

// Token/Secret Helper Functions
function generateRandomSecret($length = 8) {
  $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  $secret = '';
  for ($i = 0; $i < $length; $i++) {
    $secret .= $chars[random_int(0, strlen($chars) - 1)];
  }
  return $secret;
}

function setUserSecret($db, $userId, $secretType) {
  $secret = generateRandomSecret(8);
  
  $stmt = $db->prepare("
    UPDATE users 
    SET secret = :secret, secret_type = :secret_type, secret_created_at = :created_at
    WHERE id = :user_id
  ");
  $stmt->execute([
    ':secret' => $secret,
    ':secret_type' => $secretType,
    ':created_at' => date('Y-m-d H:i:s'),
    ':user_id' => $userId
  ]);
  
  return $secret;
}

function isSecretExpired($secretCreatedAt, $expirationHours) {
  $createdTime = strtotime($secretCreatedAt);
  $expirationTime = $createdTime + ($expirationHours * 3600);
  return time() > $expirationTime;
}

function verifyUserSecret($userId, $secret, $secretType, $expirationHours) {
  $db = getDB();
  $stmt = $db->prepare("
    SELECT secret, secret_type, secret_created_at 
    FROM users 
    WHERE id = :user_id
  ");
  $stmt->execute([':user_id' => $userId]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$user) {
    return false;
  }
  
  // Check secret matches and type matches
  if (!hash_equals($user['secret'] ?? '', $secret) || $user['secret_type'] !== $secretType) {
    return false;
  }
  
  // Check expiration
  if (isSecretExpired($user['secret_created_at'], $expirationHours)) {
    return false;
  }
  
  return true;
}

function clearUserSecret($db, $userId) {
  $stmt = $db->prepare("
    UPDATE users 
    SET secret = NULL, secret_type = NULL, secret_created_at = NULL
    WHERE id = :user_id
  ");
  $stmt->execute([':user_id' => $userId]);
}

// Signed Cookie Helper functions
function generateSignedToken($userId) {
  global $secret;
  $payload = json_encode([
    'user_id' => $userId,
    'iat' => time(),
    'exp' => time() + (24 * 60 * 60) // 24 hours
  ]);
  $encodedPayload = base64_encode($payload);
  $signature = hash_hmac('sha256', $encodedPayload, $secret);
  return $encodedPayload . '.' . $signature;
}

function verifySignedToken($token) {
  global $secret;
  try {
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
      return false;
    }
    
    [$encodedPayload, $signature] = $parts;
    
    // Verify signature
    $expectedSignature = hash_hmac('sha256', $encodedPayload, $secret);
    if (!hash_equals($expectedSignature, $signature)) {
      return false;
    }
    
    // Decode payload
    $payload = json_decode(base64_decode($encodedPayload), true);
    if (!$payload) {
      return false;
    }
    
    // Check expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) {
      return false;
    }
    
    return $payload['user_id'] ?? false;
  } catch (Exception $e) {
    return false;
  }
}

function getCurrentUserId() {
  $headers = getallheaders();
  $token = null;
  
  // Check for Authorization header
  if (isset($headers['Authorization'])) {
    $authHeader = $headers['authorization'] ?? $headers['Authorization'];
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
      $token = $matches[1];
    }
  }
  
  // Check for auth_token cookie
  if (!$token && isset($_COOKIE['auth_token'])) {
    $token = $_COOKIE['auth_token'];
  }
  
  if (!$token) {
    return false;
  }
  
  return verifySignedToken($token);
}

function setAuthCookie($token) {
  setcookie('auth_token', $token, [
    'expires' => time() + (24 * 60 * 60),
    'path' => '/',
    'domain' => '',
    'secure' => false, // Set to true in production with HTTPS
    'httponly' => true,
    'samesite' => 'Lax'
  ]);
}

function sendVerificationEmail($email, $secret, $userName, $userId) {
  $verificationLink = "https://" . $_SERVER['HTTP_HOST'] . CONFIG['base_url'] . "/#/auth/verify-email?code=" . urlencode($secret) . "&user_id=" . urlencode($userId);
  $subject = "Verify your Ticross account email";
  $message = "Hi " . htmlspecialchars($userName) . ",\n\n";
  $message .= "Please verify your email by entering this code:\n\n";
  $message .= $secret . "\n\n";
  $message .= "Or click this link:\n";
  $message .= $verificationLink . "\n\n";
  $message .= "This code expires in 2 hours.\n\n";
  $message .= "If you didn't request this, please ignore this email.\n\n";
  $message .= "Best regards,\nTicross Team";
  
  $headers = "From: noreply@ticross.local\r\nContent-Type: text/plain; charset=UTF-8";
  
  return mail($email, $subject, $message, $headers);
}

function sendPasswordResetEmail($email, $secret, $userName, $userId) {
  $resetLink = "https://" . $_SERVER['HTTP_HOST'] . CONFIG['base_url'] . "/#/auth/reset-password?code=" . urlencode($secret) . "&user_id=" . urlencode($userId);
  $subject = "Reset your Ticross password";
  $message = "Hi " . htmlspecialchars($userName) . ",\n\n";
  $message .= "Please reset your password using this code:\n\n";
  $message .= $secret . "\n\n";
  $message .= "Or click this link:\n";
  $message .= $resetLink . "\n\n";
  $message .= "This code expires in 1 hour.\n\n";
  $message .= "If you didn't request this, please ignore this email.\n\n";
  $message .= "Best regards,\nTicross Team";
  
  $headers = "From: noreply@ticross.local\r\nContent-Type: text/plain; charset=UTF-8";
  
  return mail($email, $subject, $message, $headers);
}

function formatUserResponse($user) {
  return [
    'id' => (int)$user['id'],
    'name' => $user['name'],
    'email' => $user['email'],
    'email_verified' => (bool)$user['email_verified'],
    'avatar_data_url' => $user['avatar_data_url'],
    'created_at' => $user['created_at'],
    'registered_at' => $user['registered_at']
  ];
}

function hasPermission($userId, $permission, $entityId = null) {
  $db = getDB();
  if ($entityId === null) {
    $stmt = $db->prepare("SELECT COUNT(*) FROM permissions WHERE user_id = :user_id AND permission = :permission AND entity_id IS NULL");
    $stmt->execute([':user_id' => $userId, ':permission' => $permission]);
  } else {
    $stmt = $db->prepare("SELECT COUNT(*) FROM permissions WHERE user_id = :user_id AND permission = :permission AND (entity_id = :entity_id OR entity_id IS NULL)");
    $stmt->execute([':user_id' => $userId, ':permission' => $permission, ':entity_id' => $entityId]);
  }
  return $stmt->fetchColumn() > 0;
}

function isUserBlocked($userId) {
  $db = getDB();
  $stmt = $db->prepare("SELECT blocked FROM users WHERE id = :user_id");
  $stmt->execute([':user_id' => $userId]);
  $result = $stmt->fetch(PDO::FETCH_ASSOC);
  return $result && $result['blocked'] == 1;
}

function updateUserPermissions($userId, $permissions) {
  $db = getDB();
  
  // Delete existing permissions for this user
  $stmt = $db->prepare("DELETE FROM permissions WHERE entity_id = :user_id");
  $stmt->execute([':user_id' => $userId]);
  
  // Add new permissions
  if (!empty($permissions)) {
    $stmt = $db->prepare("INSERT INTO permissions (permission, entity_id) VALUES (:permission, :entity_id)");
    foreach ($permissions as $permission) {
      $stmt->execute([':permission' => $permission, ':entity_id' => $userId]);
    }
  }
}

// API Routes
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Remove 'auth.php' from path if present
if (end($pathParts) === 'auth.php') {
  array_pop($pathParts);
}

$endpoint = end($pathParts);

switch ($requestMethod) {
  case 'GET':
    switch ($endpoint) {
      case 'current-user':
        handleCurrentUser();
        break;
      case 'users':
        handleListUsers();
        break;
      default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
    }
    break;
  case 'POST':
    switch ($endpoint) {
      case 'login':
        handleLogin();
        break;
      case 'logout':
        handleLogout();
        break;
      case 'register-anonymous':
        handleRegisterAnonymous();
        break;
      case 'register':
        handleRegister();
        break;
      case 'verify-email':
        handleVerifyEmail();
        break;
      case 'resend-verification-email':
        handleResendVerificationEmail();
        break;
      case 'forgot-password':
        handleForgotPassword();
        break;
      case 'reset-password':
        handleResetPassword();
        break;
      case 'create-user':
        handleCreateUser();
        break;
      case 'block-user':
        handleBlockUser();
        break;
      case 'update-profile':
        handleUpdateProfile();
        break;
      case 'admin-update-user':
        handleAdminUpdateUser();
        break;
      case 'delete-user':
        // Accepts {"user_id": ...} in POST body
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['user_id'])) {
          http_response_code(400);
          echo json_encode(['error' => 'user_id is required']);
          break;
        }
        handleDeleteUser($input['user_id']);
        break;
      default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
    }
    break;
  default:
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    break;
}

// NEW REGISTRATION AND VERIFICATION HANDLERS

function handleRegisterAnonymous() {
  global $emailVerificationExpirationHours;
  
  // Check if user is already logged in
  $currentUserId = getCurrentUserId();
  if ($currentUserId) {
    http_response_code(400);
    echo json_encode(['error' => 'You are already logged in. Logout first to register as anonymous.']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  $userName = isset($input['name']) ? trim($input['name']) : null;
  
  if (!$userName) {
    $userName = 'User_' . substr(bin2hex(random_bytes(4)), 0, 8);
  }
  
  // Ensure unique name
  $db = getDB();
  $counter = 0;
  $originalName = $userName;
  while (true) {
    $stmt = $db->prepare("SELECT id FROM users WHERE name = :name");
    $stmt->execute([':name' => $userName]);
    if (!$stmt->fetch()) {
      break;
    }
    $counter++;
    $userName = $originalName . $counter;
  }
  
  try {
    $stmt = $db->prepare("
      INSERT INTO users (name, email, password_hash, email_verified, registered_at, created_at)
      VALUES (:name, NULL, NULL, 0, NULL, :created_at)
    ");
    $stmt->execute([
      ':name' => $userName,
      ':created_at' => date('Y-m-d H:i:s')
    ]);
    
    $newUserId = $db->lastInsertId();
    $token = generateSignedToken($newUserId);
    
    setAuthCookie($token);
    
    echo json_encode([
      'success' => true,
      'user' => [
        'id' => $newUserId,
        'name' => $userName,
        'email' => null,
        'email_verified' => false,
        'avatar_data_url' => null,
        'created_at' => date('Y-m-d H:i:s'),
        'registered_at' => null
      ],
      'message' => 'Anonymous user created successfully. You can now register with an email.'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create anonymous user']);
  }
}

function handleRegister() {
  global $emailVerificationExpirationHours;
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['email']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    return;
  }
  
  $email = trim($input['email']);
  $password = $input['password'];
  $name = isset($input['name']) ? trim($input['name']) : null;
  
  // Validate email format
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    return;
  }
  
  // Validate password
  if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters long']);
    return;
  }
  
  $db = getDB();
  $currentUserId = getCurrentUserId();
  
  // Check if email already exists
  $stmt = $db->prepare("
    SELECT id, email_verified, secret_created_at, secret_type, registered_at
    FROM users 
    WHERE email = :email
  ");
  $stmt->execute([':email' => $email]);
  $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if ($existingUser) {
    // Email exists and is verified
    if ($existingUser['email_verified']) {
      http_response_code(409);
      echo json_encode(['error' => 'Email already registered. Please use password reset if you forgot your password.']);
      return;
    }
    
    // Email exists but not verified - check if pending verification is expired
    if ($existingUser['secret_type'] === 'email_verification' && $existingUser['secret_created_at']) {
      if (!isSecretExpired($existingUser['secret_created_at'], $emailVerificationExpirationHours)) {
        http_response_code(409);
        echo json_encode([
          'error' => 'Email verification already in progress. Please check your email or try again in ' . 
                     ceil(($emailVerificationExpirationHours * 3600 - 
                     (time() - strtotime($existingUser['secret_created_at']))) / 60) . ' minutes.'
        ]);
        return;
      }
    }
    
    // Pending verification expired - we can reassign this email
    $targetUserId = (int)$existingUser['id'];
  } else {
    // Email doesn't exist
    if ($currentUserId) {
      // Bind email to current anonymous user
      $targetUserId = $currentUserId;
    } else {
      // Create new user
      $targetUserId = null;
    }
  }
  
  try {
    $db->beginTransaction();
    
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    if ($targetUserId) {
      // Update existing user (either current user or expired unverified user)
      $stmt = $db->prepare("
        UPDATE users 
        SET email = :email, password_hash = :password_hash
        WHERE id = :user_id
      ");
      $stmt->execute([
        ':email' => $email,
        ':password_hash' => $passwordHash,
        ':user_id' => $targetUserId
      ]);
      $newUserId = $targetUserId;
    } else {
      // Create new user
      $userName = $name ?? 'User_' . substr(bin2hex(random_bytes(4)), 0, 8);
      
      // Ensure unique name
      $counter = 0;
      $originalName = $userName;
      while (true) {
        $stmt = $db->prepare("SELECT id FROM users WHERE name = :name");
        $stmt->execute([':name' => $userName]);
        if (!$stmt->fetch()) {
          break;
        }
        $counter++;
        $userName = $originalName . $counter;
      }
      
      $stmt = $db->prepare("
        INSERT INTO users (name, email, password_hash, email_verified, created_at)
        VALUES (:name, :email, :password_hash, 0, :created_at)
      ");
      $stmt->execute([
        ':name' => $userName,
        ':email' => $email,
        ':password_hash' => $passwordHash,
        ':created_at' => date('Y-m-d H:i:s')
      ]);
      $newUserId = $db->lastInsertId();
    }
    
    // Generate and set verification secret
    $secret = setUserSecret($db, $newUserId, 'email_verification');
    
    $db->commit();
    
    // Get user data
    $stmt = $db->prepare("SELECT name FROM users WHERE id = :user_id");
    $stmt->execute([':user_id' => $newUserId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Send verification email
    sendVerificationEmail($email, $secret, $user['name'], $newUserId);
    
    // Update auth cookie if this was an existing user
    if ($currentUserId === $newUserId) {
      $token = generateSignedToken($newUserId);
      setAuthCookie($token);
    }
    
    echo json_encode([
      'success' => true,
      'message' => 'Registration successful! Please check your email to verify your address. Verification code: ' . $secret,
      'user_id' => $newUserId,
      'requires_verification' => true
    ]);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to register: ' . $e->getMessage()]);
  }
}

function handleVerifyEmail() {
  global $emailVerificationExpirationHours;
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['code'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Verification code is required']);
    return;
  }
  
  $code = trim($input['code']);
  
  // Get current user or from input
  $userId = null;
  if (isset($input['user_id'])) {
    $userId = (int)$input['user_id'];
  } else {
    $userId = getCurrentUserId();
  }
  
  if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required or user_id must be provided']);
    return;
  }
  
  $db = getDB();
  
  // Get user
  $stmt = $db->prepare("SELECT email, email_verified, secret, secret_type, secret_created_at FROM users WHERE id = :user_id");
  $stmt->execute([':user_id' => $userId]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    return;
  }
  
  // Check if already verified
  if ($user['email_verified']) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is already verified']);
    return;
  }
  
  // Check if no email
  if (!$user['email']) {
    http_response_code(400);
    echo json_encode(['error' => 'No email associated with this account']);
    return;
  }
  
  // Verify secret
  if (!verifyUserSecret($userId, $code, 'email_verification', $emailVerificationExpirationHours)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or expired verification code']);
    return;
  }
  
  try {
    $db->beginTransaction();
    
    // Mark email as verified
    $stmt = $db->prepare("
      UPDATE users 
      SET email_verified = 1, email_verified_at = :verified_at, registered_at = :registered_at
      WHERE id = :user_id
    ");
    $stmt->execute([
      ':verified_at' => date('Y-m-d H:i:s'),
      ':registered_at' => date('Y-m-d H:i:s'),
      ':user_id' => $userId
    ]);
    
    // Clear secret
    clearUserSecret($db, $userId);
    
    $db->commit();
    
    // Generate auth token
    $token = generateSignedToken($userId);
    setAuthCookie($token);
    
    // Get updated user data
    $stmt = $db->prepare("
      SELECT id, name, email, avatar_data_url, email_verified, email_verified_at, created_at, registered_at
      FROM users 
      WHERE id = :user_id
    ");
    $stmt->execute([':user_id' => $userId]);
    $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
      'success' => true,
      'message' => 'Email verified successfully!',
      'user' => formatUserResponse($updatedUser)
    ]);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to verify email']);
  }
}

function handleResendVerificationEmail() {
  global $emailVerificationExpirationHours;
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required']);
    return;
  }
  
  $email = trim($input['email']);
  
  $db = getDB();
  
  $stmt = $db->prepare("
    SELECT id, name, email, email_verified, secret, secret_type, secret_created_at
    FROM users 
    WHERE email = :email
  ");
  $stmt->execute([':email' => $email]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$user) {
    // Don't reveal if email exists
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'If this email exists and is unverified, a verification email will be sent.']);
    return;
  }
  
  if ($user['email_verified']) {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'If this email exists and is unverified, a verification email will be sent.']);
    return;
  }
  
  // Check if we can resend (not too recent)
  if ($user['secret_type'] === 'email_verification' && $user['secret_created_at']) {
    if (!isSecretExpired($user['secret_created_at'], $emailVerificationExpirationHours)) {
      $minutesLeft = ceil(($emailVerificationExpirationHours * 3600 - 
                           (time() - strtotime($user['secret_created_at']))) / 60);
      http_response_code(200);
      echo json_encode([
        'success' => true, 
        'message' => 'Verification email sent. Please check your email. (Next resend available in ' . $minutesLeft . ' minutes)'
      ]);
      return;
    }
  }
  
  try {
    $db->beginTransaction();
    
    // Generate new verification secret
    $secret = setUserSecret($db, $user['id'], 'email_verification');
    
    $db->commit();
    
    // Send verification email
    sendVerificationEmail($email, $secret, $user['name'], $user['id']);
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Verification email sent. Please check your email.']);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to resend verification email']);
  }
}

function handleForgotPassword() {
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required']);
    return;
  }
  
  $email = trim($input['email']);
  
  $db = getDB();
  
  $stmt = $db->prepare("
    SELECT id, name, email, email_verified
    FROM users 
    WHERE email = :email AND email_verified = 1
  ");
  $stmt->execute([':email' => $email]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$user) {
    // Don't reveal if email exists or not verified
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'If this email exists and is verified, a password reset email will be sent.']);
    return;
  }
  
  try {
    $db->beginTransaction();
    
    // Generate password reset secret
    $secret = setUserSecret($db, $user['id'], 'password_reset');
    
    $db->commit();
    
    // Send password reset email
    sendPasswordResetEmail($email, $secret, $user['name'], $user['id']);
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'If this email exists and is verified, a password reset email will be sent.']);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send password reset email']);
  }
}

function handleResetPassword() {
  global $passwordResetExpirationHours;
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['code']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Code and password are required']);
    return;
  }
  
  $code = trim($input['code']);
  $password = $input['password'];
  
  // Validate password
  if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters long']);
    return;
  }
  
  // Get user from input (for reset flow without authentication)
  if (!isset($input['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id is required']);
    return;
  }
  
  $userId = (int)$input['user_id'];
  
  $db = getDB();
  
  // Get user
  $stmt = $db->prepare("
    SELECT id, secret, secret_type, secret_created_at, email
    FROM users 
    WHERE id = :user_id
  ");
  $stmt->execute([':user_id' => $userId]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    return;
  }
  
  // Verify reset token
  if (!verifyUserSecret($userId, $code, 'password_reset', $passwordResetExpirationHours)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or expired reset code']);
    return;
  }
  
  try {
    $db->beginTransaction();
    
    // Update password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("
      UPDATE users 
      SET password_hash = :password_hash
      WHERE id = :user_id
    ");
    $stmt->execute([
      ':password_hash' => $passwordHash,
      ':user_id' => $userId
    ]);
    
    // Clear reset secret
    clearUserSecret($db, $userId);
    
    $db->commit();
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Password reset successfully. You can now login with your new password.']);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to reset password']);
  }
}

// EXISTING HANDLERS

function handleLogin() {
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['email']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    return;
  }
  
  $db = getDB();
  $stmt = $db->prepare("SELECT id, name, email, password_hash, blocked FROM users WHERE email = :email");
  $stmt->execute([':email' => $input['email']]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    return;
  }
  
  if ($user['blocked'] == 1) {
    http_response_code(403);
    echo json_encode(['error' => 'User account is blocked']);
    return;
  }
  
  if (!password_verify($input['password'], $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    return;
  }
  
  $token = generateSignedToken($user['id']);
  
  setAuthCookie($token);
  
  echo json_encode([
    'success' => true,
    // 'token' => $token,
    'user' => [
      'id' => $user['id'],
      'name' => $user['name'],
      'email' => $user['email']
    ]
  ]);
}

function handleLogout() {
  // Clear auth_token cookie
  setcookie('auth_token', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
  ]);
  
  echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}

function handleCreateUser() {
  $currentUserId = getCurrentUserId();
  
  if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    return;
  }
  
  if (isUserBlocked($currentUserId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Account is blocked']);
    return;
  }
  
  if (!hasPermission($currentUserId, 'MANAGE_USERS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['name']) || !isset($input['email']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Name, email, and password are required']);
    return;
  }
  
  $db = getDB();
  
  // Check if email already exists
  $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
  $stmt->execute([':email' => $input['email']]);
  if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'Email already exists']);
    return;
  }
  
  $passwordHash = password_hash($input['password'], PASSWORD_DEFAULT);
  $avatarDataUrl = isset($input['avatar_data_url']) ? $input['avatar_data_url'] : null;
  $blocked = isset($input['blocked']) ? (bool)$input['blocked'] : false;
  
  try {
    $stmt = $db->prepare("
      INSERT INTO users (name, email, avatar_data_url, password_hash, blocked)
      VALUES (:name, :email, :avatar, :password_hash, :blocked)
    ");
    $stmt->execute([
      ':name' => $input['name'],
      ':email' => $input['email'],
      ':avatar' => $avatarDataUrl,
      ':password_hash' => $passwordHash,
      ':blocked' => $blocked ? 1 : 0
    ]);
    
    $newUserId = $db->lastInsertId();
    
    echo json_encode([
      'success' => true,
      'user_id' => $newUserId,
      'message' => 'User created successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create user']);
  }
}

function handleBlockUser() {
  $currentUserId = getCurrentUserId();
  
  if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    return;
  }
  
  if (isUserBlocked($currentUserId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Account is blocked']);
    return;
  }
  
  if (!hasPermission($currentUserId, 'MANAGE_USERS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['user_id']) || !isset($input['blocked'])) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id and blocked status are required']);
    return;
  }
  
  $targetUserId = (int)$input['user_id'];
  $blocked = (bool)$input['blocked'];
  
  // Prevent blocking yourself
  if ($targetUserId === $currentUserId) {
    http_response_code(400);
    echo json_encode(['error' => 'Cannot block yourself']);
    return;
  }
  
  $db = getDB();
  
  try {
    $stmt = $db->prepare("UPDATE users SET blocked = :blocked WHERE id = :user_id");
    $stmt->execute([
      ':blocked' => $blocked ? 1 : 0,
      ':user_id' => $targetUserId
    ]);
    
    if ($stmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['error' => 'User not found']);
      return;
    }
    
    echo json_encode([
      'success' => true,
      'message' => 'User ' . ($blocked ? 'blocked' : 'unblocked') . ' successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update user status']);
  }
}

function handleDeleteUser($userId) {
  $currentUserId = getCurrentUserId();
  
  if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    return;
  }
  
  if (isUserBlocked($currentUserId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Account is blocked']);
    return;
  }
  
  if (!hasPermission($currentUserId, 'MANAGE_USERS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $targetUserId = (int)$userId;
  
  // Prevent deleting yourself
  if ($targetUserId === $currentUserId) {
    http_response_code(400);
    echo json_encode(['error' => 'Cannot delete yourself']);
    return;
  }
  
  $db = getDB();
  
  try {
    $db->beginTransaction();
    
    // Delete user permissions
    $stmt = $db->prepare("DELETE FROM permissions WHERE entity_id = :user_id");
    $stmt->execute([':user_id' => $targetUserId]);
    
    // Delete user
    $stmt = $db->prepare("DELETE FROM users WHERE id = :user_id");
    $stmt->execute([':user_id' => $targetUserId]);
    
    if ($stmt->rowCount() === 0) {
      $db->rollBack();
      http_response_code(404);
      echo json_encode(['error' => 'User not found']);
      return;
    }
    
    $db->commit();
    
    echo json_encode([
      'success' => true,
      'message' => 'User deleted successfully'
    ]);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete user']);
  }
}

function handleCurrentUser() {
  $currentUserId = getCurrentUserId();
  
  if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    return;
  }
  
  if (isUserBlocked($currentUserId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Account is blocked']);
    return;
  }
  
  $db = getDB();
  $stmt = $db->prepare("SELECT id, name, email, avatar_data_url, blocked, created_at FROM users WHERE id = :user_id");
  $stmt->execute([':user_id' => $currentUserId]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    return;
  }
  
  // Get user permissions
  $stmt = $db->prepare("SELECT permission FROM permissions WHERE entity_id = :user_id");
  $stmt->execute([':user_id' => $currentUserId]);
  $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);
  
  echo json_encode([
    'success' => true,
    'user' => [
      'id' => $user['id'],
      'name' => $user['name'],
      'email' => $user['email'],
      'avatar_data_url' => $user['avatar_data_url'],
      'blocked' => (bool)$user['blocked'],
      'created_at' => $user['created_at'],
      'permissions' => $permissions
    ]
  ]);
}

function handleListUsers() {
  $currentUserId = getCurrentUserId();
  
  if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    return;
  }
  
  if (isUserBlocked($currentUserId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Account is blocked']);
    return;
  }
  
  if (!hasPermission($currentUserId, 'MANAGE_USERS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $db = getDB();
  
  // Get all users
  $stmt = $db->prepare("SELECT id, name, email, avatar_data_url, blocked, created_at FROM users ORDER BY created_at DESC");
  $stmt->execute();
  $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // Get permissions for each user
  foreach ($users as &$user) {
    $stmt = $db->prepare("SELECT permission FROM permissions WHERE entity_id = :user_id");
    $stmt->execute([':user_id' => $user['id']]);
    $user['permissions'] = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $user['blocked'] = (bool)$user['blocked'];
  }
  
  echo json_encode([
    'success' => true,
    'users' => $users,
    'total' => count($users)
  ]);
}

function handleUpdateProfile() {
  $currentUserId = getCurrentUserId();
  
  if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    return;
  }
  
  if (isUserBlocked($currentUserId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Account is blocked']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['name']) && !isset($input['avatar_data_url']) && !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'At least name, avatar_data_url, or password is required']);
    return;
  }
  
  $db = getDB();
  
  // Build dynamic update query
  $updateFields = [];
  $params = [':user_id' => $currentUserId];
  
  if (isset($input['name'])) {
    if (empty(trim($input['name']))) {
      http_response_code(400);
      echo json_encode(['error' => 'Name cannot be empty']);
      return;
    }
    $updateFields[] = 'name = :name';
    $params[':name'] = trim($input['name']);
  }
  
  if (isset($input['avatar_data_url'])) {
    $updateFields[] = 'avatar_data_url = :avatar_data_url';
    $params[':avatar_data_url'] = $input['avatar_data_url'];
  }
  
  if (isset($input['password'])) {
    if (empty(trim($input['password']))) {
      http_response_code(400);
      echo json_encode(['error' => 'Password cannot be empty']);
      return;
    }
    if (strlen($input['password']) < 6) {
      http_response_code(400);
      echo json_encode(['error' => 'Password must be at least 6 characters long']);
      return;
    }
    $updateFields[] = 'password_hash = :password_hash';
    $params[':password_hash'] = password_hash($input['password'], PASSWORD_DEFAULT);
  }
  
  try {
    $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = :user_id";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    if ($stmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['error' => 'User not found']);
      return;
    }
    
    // Get updated user data
    $stmt = $db->prepare("SELECT id, name, email, avatar_data_url, blocked, created_at FROM users WHERE id = :user_id");
    $stmt->execute([':user_id' => $currentUserId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get user permissions
    $stmt = $db->prepare("SELECT permission FROM permissions WHERE entity_id = :user_id");
    $stmt->execute([':user_id' => $currentUserId]);
    $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode([
      'success' => true,
      'message' => 'Profile updated successfully',
      'user' => [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'avatar_data_url' => $user['avatar_data_url'],
        'blocked' => (bool)$user['blocked'],
        'created_at' => $user['created_at'],
        'permissions' => $permissions
      ]
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update profile']);
  }
}

function handleAdminUpdateUser() {
  $currentUserId = getCurrentUserId();
  
  if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    return;
  }
  
  if (isUserBlocked($currentUserId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Account is blocked']);
    return;
  }
  
  if (!hasPermission($currentUserId, 'MANAGE_USERS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id is required']);
    return;
  }
  
  if (!isset($input['name']) && !isset($input['email']) && !isset($input['password']) && !isset($input['permissions'])) {
    http_response_code(400);
    echo json_encode(['error' => 'At least name, email, password, or permissions is required']);
    return;
  }
  
  $targetUserId = (int)$input['user_id'];
  $db = getDB();
  
  // Check if target user exists
  $stmt = $db->prepare("SELECT id, name, email FROM users WHERE id = :user_id");
  $stmt->execute([':user_id' => $targetUserId]);
  $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$targetUser) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    return;
  }
  
  // Build dynamic update query
  $updateFields = [];
  $params = [':user_id' => $targetUserId];
  
  if (isset($input['name'])) {
    if (empty(trim($input['name']))) {
      http_response_code(400);
      echo json_encode(['error' => 'Name cannot be empty']);
      return;
    }
    $updateFields[] = 'name = :name';
    $params[':name'] = trim($input['name']);
  }
  
  if (isset($input['email'])) {
    if (empty(trim($input['email']))) {
      http_response_code(400);
      echo json_encode(['error' => 'Email cannot be empty']);
      return;
    }
    if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
      http_response_code(400);
      echo json_encode(['error' => 'Invalid email format']);
      return;
    }
    
    // Check if email already exists for another user
    $stmt = $db->prepare("SELECT id FROM users WHERE email = :email AND id != :user_id");
    $stmt->execute([':email' => trim($input['email']), ':user_id' => $targetUserId]);
    if ($stmt->fetch()) {
      http_response_code(409);
      echo json_encode(['error' => 'Email already exists']);
      return;
    }
    
    $updateFields[] = 'email = :email';
    $params[':email'] = trim($input['email']);
  }
  
  if (isset($input['password'])) {
    if (empty(trim($input['password']))) {
      http_response_code(400);
      echo json_encode(['error' => 'Password cannot be empty']);
      return;
    }
    if (strlen($input['password']) < 6) {
      http_response_code(400);
      echo json_encode(['error' => 'Password must be at least 6 characters long']);
      return;
    }
    $updateFields[] = 'password_hash = :password_hash';
    $params[':password_hash'] = password_hash($input['password'], PASSWORD_DEFAULT);
  }
  
  try {
    $db->beginTransaction();
    
    // Update user fields if any are provided
    if (!empty($updateFields)) {
      $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = :user_id";
      $stmt = $db->prepare($sql);
      $stmt->execute($params);
    }
    
    // Update permissions if provided
    if (isset($input['permissions'])) {
      if (!is_array($input['permissions'])) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode(['error' => 'Permissions must be an array']);
        return;
      }
      
      // Validate permissions (only allow known permissions)
      $allowedPermissions = ['MANAGE_USERS']; // Add more user-related permissions as needed
      foreach ($input['permissions'] as $permission) {
        if (!in_array($permission, $allowedPermissions)) {
          $db->rollBack();
          http_response_code(400);
          echo json_encode(['error' => 'Invalid permission: ' . $permission]);
          return;
        }
      }
      
      updateUserPermissions($targetUserId, $input['permissions']);
    }
    
    $db->commit();
    
    // Get updated user data
    $stmt = $db->prepare("SELECT id, name, email, avatar_data_url, blocked, created_at FROM users WHERE id = :user_id");
    $stmt->execute([':user_id' => $targetUserId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get user permissions
    $stmt = $db->prepare("SELECT permission FROM permissions WHERE entity_id = :user_id");
    $stmt->execute([':user_id' => $targetUserId]);
    $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode([
      'success' => true,
      'message' => 'User updated successfully',
      'user' => [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'avatar_data_url' => $user['avatar_data_url'],
        'blocked' => (bool)$user['blocked'],
        'created_at' => $user['created_at'],
        'permissions' => $permissions
      ]
    ]);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update user']);
  }
}
?>