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

// Auth Helper functions (copied from auth.php for consistency)
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

function isUserMemberOfChannel($userId, $channelId) {
  $db = getDB();
  $stmt = $db->prepare("SELECT COUNT(*) FROM channel_memberships WHERE user_id = :user_id AND channel_id = :channel_id");
  $stmt->execute([':user_id' => $userId, ':channel_id' => $channelId]);
  return $stmt->fetchColumn() > 0;
}

function canUserAccessChannel($userId, $channelId) {
  $db = getDB();
  
  // Check if user has MANAGE_CHANNELS permission
  if (hasPermission($userId, 'MANAGE_CHANNELS')) {
    return true;
  }
  
  // Check if channel is public
  $stmt = $db->prepare("SELECT is_public FROM channels WHERE id = :channel_id");
  $stmt->execute([':channel_id' => $channelId]);
  $channel = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$channel) {
    return false;
  }
  
  if ($channel['is_public'] == 1) {
    return true;
  }
  
  // Check if user is a member
  return isUserMemberOfChannel($userId, $channelId);
}

function formatChannelResponse($channel, $userId) {
  $db = getDB();
  
  // Check if user is joined
  $isJoined = isUserMemberOfChannel($userId, $channel['id']);
  
  // Get member count
  $stmt = $db->prepare("SELECT COUNT(*) FROM channel_memberships WHERE channel_id = :channel_id");
  $stmt->execute([':channel_id' => $channel['id']]);
  $memberCount = $stmt->fetchColumn();
  
  return [
    'id' => $channel['id'],
    'name' => $channel['name'],
    'is_public' => (bool)$channel['is_public'],
    'created_at' => $channel['created_at'],
    'is_joined' => $isJoined,
    'member_count' => (int)$memberCount
  ];
}

// API Routes
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Remove 'channel.php' from path if present
if (end($pathParts) === 'channel.php') {
  array_pop($pathParts);
}

$endpoint = end($pathParts);

switch ($requestMethod) {
  case 'GET':
    switch ($endpoint) {
      case 'channels':
      case 'list':
        handleListChannels();
        break;
      case 'get':
        handleGetChannel();
        break;
      case 'users':
        handleGetChannelUsers();
        break;
      default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
    }
    break;
  case 'POST':
    switch ($endpoint) {
      case 'create':
        handleCreateChannel();
        break;
      case 'delete':
        handleDeleteChannel();
        break;
      case 'add-user':
        handleAddUser();
        break;
      case 'remove-user':
        handleRemoveUser();
        break;
      case 'rename':
        handleRenameChannel();
        break;
      case 'close':
        handleCloseChannel();
        break;
      case 'reopen':
        handleReopenChannel();
        break;
      case 'join':
        handleJoinChannel();
        break;
      case 'leave':
        handleLeaveChannel();
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

function handleListChannels() {
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
  $hasManagePermission = hasPermission($currentUserId, 'MANAGE_CHANNELS');
  
  if ($hasManagePermission) {
    // User can see all channels
    $stmt = $db->prepare("SELECT id, name, is_public, created_at FROM channels ORDER BY name ASC");
    $stmt->execute();
  } else {
    // User can only see public channels and channels they're a member of
    $stmt = $db->prepare("
      SELECT DISTINCT c.id, c.name, c.is_public, c.created_at
      FROM channels c
      LEFT JOIN channel_memberships cm ON c.id = cm.channel_id AND cm.user_id = :user_id
      WHERE c.is_public = 1 OR cm.user_id IS NOT NULL
      ORDER BY c.name ASC
    ");
    $stmt->execute([':user_id' => $currentUserId]);
  }
  
  $channels = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // Format each channel with joined status
  $formattedChannels = array_map(function($channel) use ($currentUserId) {
    return formatChannelResponse($channel, $currentUserId);
  }, $channels);
  
  echo json_encode([
    'success' => true,
    'channels' => $formattedChannels,
    'total' => count($formattedChannels)
  ]);
}

function handleGetChannel() {
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
  
  if (!isset($_GET['channel_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id is required']);
    return;
  }
  
  $channelId = (int)$_GET['channel_id'];
  
  if (!canUserAccessChannel($currentUserId, $channelId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied to this channel']);
    return;
  }
  
  $db = getDB();
  $stmt = $db->prepare("SELECT id, name, is_public, created_at FROM channels WHERE id = :channel_id");
  $stmt->execute([':channel_id' => $channelId]);
  $channel = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$channel) {
    http_response_code(404);
    echo json_encode(['error' => 'Channel not found']);
    return;
  }
  
  echo json_encode([
    'success' => true,
    'channel' => formatChannelResponse($channel, $currentUserId)
  ]);
}

function handleGetChannelUsers() {
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
  
  if (!isset($_GET['channel_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id is required']);
    return;
  }
  
  $channelId = (int)$_GET['channel_id'];
  
  if (!canUserAccessChannel($currentUserId, $channelId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied to this channel']);
    return;
  }
  
  $db = getDB();
  
  // Get all users in the channel
  $stmt = $db->prepare("
    SELECT u.id, u.name, u.email, u.avatar_data_url, cm.joined_at
    FROM users u
    JOIN channel_memberships cm ON u.id = cm.user_id
    WHERE cm.channel_id = :channel_id
    ORDER BY u.name ASC
  ");
  $stmt->execute([':channel_id' => $channelId]);
  $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  echo json_encode([
    'success' => true,
    'users' => $users,
    'total' => count($users)
  ]);
}

function handleCreateChannel() {
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
  
  if (!hasPermission($currentUserId, 'MANAGE_CHANNELS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Channel name is required']);
    return;
  }
  
  if (empty(trim($input['name']))) {
    http_response_code(400);
    echo json_encode(['error' => 'Channel name cannot be empty']);
    return;
  }
  
  $db = getDB();
  
  // Check if channel name already exists
  $stmt = $db->prepare("SELECT id FROM channels WHERE name = :name");
  $stmt->execute([':name' => trim($input['name'])]);
  if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'Channel name already exists']);
    return;
  }
  
  $isPublic = isset($input['is_public']) ? (bool)$input['is_public'] : true;
  
  try {
    $stmt = $db->prepare("
      INSERT INTO channels (name, is_public)
      VALUES (:name, :is_public)
    ");
    $stmt->execute([
      ':name' => trim($input['name']),
      ':is_public' => $isPublic ? 1 : 0
    ]);
    
    $channelId = $db->lastInsertId();
    
    // Get the created channel
    $stmt = $db->prepare("SELECT id, name, is_public, created_at FROM channels WHERE id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    $channel = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
      'success' => true,
      'channel' => formatChannelResponse($channel, $currentUserId),
      'message' => 'Channel created successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create channel']);
  }
}

function handleDeleteChannel() {
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
  
  if (!hasPermission($currentUserId, 'MANAGE_CHANNELS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['channel_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id is required']);
    return;
  }
  
  $channelId = (int)$input['channel_id'];
  $db = getDB();
  
  try {
    $db->beginTransaction();
    
    // Delete channel memberships
    $stmt = $db->prepare("DELETE FROM channel_memberships WHERE channel_id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    
    // Delete channel reads
    $stmt = $db->prepare("DELETE FROM channel_reads WHERE channel_id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    
    // Note: You might want to handle messages differently
    // For now, we'll delete them as well
    $stmt = $db->prepare("DELETE FROM message_reactions WHERE message_id IN (SELECT id FROM messages WHERE channel_id = :channel_id)");
    $stmt->execute([':channel_id' => $channelId]);
    
    $stmt = $db->prepare("DELETE FROM messages WHERE channel_id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    
    // Delete the channel
    $stmt = $db->prepare("DELETE FROM channels WHERE id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    
    if ($stmt->rowCount() === 0) {
      $db->rollBack();
      http_response_code(404);
      echo json_encode(['error' => 'Channel not found']);
      return;
    }
    
    $db->commit();
    
    echo json_encode([
      'success' => true,
      'message' => 'Channel deleted successfully'
    ]);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete channel']);
  }
}

function handleAddUser() {
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
  
  if (!hasPermission($currentUserId, 'MANAGE_CHANNELS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['channel_id']) || !isset($input['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id and user_id are required']);
    return;
  }
  
  $channelId = (int)$input['channel_id'];
  $userId = (int)$input['user_id'];
  $db = getDB();
  
  // Verify channel exists
  $stmt = $db->prepare("SELECT id FROM channels WHERE id = :channel_id");
  $stmt->execute([':channel_id' => $channelId]);
  if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(['error' => 'Channel not found']);
    return;
  }
  
  // Verify user exists
  $stmt = $db->prepare("SELECT id FROM users WHERE id = :user_id");
  $stmt->execute([':user_id' => $userId]);
  if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    return;
  }
  
  // Check if user is already a member
  if (isUserMemberOfChannel($userId, $channelId)) {
    http_response_code(409);
    echo json_encode(['error' => 'User is already a member of this channel']);
    return;
  }
  
  try {
    $stmt = $db->prepare("
      INSERT INTO channel_memberships (user_id, channel_id)
      VALUES (:user_id, :channel_id)
    ");
    $stmt->execute([
      ':user_id' => $userId,
      ':channel_id' => $channelId
    ]);
    
    echo json_encode([
      'success' => true,
      'message' => 'User added to channel successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to add user to channel']);
  }
}

function handleRemoveUser() {
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
  
  if (!hasPermission($currentUserId, 'MANAGE_CHANNELS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['channel_id']) || !isset($input['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id and user_id are required']);
    return;
  }
  
  $channelId = (int)$input['channel_id'];
  $userId = (int)$input['user_id'];
  $db = getDB();
  
  try {
    $stmt = $db->prepare("
      DELETE FROM channel_memberships 
      WHERE user_id = :user_id AND channel_id = :channel_id
    ");
    $stmt->execute([
      ':user_id' => $userId,
      ':channel_id' => $channelId
    ]);
    
    if ($stmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['error' => 'User is not a member of this channel']);
      return;
    }
    
    echo json_encode([
      'success' => true,
      'message' => 'User removed from channel successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to remove user from channel']);
  }
}

function handleRenameChannel() {
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
  
  if (!hasPermission($currentUserId, 'MANAGE_CHANNELS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['channel_id']) || !isset($input['name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id and name are required']);
    return;
  }
  
  if (empty(trim($input['name']))) {
    http_response_code(400);
    echo json_encode(['error' => 'Channel name cannot be empty']);
    return;
  }
  
  $channelId = (int)$input['channel_id'];
  $newName = trim($input['name']);
  $db = getDB();
  
  // Check if new name is already taken by another channel
  $stmt = $db->prepare("SELECT id FROM channels WHERE name = :name AND id != :channel_id");
  $stmt->execute([':name' => $newName, ':channel_id' => $channelId]);
  if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'Channel name already exists']);
    return;
  }
  
  try {
    $stmt = $db->prepare("UPDATE channels SET name = :name WHERE id = :channel_id");
    $stmt->execute([
      ':name' => $newName,
      ':channel_id' => $channelId
    ]);
    
    if ($stmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['error' => 'Channel not found']);
      return;
    }
    
    // Get updated channel
    $stmt = $db->prepare("SELECT id, name, is_public, created_at FROM channels WHERE id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    $channel = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
      'success' => true,
      'channel' => formatChannelResponse($channel, $currentUserId),
      'message' => 'Channel renamed successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to rename channel']);
  }
}

function handleCloseChannel() {
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
  
  if (!hasPermission($currentUserId, 'MANAGE_CHANNELS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['channel_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id is required']);
    return;
  }
  
  $channelId = (int)$input['channel_id'];
  $db = getDB();
  
  try {
    $stmt = $db->prepare("UPDATE channels SET is_public = 0 WHERE id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    
    if ($stmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['error' => 'Channel not found or already closed']);
      return;
    }
    
    // Get updated channel
    $stmt = $db->prepare("SELECT id, name, is_public, created_at FROM channels WHERE id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    $channel = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
      'success' => true,
      'channel' => formatChannelResponse($channel, $currentUserId),
      'message' => 'Channel closed successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to close channel']);
  }
}

function handleReopenChannel() {
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
  
  if (!hasPermission($currentUserId, 'MANAGE_CHANNELS')) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    return;
  }
  
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['channel_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id is required']);
    return;
  }
  
  $channelId = (int)$input['channel_id'];
  $db = getDB();
  
  try {
    $stmt = $db->prepare("UPDATE channels SET is_public = 1 WHERE id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    
    if ($stmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['error' => 'Channel not found or already open']);
      return;
    }
    
    // Get updated channel
    $stmt = $db->prepare("SELECT id, name, is_public, created_at FROM channels WHERE id = :channel_id");
    $stmt->execute([':channel_id' => $channelId]);
    $channel = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
      'success' => true,
      'channel' => formatChannelResponse($channel, $currentUserId),
      'message' => 'Channel reopened successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to reopen channel']);
  }
}

function handleJoinChannel() {
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
  
  if (!isset($input['channel_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id is required']);
    return;
  }
  
  $channelId = (int)$input['channel_id'];
  $db = getDB();
  
  // Verify channel exists and is public
  $stmt = $db->prepare("SELECT id, is_public FROM channels WHERE id = :channel_id");
  $stmt->execute([':channel_id' => $channelId]);
  $channel = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$channel) {
    http_response_code(404);
    echo json_encode(['error' => 'Channel not found']);
    return;
  }
  
  if ($channel['is_public'] != 1) {
    http_response_code(403);
    echo json_encode(['error' => 'Cannot join private channel']);
    return;
  }
  
  // Check if user is already a member
  if (isUserMemberOfChannel($currentUserId, $channelId)) {
    http_response_code(409);
    echo json_encode(['error' => 'Already a member of this channel']);
    return;
  }
  
  try {
    $stmt = $db->prepare("
      INSERT INTO channel_memberships (user_id, channel_id)
      VALUES (:user_id, :channel_id)
    ");
    $stmt->execute([
      ':user_id' => $currentUserId,
      ':channel_id' => $channelId
    ]);
    
    echo json_encode([
      'success' => true,
      'message' => 'Joined channel successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to join channel']);
  }
}

function handleLeaveChannel() {
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
  if (isset($input['channel_id'])) {
    $channelIdCheck = (int)$input['channel_id'];
    $db = getDB();
    $stmt = $db->prepare("SELECT is_public FROM channels WHERE id = :channel_id");
    $stmt->execute([':channel_id' => $channelIdCheck]);
    $channel = $stmt->fetch(PDO::FETCH_ASSOC);

    // If channel exists and is private, prevent normal users from leaving themselves.
    if ($channel && $channel['is_public'] != 1 && !hasPermission($currentUserId, 'MANAGE_CHANNELS')) {
      http_response_code(403);
      echo json_encode(['error' => 'Cannot leave private channel; please ask an administrator to remove you']);
      return;
    }
  }
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (!isset($input['channel_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id is required']);
    return;
  }
  
  $channelId = (int)$input['channel_id'];
  $db = getDB();
  
  try {
    $stmt = $db->prepare("
      DELETE FROM channel_memberships 
      WHERE user_id = :user_id AND channel_id = :channel_id
    ");
    $stmt->execute([
      ':user_id' => $currentUserId,
      ':channel_id' => $channelId
    ]);
    
    if ($stmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['error' => 'Not a member of this channel']);
      return;
    }
    
    echo json_encode([
      'success' => true,
      'message' => 'Left channel successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to leave channel']);
  }
}
?>
