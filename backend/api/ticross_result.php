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

// Database connection
function getDB() {
  $dbFile = CONFIG['db_file'];
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

// Token/Auth Helper Functions (from auth.php)
function verifySignedToken($token) {
  $secret = 'your-secret-key-change-this-in-production-make-it-long-and-random';
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

// Generate session hash
function generateSessionHash($seed, $gridWidth, $gridHeight, $difficulty, $timestamp) {
  $secret = CONFIG['seed_secret'];
  $data = json_encode([
    'seed' => $seed,
    'grid_width' => $gridWidth,
    'grid_height' => $gridHeight,
    'difficulty' => $difficulty,
    'timestamp' => $timestamp
  ]);
  return hash_hmac('sha256', $data, $secret);
}

// Verify session hash
function verifySessionHash($seed, $gridWidth, $gridHeight, $difficulty, $timestamp, $hash) {
  $expectedHash = generateSessionHash($seed, $gridWidth, $gridHeight, $difficulty, $timestamp);
  return hash_equals($expectedHash, $hash);
}

// API Routes
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Remove 'ticross_result.php' from path if present
if (end($pathParts) === 'ticross_result.php') {
  array_pop($pathParts);
}

$endpoint = end($pathParts);

switch ($requestMethod) {
  case 'POST':
    switch ($endpoint) {
      case 'start-game':
        handleStartGame();
        break;
      case 'submit-result':
        handleSubmitResult();
        break;
      default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
    }
    break;
  case 'GET':
    switch ($endpoint) {
      case 'results':
        handleGetResults();
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

// START GAME HANDLER
function handleStartGame() {
  $input = json_decode(file_get_contents('php://input'), true);
  
  // Validate required fields
  if (!isset($input['seed']) || !isset($input['difficulty']) || 
      !isset($input['grid_width']) || !isset($input['grid_height'])) {
    http_response_code(400);
    echo json_encode([
      'error' => 'Missing required fields: seed, difficulty, grid_width, grid_height'
    ]);
    return;
  }
  
  $seed = trim($input['seed']);
  $difficulty = trim($input['difficulty']);
  $gridWidth = (int)$input['grid_width'];
  $gridHeight = (int)$input['grid_height'];
  
  // Validate input
  if (empty($seed)) {
    http_response_code(400);
    echo json_encode(['error' => 'Seed cannot be empty']);
    return;
  }
  
  if (!in_array($difficulty, ['easy', 'medium', 'hard'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Difficulty must be one of: easy, medium, hard']);
    return;
  }
  
  if ($gridWidth <= 0 || $gridHeight <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Grid width and height must be positive integers']);
    return;
  }
  
  // Generate timestamp and session hash
  $timestamp = time();
  $sessionHash = generateSessionHash($seed, $gridWidth, $gridHeight, $difficulty, $timestamp);
  
  // Get current user if logged in
  $userId = getCurrentUserId();
  
  http_response_code(200);
  echo json_encode([
    'success' => true,
    'hash' => $sessionHash,
    'timestamp' => $timestamp,
  ]);
}

// SUBMIT RESULT HANDLER
function handleSubmitResult() {
  $currentUserId = getCurrentUserId();
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  // Validate required fields
  if (!isset($input['seed']) || !isset($input['difficulty']) || 
      !isset($input['grid_width']) || !isset($input['grid_height']) ||
      !isset($input['hash']) || !isset($input['total_time_seconds']) ||
      !isset($input['timestamp'])) {
    http_response_code(400);
    echo json_encode([
      'error' => 'Missing required fields: seed, difficulty, grid_width, grid_height, hash, timestamp, total_time_seconds'
    ]);
    return;
  }
  
  $seed = trim($input['seed']);
  $difficulty = trim($input['difficulty']);
  $gridWidth = (int)$input['grid_width'];
  $gridHeight = (int)$input['grid_height'];
  $hash = trim($input['hash']);
  $timestamp = (int)$input['timestamp'];
  $totalTimeSeconds = (int)$input['total_time_seconds'];
  $moves = isset($input['moves']) ? $input['moves'] : null; // Optional: JSON array of moves
  
  // Validate input
  if (empty($seed)) {
    http_response_code(400);
    echo json_encode(['error' => 'Seed cannot be empty']);
    return;
  }
  
  if (!in_array($difficulty, ['easy', 'medium', 'hard'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Difficulty must be one of: easy, medium, hard']);
    return;
  }
  
  if ($gridWidth <= 0 || $gridHeight <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Grid width and height must be positive integers']);
    return;
  }
  
  if (empty($hash)) {
    http_response_code(400);
    echo json_encode(['error' => 'Hash cannot be empty']);
    return;
  }
  
  if ($totalTimeSeconds < 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Total time seconds must be non-negative']);
    return;
  }
  
  // Verify the hash
  if (!verifySessionHash($seed, $gridWidth, $gridHeight, $difficulty, $timestamp, $hash)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid hash: game parameters do not match']);
    return;
  }
  
  // Prepare moves for database (convert to JSON string if array provided)
  $movesJson = null;
  if ($moves !== null) {
    if (is_array($moves)) {
      $movesJson = json_encode($moves);
    } elseif (is_string($moves)) {
      // Validate it's valid JSON
      json_decode($moves);
      if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Moves must be a valid JSON array']);
        return;
      }
      $movesJson = $moves;
    }
  }
  
  $db = getDB();
  
  try {
    $stmt = $db->prepare("
      INSERT INTO result_records (seed, grid_width, grid_height, difficulty_level, total_time_seconds, moves, user_id, created_at)
      VALUES (:seed, :grid_width, :grid_height, :difficulty_level, :total_time_seconds, :moves, :user_id, :created_at)
    ");
    
    $stmt->execute([
      ':seed' => $seed,
      ':grid_width' => $gridWidth,
      ':grid_height' => $gridHeight,
      ':difficulty_level' => $difficulty,
      ':total_time_seconds' => $totalTimeSeconds,
      ':moves' => $movesJson,
      ':user_id' => $currentUserId ?? null,
      ':created_at' => date('Y-m-d H:i:s')
    ]);
    
    $resultId = $db->lastInsertId();
    
    http_response_code(201);
    echo json_encode([
      'success' => true,
      'message' => 'Game result submitted successfully',
      'result_id' => (int)$resultId
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save game result: ' . $e->getMessage()]);
  }
}

// GET RESULTS HANDLER
function handleGetResults() {
  $currentUserId = getCurrentUserId();
  
  if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    return;
  }
  
  $db = getDB();
  
  // Optional query parameters for filtering
  $difficulty = isset($_GET['difficulty']) ? trim($_GET['difficulty']) : null;
  $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
  $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
  
  // Validate limit and offset
  if ($limit < 1 || $limit > 1000) {
    $limit = 100;
  }
  if ($offset < 0) {
    $offset = 0;
  }
  
  // Build query
  $query = "SELECT id, seed, grid_width, grid_height, difficulty_level, total_time_seconds, created_at FROM result_records WHERE user_id = :user_id";
  $params = [':user_id' => $currentUserId];
  
  if ($difficulty && in_array($difficulty, ['easy', 'medium', 'hard'])) {
    $query .= " AND difficulty_level = :difficulty";
    $params[':difficulty'] = $difficulty;
  }
  
  // Get total count
  $countQuery = str_replace("SELECT id, seed, grid_width, grid_height, difficulty_level, total_time_seconds, created_at", "SELECT COUNT(*) as count", $query);
  $countStmt = $db->prepare($countQuery);
  $countStmt->execute($params);
  $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
  
  // Get paginated results
  $query .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
  $stmt = $db->prepare($query);
  foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value);
  }
  $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
  $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
  $stmt->execute();
  
  $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // Convert IDs to integers
  foreach ($results as &$result) {
    $result['id'] = (int)$result['id'];
    $result['grid_width'] = (int)$result['grid_width'];
    $result['grid_height'] = (int)$result['grid_height'];
    $result['total_time_seconds'] = (int)$result['total_time_seconds'];
  }
  
  http_response_code(200);
  echo json_encode([
    'success' => true,
    'results' => $results,
    'pagination' => [
      'total' => (int)$totalCount,
      'limit' => $limit,
      'offset' => $offset
    ]
  ]);
}
?>
