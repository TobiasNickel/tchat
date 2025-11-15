<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

include_once __DIR__ . '/conf.php';

// Configuration
$secret = 'your-secret-key-change-this-in-production-make-it-long-and-random';
$dbFile = CONFIG['db_file'];

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

// Auth Helper functions
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

function isUserBlocked($userId) {
  $db = getDB();
  $stmt = $db->prepare("SELECT blocked FROM users WHERE id = :user_id");
  $stmt->execute([':user_id' => $userId]);
  $result = $stmt->fetch(PDO::FETCH_ASSOC);
  return $result && $result['blocked'] == 1;
}

function formatUserResponse($user) {
  return [
    'id' => (int)$user['id'],
    'name' => $user['name'],
    'avatar_data_url' => $user['avatar_data_url'],
    'created_at' => $user['created_at']
  ];
}

// API Routes
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Remove 'user.php' from path if present
if (end($pathParts) === 'user.php') {
  array_pop($pathParts);
}

$endpoint = end($pathParts);

switch ($requestMethod) {
  case 'GET':
    switch ($endpoint) {
      case 'users':
      case 'info':
        handleGetUsers();
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

function handleGetUsers() {
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
  
  // Get user_ids parameter (can be comma-separated string or array)
  $userIds = [];
  
  if (isset($_GET['user_ids'])) {
    $userIdsParam = $_GET['user_ids'];
    
    // Handle both comma-separated string and JSON array
    if (is_string($userIdsParam)) {
      // Try to decode as JSON first
      $decoded = json_decode($userIdsParam, true);
      if (is_array($decoded)) {
        $userIds = $decoded;
      } else {
        // Treat as comma-separated string
        $userIds = array_map('intval', explode(',', $userIdsParam));
      }
    } elseif (is_array($userIdsParam)) {
      $userIds = array_map('intval', $userIdsParam);
    }
  }
  
  // Remove duplicates and filter out invalid IDs
  $userIds = array_values(array_unique(array_filter($userIds, function($id) {
    return $id > 0;
  })));
  
  if (empty($userIds)) {
    http_response_code(400);
    echo json_encode(['error' => 'user_ids parameter is required (comma-separated or JSON array)']);
    return;
  }
  
  // Limit to prevent abuse (max 100 users at once)
  if (count($userIds) > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'Maximum 100 user IDs allowed per request']);
    return;
  }
  
  $db = getDB();
  
  // Build placeholders for IN clause
  $placeholders = implode(',', array_fill(0, count($userIds), '?'));
  
  // Fetch users - only return public information
  $sql = "
    SELECT id, name, avatar_data_url, created_at
    FROM users
    WHERE id IN ($placeholders)
    ORDER BY name ASC
  ";
  
  $stmt = $db->prepare($sql);
  $stmt->execute($userIds);
  $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // Format response
  $formattedUsers = array_map('formatUserResponse', $users);
  
  echo json_encode([
    'success' => true,
    'users' => $formattedUsers,
    'total' => count($formattedUsers)
  ]);
}
?>
