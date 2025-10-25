# TChat

a chat application just to copy and run.
in version one is made to be copied on any php web host and run.

There will be public and private channels, replies, sending images, search, user management.

# data model:
the data will be first in sqlite and later we might provide a version for mysql.

## tables:

### users
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `email` TEXT NOT NULL UNIQUE
- `avatar_data_url` TEXT
- `password_hash` TEXT NOT NULL
- `blocked` BOOLEAN default 0
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### channels
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL UNIQUE
- `is_public` BOOLEAN DEFAULT 1
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### messages
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `content` TEXT NOT NULL
- `user_id` INTEGER NOT NULL
- `channel_id` INTEGER NOT NULL
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- Foreign key: `user_id` REFERENCES `users(id)`

### channel_memberships
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` INTEGER NOT NULL
- `channel_id` INTEGER NOT NULL
- `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- Foreign key: `channel_id` REFERENCES `channels(id)`
- Foreign key: `user_id` REFERENCES `users(id)`

### permissions
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `permission` TEXT NOT NULL
- `entity_id` INTEGER
- Foreign key: `user_id` REFERENCES `users(id)`

## Setup

1. Run the database migration:
   ```bash
   php migrateDB.php
   ```

2. Default admin user is created with:
   - Email: `admin@example.com`
   - Password: `admin`
   - Permission: `MANAGE_USERS`

## Authentication API

All authentication endpoints are in `auth.php`.

### POST /auth.php/login
Login with email and password. Returns JWT token in cookie and response.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJkYXRhIjp7InVzZXJfaWQiOjEsImlhdCI6MTY5...",
  "user": {
    "id": 1,
    "name": "admin",
    "email": "admin@example.com"
  }
}
```

### POST /auth.php/logout
Logout and clear auth cookie.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth.php/current-user
Get current logged-in user information.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "admin",
    "email": "admin@example.com",
    "avatar_data_url": null,
    "blocked": false,
    "created_at": "2025-10-15 12:00:00",
    "permissions": ["MANAGE_USERS"]
  }
}
```

### POST /auth.php/update-profile
Update current user's name, avatar, and/or password.

**Request Examples:**

Update all fields:
```json
{
  "name": "New Name",
  "avatar_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "password": "newSecurePassword123"
}
```

Update only password:
```json
{
  "password": "newSecurePassword123"
}
```

Update only name:
```json
{
  "name": "New Display Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "name": "New Name",
    "email": "admin@example.com",
    "avatar_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "blocked": false,
    "created_at": "2025-10-15 12:00:00",
    "permissions": ["MANAGE_USERS"]
  }
}
```

### POST /auth.php/admin-update-user
Update any user's name, email, password, and/or permissions (admin only - requires `MANAGE_USERS` permission).

**Request:**
```json
{
  "user_id": 2,
  "name": "Updated Name",
  "email": "newemail@example.com",
  "password": "newSecurePassword123",
  "permissions": ["MANAGE_USERS"]
}
```

**Request Examples:**

Update user's email only:
```json
{
  "user_id": 2,
  "email": "newemail@example.com"
}
```

Update user's password only:
```json
{
  "user_id": 2,
  "password": "newSecurePassword123"
}
```

Update user's permissions only:
```json
{
  "user_id": 2,
  "permissions": ["MANAGE_USERS"]
}
```

Remove all permissions:
```json
{
  "user_id": 2,
  "permissions": []
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": 2,
    "name": "Updated Name",
    "email": "newemail@example.com",
    "avatar_data_url": null,
    "blocked": false,
    "created_at": "2025-10-15 12:30:00",
    "permissions": []
  }
}
```

## User Management API

Requires `MANAGE_USERS` permission for all operations.

### POST /auth.php/create-user
Create a new user (admin only).

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "avatar_data_url": "data:image/png;base64,...",
  "blocked": false
}
```

**Response:**
```json
{
  "success": true,
  "user_id": 2,
  "message": "User created successfully"
}
```

### POST /auth.php/block-user
Block or unblock a user.

**Request:**
```json
{
  "user_id": 2,
  "blocked": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User blocked successfully"
}
```

### DELETE /auth.php/user/{user_id}
Delete a user and all associated data.

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### GET /auth.php/users
List all users (requires `MANAGE_USERS` permission).

**Response:**
```json
{
  "success": true,
  "total": 2,
  "users": [
    {
      "id": 1,
      "name": "admin",
      "email": "admin@example.com",
      "avatar_data_url": null,
      "blocked": false,
      "created_at": "2025-10-15 12:00:00",
      "permissions": ["MANAGE_USERS"]
    },
    {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar_data_url": "data:image/png;base64,...",
      "blocked": false,
      "created_at": "2025-10-15 12:30:00",
      "permissions": []
    }
  ]
}
```

## Authentication

The API uses signed tokens stored in HTTP-only cookies. Tokens are valid for 24 hours and use HMAC-SHA256 for security.

Authentication can be provided via:
1. `auth_token` cookie (set automatically on login)
2. `Authorization: Bearer {token}` header

The token format is: `base64(payload).hmac_sha256_signature`
