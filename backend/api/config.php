<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// Path to SQLite database file
$dbFile = __DIR__ . '/tchat.sqlite';
$adminName = 'admin';
$adminEmail = 'admin@example.com';
$adminPassword = 'admin';
$basePath = getenv('BASE_PATH') ?: '/tchat';

$indexPath = __DIR__ . '/../index.html';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $adminEmail = isset($_POST['admin_email']) ? trim($_POST['admin_email']) : '';
  $adminPassword = isset($_POST['admin_password']) ? $_POST['admin_password'] : '';
  $basePath = isset($_POST['base_path']) ? trim($_POST['base_path']) : '/tchat';

  if (empty($adminEmail) || empty($adminPassword) || empty($basePath)) {
    echo "<span style='color: red;'>All fields are required.</span>";
    exit;
  }
} else {
  ?>
  <!DOCTYPE html>
  <html>
  <head>
    <title>Initialize Database</title>
  </head>
  <body>
    <h2>Initialize Chat Database</h2>
    <form method="post">
      <label for="admin_email">Admin Email:</label><br>
      <input type="email" id="admin_email" name="admin_email" required><br><br>
      <label for="admin_password">Admin Password:</label><br>
      <input type="password" id="admin_password" name="admin_password" required><br><br>
      <label for="base_path">Base Path:</label><br>
      <input type="text" id="base_path" name="base_path" value="/tchat" required><br><br>
      <button type="submit">Migrate</button>
    </form>
  </body>
  </html>
  <?php
  exit;
}


try {
  if (file_exists($dbFile)) {
    echo "Migration already completed. Database file exists.\n";
    return;
  }

  // Create (or open) the SQLite database
  $db = new PDO('sqlite:' . $dbFile);
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // Example table creation statements based on a typical chat app README
  // Adjust table definitions as per your actual README
  echo "Creating tables...\n<br>";
  // Users table
  $db->exec("
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      avatar_data_url TEXT,
      password_hash TEXT NOT NULL,
      blocked BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  ");
  echo "Users table created.\n<br>";
  // Messages table
  $db->exec("
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      reply_to INTEGER,
      user_id INTEGER NOT NULL,
      channel_id INTEGER NOT NULL,
      replies INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  ");
  echo "Messages table created.\n<br>";

  // Channels table
  $db->exec("
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_public BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  ");
  echo "Channels table created.\n<br>";
  // Channel reads table
  $db->exec("
    CREATE TABLE IF NOT EXISTS channel_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(channel_id) REFERENCES channels(id),
      UNIQUE(user_id, channel_id)
    );
  ");
  echo "Channel reads table created.\n<br>";

  // Message reactions table
  $db->exec("
    CREATE TABLE IF NOT EXISTS message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reaction TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(message_id) REFERENCES messages(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(message_id, user_id, reaction)
    );
  ");
  echo "Message reactions table created.\n<br>";

  // Channel membership table
  $db->exec("
    CREATE TABLE IF NOT EXISTS channel_memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      channel_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(channel_id) REFERENCES channels(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  ");
  echo "Channel memberships table created.\n<br>";

  // Permissions table
  $db->exec("
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      permission TEXT NOT NULL,
      entity_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  ");
  echo "Permissions table created.\n<br>";

  // Insert admin user

  $adminAvatar = null;
  $adminBlocked = 0;
  $adminPasswordHash = password_hash($adminPassword, PASSWORD_DEFAULT);

  $stmt = $db->prepare("
    INSERT INTO users (name, email, avatar_data_url, password_hash, blocked)
    VALUES (:name, :email, :avatar, :password_hash, :blocked)
  ");
  $stmt->execute([
    ':name' => $adminName,
    ':email' => $adminEmail,
    ':avatar' => $adminAvatar,
    ':password_hash' => $adminPasswordHash,
    ':blocked' => $adminBlocked
  ]);

  $adminId = $db->lastInsertId();
  echo "Admin user created with ID: $adminId\n<br>";
  // Grant MANAGE_USERS permission to admin
  $stmt = $db->prepare("
    INSERT INTO permissions (permission, user_id)
    VALUES (:permission, :user_id)
  ");
  $stmt->execute([
    ':permission' => 'MANAGE_USERS',
    ':user_id' => $adminId
  ]);
  $stmt->execute([
    ':permission' => 'MANAGE_CHANNELS',
    ':user_id' => $adminId
  ]);

  echo "<br><span style='color: green;'>Database and tables created successfully.</span>\n<br>";
  if (file_exists($indexPath)) {
    $indexContent = file_get_contents($indexPath);

    // Determine the current script name
    $currentScript = basename(__FILE__);

    // Remove "/api/currentfilename.php" from the REQUEST_URI to get the base path
    $requestUri = $_SERVER['REQUEST_URI'];
    $apiPath = '/api/' . $currentScript;
    $basePathFromUri = rtrim(str_replace($apiPath, '', $requestUri), '/');
    if ($basePathFromUri === '') {
      $basePathFromUri = '/';
    }

    // Replace the placeholder in index.html
    $configScript = "window.BASE_PATH = " . json_encode($basePathFromUri) . ";";
    $indexContent = str_replace('/* CONFIGPLACEHOLDER */', $configScript, $indexContent);

    // Write back to index.html
    file_put_contents($indexPath, $indexContent);

    echo "index.html updated with BASE_PATH: $basePathFromUri<br>";
  } else {
    echo "index.html not found at $indexPath<br>";
  }

} catch (PDOException $e) {
  if (file_exists($dbFile)) {
    unlink($dbFile);
  }
  echo "Error: " . $e->getMessage() . "\n<br>";
  exit(1);
}