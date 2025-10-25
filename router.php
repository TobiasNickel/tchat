<?php
/**
 * Development router for PHP built-in server
 * This handles routing similar to .htaccess but for php -S
 */

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestUri = urldecode($requestUri);

// Security: prevent directory traversal
if (strpos($requestUri, '..') !== false) {
    http_response_code(400);
    exit('Bad Request');
}

// Construct the file path
$filePath = __DIR__ . '/build' . $requestUri;

// If it's a directory, try index.html
if (is_dir($filePath)) {
    $filePath .= '/index.html';
}

// Serve existing files directly (including PHP files)
if (file_exists($filePath)) {
    // Handle PHP files
    if (pathinfo($filePath, PATHINFO_EXTENSION) === 'php') {
        // Set working directory for PHP files to their location
        chdir(dirname($filePath));
        require $filePath;
        return true;
    }
    
    // Serve static files
    return false; // Let PHP's built-in server handle it
}

// API requests that don't exist should return 404
if (strpos($requestUri, '/api/') === 0) {
    http_response_code(404);
    exit('API endpoint not found');
}

// For SPA: all other requests serve index.html
$indexPath = __DIR__ . '/build/index.html';
if (file_exists($indexPath)) {
    readfile($indexPath);
    return true;
}

// If index.html doesn't exist
http_response_code(404);
exit('Not Found');
