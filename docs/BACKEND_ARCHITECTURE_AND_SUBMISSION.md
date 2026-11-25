# Crave Recipe App — Backend Project Submission

**Developer**: Naisha Jain  
**Project**: Crave Recipe Application (Backend Service)  
**Date**: November 2026  
**Submitted To**: Mentor / Technical Reviewer  
**Stack**: Node.js, Express.js, PostgreSQL (`pg`), JWT, Bcrypt, Multer  
**Local API Base**: `http://127.0.0.1:5001/api`  

---

## 1. Project Overview & Intent

Hi! This document outlines how I designed and built the backend service for Crave. 

When starting this project, my main goal was to move away from mock arrays, local storage hacks, or in-memory state. I wanted to build a real production-style backend with:
1. **Real PostgreSQL persistence**: Everything—recipes, users, favorites, and audit history—is saved directly to a relational PostgreSQL database (`crave_db`).
2. **Proper authentication and RBAC**: A clear separation between regular registered users and administrators, enforced by server-side middleware rather than frontend flags.
3. **Audit trail**: Persistent logging of signups, logins, logouts, failed attempts, and admin actions (like role promotions, user deactivations, and recipe purges).
4. **Resilient media handling**: Support for both image and video uploads directly from device galleries with size limits and MIME validation.

---

## 2. Tech Stack & Architectural Decisions

- **Node.js & Express**: Kept the architecture straightforward with standard MVC separation (routes, controllers, middleware, and config). I avoided heavy enterprise frameworks to keep the code readable, modular, and easy to maintain.
- **PostgreSQL with `pg` (node-postgres)**: Instead of using a heavy ORM like Prisma or Sequelize (which often hides what's happening under the hood), I opted for raw parameterized SQL queries with a connection pool (`pg.Pool`). This gave me full control over constraints, array columns, joins, and soft-delete filtering.
- **JWT & Bcrypt**: Password hashing using `bcrypt` (10 salt rounds) and standard stateless JSON Web Tokens for API authentication.
- **Multer**: For multipart media uploads, saving files to disk under `backend/uploads/` with static streaming.

---

## 3. Directory Layout

```text
backend/
├── src/
│   ├── config/
│   │   └── db.js                 # PostgreSQL Pool connection instance
│   ├── controllers/
│   │   ├── authController.js     # User registration, login, logout & activity logging
│   │   ├── recipeController.js   # Recipe CRUD, category filtering, soft-delete
│   │   ├── adminController.js    # Metrics, user directory, trash recovery & purge
│   │   └── favoriteController.js # Relational favorites management
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT token decoding, active status check & requireAdmin
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth/*
│   │   ├── recipeRoutes.js       # /api/recipes/*
│   │   ├── adminRoutes.js        # /api/admin/*
│   │   ├── favoriteRoutes.js     # /api/favorites/*
│   │   └── uploadRoutes.js       # /api/upload/*
│   ├── scripts/
│   │   └── comprehensiveE2ETest.js # 30-assertion end-to-end integration test suite
│   └── server.js                 # Express app setup, CORS, static routes, error middleware
├── uploads/                      # Uploaded images and video files
├── package.json
└── .env                          # DB credentials, port, and JWT secret
```

---

## 4. Database Schema Design

I designed 4 relational tables in PostgreSQL:

### 4.1. `users`
Tracks user credentials, assigned roles, and account state.
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',        -- 'user' or 'admin'
    status VARCHAR(20) DEFAULT 'active',    -- 'active' or 'disabled'
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2. `recipes`
Contains recipe details. The `user_id` foreign key tracks who created the recipe, while `ingredients` and `instructions` are stored as PostgreSQL native text arrays (`TEXT[]`).
```sql
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    time_minutes INTEGER DEFAULT 0,
    rating NUMERIC(2,1) DEFAULT 0.0,
    image TEXT,
    ingredients TEXT[] DEFAULT '{}',
    instructions TEXT[] DEFAULT '{}',
    video_url TEXT,
    is_deleted BOOLEAN DEFAULT false,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3. `recipe_favorites`
Relational table linking favorited recipes. If a recipe is permanently deleted, its favorites cascade-delete automatically.
```sql
CREATE TABLE recipe_favorites (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_recipe_fav UNIQUE (recipe_id)
);
```

### 4.4. `activity_logs`
An append-only audit trail capturing what happened, who did it, remote IP, browser user-agent, and status.
```sql
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(150),
    user_name VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'success',
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Security & Authentication Implementation

### 5.1. Password Hashing & Registration
Passwords must be at least 8 characters. During signup (`POST /api/auth/signup`), the email is trimmed and lowercased, then checked for duplicates before being hashed with bcrypt.

### 5.2. Active Account Verification
In `authMiddleware.js`, when a protected endpoint is called with `Authorization: Bearer <token>`, the middleware doesn't just verify the JWT signature. It also looks up the user in PostgreSQL:
```javascript
const userRes = await pool.query(
    "SELECT id, name, email, role, status FROM users WHERE id = $1",
    [decoded.id]
);
```
If an administrator deactivates an account (`status = 'disabled'`), the token is immediately rejected with a `403 Forbidden` on the very next request—the user does not remain logged in until token expiration.

### 5.3. Admin Route Protection, Sole Admin Policy & Self-Lockout Guards
- The `requireAdmin` middleware checks `req.user.role === 'admin'`. Standard users calling admin APIs receive `403 Forbidden`.
- **Sole Administrator Policy**: In `adminController.js`, I enforced a strict rule ensuring that only Naisha accounts can hold administrator privileges. Any attempt to promote non-Naisha accounts to `'admin'` is rejected with `403 Forbidden: Only the primary administrator (Naisha) can hold administrator privileges.`
- **Self-Lockout Protection**: An administrator cannot deactivate or delete their own account, preventing accidental self-lockout.

### 5.4. Recipe Author Ownership Authorization
In `recipeController.js`, both `PUT /api/recipes/:id` and `DELETE /api/recipes/:id` enforce strict ownership validation:
- When a recipe is created, its `user_id` is recorded in PostgreSQL from `req.user.id`.
- On update or delete, the server checks:
  ```javascript
  const isOwner = req.user && recipe.user_id && req.user.id === recipe.user_id;
  const isAdmin = req.user && req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'You can only edit/delete your own recipes.',
    });
  }
  ```
- Normal users can view, search, and bookmark all public recipes, but can only modify recipes they created. Administrators retain moderation authority to clean up spam or offensive content.

---

## 6. Real Challenges & Bugs I Solved During Development

Building this exposed several real-world edge cases that I had to troubleshoot and fix:

### 1. The User Deletion 500 Error
- **What happened**: When testing the user deletion feature in the admin panel, the backend crashed with a 500 internal server error.
- **Root Cause**: The delete function had a line: `DELETE FROM recipe_favorites WHERE user_id = $1`. But `recipe_favorites` only tracks `recipe_id`, not `user_id`. PostgreSQL threw `column "user_id" does not exist`.
- **Fix**: Removed the invalid query. In our database schema, `recipes.user_id` is set to `ON DELETE SET NULL`, meaning when a user is deleted, their recipes remain in the database as community contributions without foreign key breakage.

### 2. Multer Rejections Crashing with HTML Error Screens
- **What happened**: When uploading a non-image file (like a `.txt` file) or a file exceeding limits, Express returned its default HTML error page (`<pre>Error: Only image and video files are supported</pre>`). The frontend tried to parse this as JSON and showed a vague "Failed to upload file" alert.
- **Fix**: Added a centralized JSON error middleware in `server.js`:
  ```javascript
  app.use((err, req, res, next) => {
    res.status(err.status || 400).json({
      success: false,
      message: err.message || "An unexpected error occurred",
    });
  });
  ```
  Now Multer validation errors return clean HTTP 400 JSON that the frontend displays directly to the user.

### 3. Logout Events Not Showing in Activity Logs
- **What happened**: While testing the audit logs, I noticed that `signup` and `login` events were showing up, but `logout` events were completely missing when users logged out from the website.
- **Root Cause**: The client-side `logout()` function was only clearing `localStorage` and never calling the backend `/api/auth/logout` endpoint.
- **Fix**: Wired `logout()` in the frontend to send an authenticated POST request to `/api/auth/logout` before clearing local storage. Now every logout is properly timestamped and visible in the admin activity view.

### 4. Soft-Delete vs. Permanent Purge
- Normal users clicking delete on a recipe marks `is_deleted = true`. This hides it from the public `/api/recipes` list immediately.
- The Admin Portal has a dedicated "Trash" tab where admins can review deleted recipes and either click **Restore** (`is_deleted = false`) or **Purge** (`DELETE FROM recipes WHERE id = $1`).

---

## 7. API Reference Summary

### Authentication (`/api/auth`)
- `POST /api/auth/signup` — Register new user (name, email, password >= 8 chars).
- `POST /api/auth/login` — Login with email/password; returns JWT and user profile.
- `POST /api/auth/logout` — Protected logout; writes logout event to PostgreSQL `activity_logs`.

### Recipes (`/api/recipes`)
- `GET /api/recipes` — Returns all active recipes (`WHERE is_deleted = false`).
- `POST /api/recipes` — Protected; creates new recipe linked to authenticated user ID.
- `PUT /api/recipes/:id` — Protected; updates recipe fields (title, time, media, ingredients, instructions).
- `DELETE /api/recipes/:id` — Protected; soft-deletes recipe (`is_deleted = true`).

### Media Uploads (`/api/upload`)
- `POST /api/upload` — Multipart form upload for photos (JPEG, PNG, WebP) and videos (MP4, MOV, WebM) up to 100MB. Returns static asset URL (`http://127.0.0.1:5001/uploads/filename`).

### Favorites (`/api/favorites`)
- `GET /api/favorites` — Returns all active favorited recipes.
- `POST /api/favorites` — Bookmarks a recipe by ID (`ON CONFLICT DO NOTHING`).
- `DELETE /api/favorites/:id` — Removes recipe from favorites.

### Admin Management (`/api/admin`) — *Requires admin token*
- `GET /api/admin/stats` — Returns counts for users, recipes, trash, logins, and recent activity.
- `GET /api/admin/users` — Returns user directory with roles, status, and last login dates.
- `PUT /api/admin/users/:id/role` — Switches user role between `'user'` and `'admin'`.
- `PUT /api/admin/users/:id/status` — Toggles user status between `'active'` and `'disabled'`.
- `DELETE /api/admin/users/:id` — Deletes user account with safe foreign key handling.
- `GET /api/admin/activity` — Returns full audit logs (up to 200 items).
- `GET /api/admin/recipes` — Returns all recipes (active + trashed) with creator details.
- `PUT /api/admin/recipes/:id/restore` — Restores soft-deleted recipe.
- `DELETE /api/admin/recipes/:id/permanent` — Permanently purges recipe from PostgreSQL.

---

## 8. Verification & Integration Testing

To ensure everything works end-to-end without regressions, I wrote an automated integration test script in [backend/src/scripts/comprehensiveE2ETest.js](file:///Users/naishajain/Documents/crave-recipe-app/backend/src/scripts/comprehensiveE2ETest.js).

It runs 35 automated checks covering:
- Health check and live DB connectivity.
- Admin (Naisha) and standard user login flows.
- Bad password, short password, and disabled account login blocks.
- 401/403 route protection and self-lockout prevention (self-deactivation and self-deletion blocks).
- Sole admin policy verification (non-Naisha promotion blocked with 403).
- Admin self-demotion protection (admin cannot remove their own admin privileges; blocked with 400).
- Recipe author ownership verification (non-owner edit and delete blocked with 403; author can edit and delete own recipe).
- Recipe full lifecycle: create -> edit -> soft-delete -> verify trash exclusion -> restore -> permanent purge.
- Media upload verification and invalid MIME type rejection.
- Audit trail verification ensuring real events exist in PostgreSQL.

**Test Run Output**:
```text
===============================================================
         CRAVE COMPREHENSIVE END-TO-END AUDIT SUITE           
===============================================================
35 Passed, 0 Bugs, 0 Inconsistencies
Database connected, time: 2026-11-24T05:52:14.619Z
===============================================================
```

---

## 9. Local Setup & Testing Instructions

1. **Verify `.env` configuration** in `backend/.env`:
   ```env
   PORT=5001
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=crave_db
   DB_USER=your_postgres_username
   DB_PASSWORD=your_postgres_password
   JWT_SECRET=crave_secure_jwt_secret_2026
   ```
2. **Start the backend server**:
   ```bash
   cd backend
   node src/server.js
   ```
   Server will listen on: `http://localhost:5001`
3. **Run the integration test suite**:
   ```bash
   node backend/src/scripts/comprehensiveE2ETest.js
   ```

4. **Default Test Accounts**:
   - **Primary Admin (Naisha)**: `naisha@test.com` | Password: `password123`
   - **Standard User**: `user@test.com` | Password: `password123`
   - **Secondary User**: `demo@crave.com` | Password: `password123`
