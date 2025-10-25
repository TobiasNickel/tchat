<?php
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
$dbFile = __DIR__ . '/tchat.sqlite';

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
  
  // Set auth cookie
  setcookie('auth_token', $token, [
    'expires' => time() + (24 * 60 * 60),
    'path' => '/',
    'domain' => '',
    'secure' => false, // Set to true in production with HTTPS
    'httponly' => true,
    'samesite' => 'Lax'
  ]);
  
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
    
    // Delete channel memberships
    $stmt = $db->prepare("DELETE FROM channel_memberships WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $targetUserId]);
    
    // Note: You might want to handle messages differently - either delete or keep them
    // For now, we'll keep messages but they'll reference a deleted user
    
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
      $allowedPermissions = ['MANAGE_USERS']; // Add more as needed
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