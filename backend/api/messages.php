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
    
    // Performance optimizations for SQLite
    $db->exec('PRAGMA journal_mode = WAL');  // Write-Ahead Logging
    $db->exec('PRAGMA synchronous = NORMAL'); // Faster writes
    $db->exec('PRAGMA cache_size = 10000');   // 10MB cache
    $db->exec('PRAGMA temp_store = MEMORY');  // Use RAM for temp data
    
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

function isUserMemberOfChannel($userId, $channelId) {
  $db = getDB();
  $stmt = $db->prepare("SELECT COUNT(*) FROM channel_memberships WHERE user_id = :user_id AND channel_id = :channel_id");
  $stmt->execute([':user_id' => $userId, ':channel_id' => $channelId]);
  return $stmt->fetchColumn() > 0;
}

function canUserAccessChannel($userId, $channelId) {
  $db = getDB();
  
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

function getMessageReactions($messageId) {
  $db = getDB();
  $stmt = $db->prepare("
    SELECT mr.id, mr.user_id, mr.reaction, mr.created_at
    FROM message_reactions mr
    WHERE mr.message_id = :message_id
    ORDER BY mr.created_at ASC
  ");
  $stmt->execute([':message_id' => $messageId]);
  return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getBulkMessageReactions($messageIds) {
  if (empty($messageIds)) {
    return [];
  }
  
  $db = getDB();
  $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
  
  $stmt = $db->prepare("
    SELECT mr.message_id, mr.id, mr.user_id, mr.reaction, mr.created_at
    FROM message_reactions mr
    WHERE mr.message_id IN ($placeholders)
    ORDER BY mr.message_id, mr.created_at ASC
  ");
  $stmt->execute($messageIds);
  $reactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // Group reactions by message_id
  $grouped = [];
  foreach ($reactions as $reaction) {
    $msgId = $reaction['message_id'];
    if (!isset($grouped[$msgId])) {
      $grouped[$msgId] = [];
    }
    // Remove message_id from individual reaction as it's redundant
    unset($reaction['message_id']);
    $grouped[$msgId][] = $reaction;
  }
  
  return $grouped;
}

function formatMessageResponse($message, $reactionsMap = []) {
  $messageId = (int)$message['id'];
  return [
    'id' => $messageId,
    'content' => $message['content'],
    'user_id' => (int)$message['user_id'],
    'channel_id' => (int)$message['channel_id'],
    'reply_to' => $message['reply_to'] ? (int)$message['reply_to'] : null,
    'replies' => (int)$message['replies'],
    'created_at' => $message['created_at'],
    'reactions' => isset($reactionsMap[$messageId]) ? $reactionsMap[$messageId] : []
  ];
}

// API Routes
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Remove 'messages.php' from path if present
if (end($pathParts) === 'messages.php') {
  array_pop($pathParts);
}

$endpoint = end($pathParts);

switch ($requestMethod) {
  case 'GET':
    switch ($endpoint) {
      case 'messages':
      case 'list':
        handleListMessages();
        break;
      default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
    }
    break;
  case 'POST':
    switch ($endpoint) {
      case 'send':
        handleSendMessage();
        break;
      case 'delete':
        handleDeleteMessage();
        break;
      case 'react':
        handleReactToMessage();
        break;
      case 'unreact':
        handleUnreactToMessage();
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

function handleListMessages() {
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
  
  // Optional parameters
  $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 100) : 100; // Max 100 messages
  $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
  $before = isset($_GET['before']) ? $_GET['before'] : null; // Timestamp
  $after = isset($_GET['after']) ? $_GET['after'] : null; // Timestamp
  $channelId = isset($_GET['channel_id']) ? (int)$_GET['channel_id'] : null;
  $replyTo = isset($_GET['reply_to']) ? (int)$_GET['reply_to'] : null;

  // Enforce that only one of before/after is used
  if ($before !== null && $after !== null) {
    http_response_code(400);
    echo json_encode(['error' => 'Cannot use both before and after parameters']);
    return;
  }

  // Determine if we're fetching across channels
  $fetchAcrossChannels = false;
  if ($after !== null && $channelId === null) {
    // In "after" mode, channel_id is optional to fetch across all channels
    $fetchAcrossChannels = true;
  } elseif ($channelId === null) {
    // In any other mode, channel_id is required
    http_response_code(400);
    echo json_encode(['error' => 'channel_id is required (except when using after parameter)']);
    return;
  }

  // If fetching from a specific channel, check if user is a member
  if (!$fetchAcrossChannels) {
    if (!isUserMemberOfChannel($currentUserId, $channelId)) {
      http_response_code(403);
      echo json_encode(['error' => 'Must be a member of the channel to read messages']);
      return;
    }
  }
  
  // Build query conditions
  $conditions = [];
  $params = [];
  
  // Channel filter
  if ($fetchAcrossChannels) {
    // Get all channels the user is a member of
    $stmt = $db->prepare("SELECT channel_id FROM channel_memberships WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $currentUserId]);
    $memberChannels = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($memberChannels)) {
      // User is not a member of any channel
      echo json_encode([
        'success' => true,
        'messages' => [],
        'total' => 0,
        'limit' => $limit,
        'offset' => $offset
      ]);
      return;
    }
    
    // Add channel filter for all user's channels
    $placeholders = implode(',', array_fill(0, count($memberChannels), '?'));
    $conditions[] = "m.channel_id IN ($placeholders)";
    foreach ($memberChannels as $ch) {
      $params[] = $ch;
    }
  } else {
    $conditions[] = 'm.channel_id = :channel_id';
    $params[':channel_id'] = $channelId;
  }
  
  // Filter by reply_to (default: only top-level messages)
  if ($replyTo !== null) {
    $conditions[] = 'm.reply_to = :reply_to';
    $params[':reply_to'] = $replyTo;
  } else {
    $conditions[] = 'm.reply_to IS NULL';
  }
  
  // Filter by timestamp - messages closest to the timestamp
  if ($before !== null) {
    // Get messages before this timestamp (older messages)
    $conditions[] = 'm.created_at < :before';
    $params[':before'] = $before;
  }
  
  if ($after !== null) {
    // Get messages after this timestamp (newer messages)
    $conditions[] = 'm.created_at > :after';
    $params[':after'] = $after;
  }
  
  $whereClause = implode(' AND ', $conditions);
  
  // Build SQL with proper ordering
  // We always fetch in the direction closest to the timestamp, then reverse for DESC output
  if ($after !== null) {
    // Fetching messages after a timestamp: get oldest first (closest to timestamp)
    // Then reverse to return newest first
    $fetchOrder = 'ASC';
  } else {
    // Fetching messages before a timestamp or no timestamp: get newest first
    $fetchOrder = 'DESC';
  }
  
  $sql = "
    SELECT m.id, m.content, m.user_id, m.channel_id, m.reply_to, m.replies, m.created_at
    FROM messages m
    WHERE $whereClause
    ORDER BY m.created_at $fetchOrder
    LIMIT :limit OFFSET :offset
  ";
  
  $stmt = $db->prepare($sql);
  
  // Bind parameters
  $paramIndex = 1;
  foreach ($params as $key => $value) {
    if (is_string($key)) {
      $stmt->bindValue($key, $value);
    } else {
      // Positional parameter for IN clause
      $stmt->bindValue($paramIndex, $value, PDO::PARAM_INT);
      $paramIndex++;
    }
  }
  
  $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
  $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
  $stmt->execute();
  
  $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // If we fetched in ASC order (after mode), reverse to maintain DESC order for frontend
  if ($fetchOrder === 'ASC') {
    $messages = array_reverse($messages);
  }
  
  // Batch-load all reactions for all messages in one query
  $messageIds = array_map(function($msg) { return $msg['id']; }, $messages);
  $reactionsMap = getBulkMessageReactions($messageIds);
  
  // Format messages with reactions
  $formattedMessages = array_map(function($message) use ($reactionsMap) {
    return formatMessageResponse($message, $reactionsMap);
  }, $messages);
  
  echo json_encode([
    'success' => true,
    'messages' => $formattedMessages,
    'total' => count($formattedMessages),
    'limit' => $limit,
    'offset' => $offset
  ]);
}

function handleSendMessage() {
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
  
  if (!isset($input['channel_id']) || !isset($input['content'])) {
    http_response_code(400);
    echo json_encode(['error' => 'channel_id and content are required']);
    return;
  }
  
  $channelId = (int)$input['channel_id'];
  $content = trim($input['content']);
  $replyTo = isset($input['reply_to']) ? (int)$input['reply_to'] : null;
  
  if (empty($content)) {
    http_response_code(400);
    echo json_encode(['error' => 'Message content cannot be empty']);
    return;
  }
  
  // Check if user is a member of the channel
  if (!isUserMemberOfChannel($currentUserId, $channelId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Must be a member of the channel to send messages']);
    return;
  }
  
  $db = getDB();
  
  // If replying, verify the replied message exists and is in the same channel
  if ($replyTo !== null) {
    $stmt = $db->prepare("SELECT channel_id FROM messages WHERE id = :message_id");
    $stmt->execute([':message_id' => $replyTo]);
    $repliedMessage = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$repliedMessage) {
      http_response_code(404);
      echo json_encode(['error' => 'Replied message not found']);
      return;
    }
    // Disallow replying to a reply (no nested replies)
    if ($repliedMessage['reply_to'] !== null) {
      http_response_code(400);
      echo json_encode(['error' => 'Cannot reply to a reply (nested replies are not allowed)']);
      return;
    }
    if ($repliedMessage['channel_id'] != $channelId) {
      http_response_code(400);
      echo json_encode(['error' => 'Replied message must be in the same channel']);
      return;
    }
  }
  
  try {
    $db->beginTransaction();
    
    // Insert the message
    $stmt = $db->prepare("
      INSERT INTO messages (content, user_id, channel_id, reply_to)
      VALUES (:content, :user_id, :channel_id, :reply_to)
    ");
    $stmt->execute([
      ':content' => $content,
      ':user_id' => $currentUserId,
      ':channel_id' => $channelId,
      ':reply_to' => $replyTo
    ]);
    
    $messageId = $db->lastInsertId();
    
    // If this is a reply, increment the replies count on the parent message
    if ($replyTo !== null) {
      $stmt = $db->prepare("
        UPDATE messages 
        SET replies = replies + 1 
        WHERE id = :reply_to
      ");
      $stmt->execute([':reply_to' => $replyTo]);
    }
    
    $db->commit();
    
    // Get the created message
    $stmt = $db->prepare("
      SELECT id, content, user_id, channel_id, reply_to, replies, created_at
      FROM messages
      WHERE id = :message_id
    ");
    $stmt->execute([':message_id' => $messageId]);
    $message = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Load reactions for this single message
    $reactionsMap = getBulkMessageReactions([$messageId]);
    
    echo json_encode([
      'success' => true,
      'message' => formatMessageResponse($message, $reactionsMap)
    ]);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send message']);
  }
}

function handleDeleteMessage() {
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
  
  if (!isset($input['message_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'message_id is required']);
    return;
  }
  
  $messageId = (int)$input['message_id'];
  $db = getDB();
  
  // Get the message
  $stmt = $db->prepare("SELECT user_id, reply_to FROM messages WHERE id = :message_id");
  $stmt->execute([':message_id' => $messageId]);
  $message = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$message) {
    http_response_code(404);
    echo json_encode(['error' => 'Message not found']);
    return;
  }
  
  // Only the message owner can delete it
  if ($message['user_id'] != $currentUserId) {
    http_response_code(403);
    echo json_encode(['error' => 'You can only delete your own messages']);
    return;
  }
  
  try {
    $db->beginTransaction();
    
    // Delete message reactions
    $stmt = $db->prepare("DELETE FROM message_reactions WHERE message_id = :message_id");
    $stmt->execute([':message_id' => $messageId]);
    
    // If this message was a reply, decrement the parent's replies count
    if ($message['reply_to'] !== null) {
      $stmt = $db->prepare("
        UPDATE messages 
        SET replies = MAX(0, replies - 1)
        WHERE id = :reply_to
      ");
      $stmt->execute([':reply_to' => $message['reply_to']]);
    }
    
    // Delete the message
    $stmt = $db->prepare("DELETE FROM messages WHERE id = :message_id");
    $stmt->execute([':message_id' => $messageId]);
    
    $db->commit();
    
    echo json_encode([
      'success' => true,
      'message' => 'Message deleted successfully'
    ]);
  } catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete message']);
  }
}

function handleReactToMessage() {
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
  
  if (!isset($input['message_id']) || !isset($input['reaction'])) {
    http_response_code(400);
    echo json_encode(['error' => 'message_id and reaction are required']);
    return;
  }
  
  $messageId = (int)$input['message_id'];
  $reaction = trim($input['reaction']);
  
  if (empty($reaction)) {
    http_response_code(400);
    echo json_encode(['error' => 'Reaction cannot be empty']);
    return;
  }
  
  $db = getDB();
  
  // Verify message exists and get channel
  $stmt = $db->prepare("SELECT channel_id FROM messages WHERE id = :message_id");
  $stmt->execute([':message_id' => $messageId]);
  $message = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$message) {
    http_response_code(404);
    echo json_encode(['error' => 'Message not found']);
    return;
  }
  
  // Check if user is a member of the channel
  if (!isUserMemberOfChannel($currentUserId, $message['channel_id'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Must be a member of the channel to react to messages']);
    return;
  }
  
  try {
    // Check if user already has this reaction
    $stmt = $db->prepare("
      SELECT id FROM message_reactions 
      WHERE message_id = :message_id AND user_id = :user_id AND reaction = :reaction
    ");
    $stmt->execute([
      ':message_id' => $messageId,
      ':user_id' => $currentUserId,
      ':reaction' => $reaction
    ]);
    
    if ($stmt->fetch()) {
      http_response_code(409);
      echo json_encode(['error' => 'You have already added this reaction']);
      return;
    }
    
    // Add the reaction
    $stmt = $db->prepare("
      INSERT INTO message_reactions (message_id, user_id, reaction)
      VALUES (:message_id, :user_id, :reaction)
    ");
    $stmt->execute([
      ':message_id' => $messageId,
      ':user_id' => $currentUserId,
      ':reaction' => $reaction
    ]);
    
    $reactionId = $db->lastInsertId();
    
    // Get the created reaction
    $stmt = $db->prepare("
      SELECT id, message_id, user_id, reaction, created_at
      FROM message_reactions
      WHERE id = :reaction_id
    ");
    $stmt->execute([':reaction_id' => $reactionId]);
    $reactionData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
      'success' => true,
      'reaction' => $reactionData,
      'message' => 'Reaction added successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to add reaction']);
  }
}

function handleUnreactToMessage() {
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
  
  if (!isset($input['message_id']) || !isset($input['reaction'])) {
    http_response_code(400);
    echo json_encode(['error' => 'message_id and reaction are required']);
    return;
  }
  
  $messageId = (int)$input['message_id'];
  $reaction = trim($input['reaction']);
  
  $db = getDB();
  
  // Verify message exists
  $stmt = $db->prepare("SELECT channel_id FROM messages WHERE id = :message_id");
  $stmt->execute([':message_id' => $messageId]);
  $message = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$message) {
    http_response_code(404);
    echo json_encode(['error' => 'Message not found']);
    return;
  }
  
  try {
    // Remove the reaction
    $stmt = $db->prepare("
      DELETE FROM message_reactions 
      WHERE message_id = :message_id AND user_id = :user_id AND reaction = :reaction
    ");
    $stmt->execute([
      ':message_id' => $messageId,
      ':user_id' => $currentUserId,
      ':reaction' => $reaction
    ]);
    
    if ($stmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['error' => 'Reaction not found']);
      return;
    }
    
    echo json_encode([
      'success' => true,
      'message' => 'Reaction removed successfully'
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to remove reaction']);
  }
}
?>
