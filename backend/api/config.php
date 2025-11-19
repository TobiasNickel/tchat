<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// Path to SQLite database file
$dbFile = __DIR__ . '/ticross.sqlite';
$adminName = 'admin';
$adminEmail = 'admin@example.com';
$adminPassword = 'admin';
$basePath = getenv('BASE_PATH') ?: '/ticross';

$indexPath = __DIR__ . '/../index.html';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $adminEmail = isset($_POST['admin_email']) ? trim($_POST['admin_email']) : '';
  $adminPassword = isset($_POST['admin_password']) ? $_POST['admin_password'] : '';
  $basePath = isset($_POST['base_path']) ? trim($_POST['base_path']) : '/ticross';

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
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
        padding-top: 50px;
      }
      label {
        font-weight: bold;
      }
      input[type="email"],
      input[type="password"],
      input[type="text"] {
        width: 300px;
        padding: 8px;
        margin-top: 4px;
        margin-bottom: 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      button {
        padding: 10px 20px;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background-color: #218838;
      }
      form {
        max-width: 400px;
        margin: auto;
        box-shadow: 3px 3px 10px rgba(0,0,0,0.1);
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
      }
      h2 {
        text-align: center;
      }
    </style>
  </head>
  <body>
    <h2>Initialize Chat Database</h2>
    <form method="post">
      <label for="admin_email">Admin Email:</label><br>
      <input type="email" id="admin_email" name="admin_email" required><br><br>
      <label for="admin_password">Admin Password:</label><br>
      <input type="password" id="admin_password" name="admin_password" required><br><br>
      <label for="base_path">Base Path:</label><br>
      <input type="text" id="base_path" name="base_path" value="/ticross" required><br><br>
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
      email TEXT UNIQUE,
      avatar_data_url TEXT,
      password_hash TEXT,
      blocked BOOLEAN DEFAULT 0,
      email_verified BOOLEAN DEFAULT 0,
      email_verified_at DATETIME,
      secret TEXT,
      secret_type TEXT,
      secret_created_at DATETIME,
      registered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  ");
  echo "Users table created.\n<br>";


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
    INSERT INTO users (name, email, avatar_data_url, password_hash, blocked, email_verified, email_verified_at, registered_at)
    VALUES (:name, :email, :avatar, :password_hash, :blocked, :email_verified, :email_verified_at, :registered_at)
  ");
  $stmt->execute([
    ':name' => $adminName,
    ':email' => $adminEmail,
    ':avatar' => $adminAvatar,
    ':password_hash' => $adminPasswordHash,
    ':blocked' => $adminBlocked,
    ':email_verified' => 1,
    ':email_verified_at' => date('Y-m-d H:i:s'),
    ':registered_at' => date('Y-m-d H:i:s')
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

  $db->exec("
    CREATE TABLE IF NOT EXISTS result_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed TEXT NOT NULL,
      grid_width INTEGER NOT NULL,
      grid_height INTEGER NOT NULL,
      difficulty_level TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_time_seconds INTEGER,
      moves TEXT,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  ");

  // Create indexes on result_records
  $db->exec("CREATE INDEX idx_result_records_user_id ON result_records(user_id)");
  $db->exec("CREATE INDEX idx_result_records_seed ON result_records(seed)");
  echo "Result records table created.\n<br>";

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
    $indexContent = str_replace(
      '<base href="/" />',
      '<base href="' . htmlspecialchars($basePathFromUri, ENT_QUOTES, 'UTF-8') . '/" />',
      str_replace('/* CONFIGPLACEHOLDER */', $configScript, $indexContent)
    );

    // Write back to index.html
    file_put_contents($indexPath, $indexContent);

    echo "index.html updated with BASE_PATH: $basePathFromUri<br>";
    
    $confContent = <<<PHP
<?php
// Configuration
const CONFIG = [
    'base_url' => {$basePathFromUri},
    'db_file' => __DIR__ . '/ticross.sqlite',
    'seed_secret' => '" . bin2hex(random_bytes(32)) . "',
];
PHP;
    file_put_contents(__DIR__ . '/conf.php', $confContent);
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