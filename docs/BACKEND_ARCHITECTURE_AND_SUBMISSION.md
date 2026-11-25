# Crave Recipe App — Backend Project Submission

**Developer**: Naisha Jain  
**Project**: Crave Recipe Application (Backend Service)  
**Date**: November 2026  
**Submitted To**: Mentor / Technical Reviewer  
**Stack**: Node.js, Express.js, PostgreSQL (`pg`), JWT, Bcrypt, Multer  
**Local API Base**: `http://127.0.0.1:5001/api`  

---

## 1. Project Overview & Architectural Intent

Hi! This document outlines how I designed and built the backend service for Crave to support all 22 application features with complete PostgreSQL database persistence.

When starting this project, my goal was to avoid mock arrays or in-memory state. I built a real production-style backend with:
1. **Relational PostgreSQL Persistence**: Storing recipes, user accounts, bookmarks, reviews, weekly meal plans, shopping lists, notifications, and immutable audit logs in `crave_db`.
2. **Proper Authentication & Security**: Stateless JWTs, Bcrypt password hashing (10 salt rounds), cryptographic password reset tokens, and server-side RBAC middleware.
3. **Sole Administrator Policy**: The platform enforces that only Naisha accounts can hold administrator privileges. Other accounts are strictly restricted to standard user roles.
4. **Ownership Authorization**: Regular users can only edit and delete their own recipes. Only the sole administrator can moderate or trash community content.
5. **Multi-Criteria Filtering & Pantry Search**: Parameterized SQL queries supporting keyword search, category matching, cooking time limits, difficulty ratings, dietary tag overlap, and pantry ingredient array lookups.
6. **Resilient Media Pipeline**: Multer-backed file upload endpoints for photos and video tutorials with disk storage under `backend/uploads/` and static streaming.

---

## 2. Directory Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # PostgreSQL Pool connection instance
│   │   └── firebaseAdmin.js      # Firebase Admin / Google OAuth ID token verification
│   ├── controllers/
│   │   ├── authController.js     # User registration, login, logout, password recovery & Google auth
│   │   ├── recipeController.js   # Recipe CRUD, advanced filters, pantry search & reviews
│   │   ├── plannerController.js  # Weekly meal planner & smart shopping list controllers
│   │   ├── profileController.js  # User profile management & notifications center
│   │   ├── adminController.js    # Metrics, user directory, trash recovery & permanent purge
│   │   └── favoriteController.js # Relational favorites management
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification, active status check & requireAdmin guard
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth/*
│   │   ├── recipeRoutes.js       # /api/recipes/*
│   │   ├── plannerRoutes.js      # /api/meal-plan and /api/shopping-list
│   │   ├── profileRoutes.js      # /api/profile and /api/notifications
│   │   ├── adminRoutes.js        # /api/admin/*
│   │   ├── favoriteRoutes.js     # /api/favorites/*
│   │   └── uploadRoutes.js       # /api/upload/*
│   ├── scripts/
│   │   ├── migrateAllFeatures.js # Complete schema migration script for all 22 features
│   │   └── comprehensiveE2ETest.js # 45-assertion end-to-end integration test suite
│   └── server.js                 # Express server configuration, CORS & static uploads route
├── uploads/                      # Uploaded images and video files
├── package.json
└── .env                          # DB credentials, port, and JWT secret
```

---

## 3. Database Schema Design (8 PostgreSQL Tables)

### 3.1. `users`
Tracks user credentials, dietary preferences, bio, and password reset tokens.
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',             -- 'user' or 'admin' (Naisha only)
    status VARCHAR(20) DEFAULT 'active',         -- 'active' or 'disabled'
    bio TEXT DEFAULT '',
    dietary_preferences TEXT[] DEFAULT '{}',
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2. `recipes`
Stores published dishes, preparation and cooking metrics, difficulty, dietary tags, nutrition, and media.
```sql
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    time_minutes INTEGER DEFAULT 30,
    prep_time_minutes INTEGER DEFAULT 15,
    servings INTEGER DEFAULT 2,
    difficulty VARCHAR(20) DEFAULT 'Medium',     -- 'Easy', 'Medium', 'Hard'
    dietary_tags TEXT[] DEFAULT '{}',            -- 'Vegetarian', 'Vegan', 'Gluten-Free', etc.
    calories INTEGER DEFAULT 420,
    protein_g INTEGER DEFAULT 18,
    carbs_g INTEGER DEFAULT 45,
    fat_g INTEGER DEFAULT 14,
    rating NUMERIC(2, 1) DEFAULT 0,
    image TEXT,
    video_url TEXT,
    ingredients TEXT[] NOT NULL,
    instructions TEXT[] NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3. `recipe_reviews` (Features 11 & 12)
Stores ratings (1–5 stars) and user feedback comments.
```sql
CREATE TABLE recipe_reviews (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4. `meal_plans` (Feature 14)
Weekly schedule slots mapped across days and meal types.
```sql
CREATE TABLE meal_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL,            -- 'Monday' through 'Sunday'
    meal_type VARCHAR(20) NOT NULL,              -- 'Breakfast', 'Lunch', 'Dinner', 'Snack'
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5. `shopping_list` (Feature 15)
Checklist items generated either manually or imported in 1-click from recipe ingredients.
```sql
CREATE TABLE shopping_list (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_text VARCHAR(255) NOT NULL,
    is_checked BOOLEAN DEFAULT false,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.6. `notifications` (Feature 19)
User notification center tracking reviews, welcome messages, and activity.
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.7. `recipe_favorites` (Feature 10)
Relational many-to-many bookmarks table linking users to recipes.

### 3.8. `activity_logs` (Feature 20)
Append-only security and session audit trail tracking login, logout, password resets, and admin actions with IP and User-Agent headers.

---

## 4. RESTful API Endpoint Reference

### 4.1. Authentication & Password Recovery (`/api/auth`)
- `POST /api/auth/signup`: Register new account with name, email, password (min 8 chars).
- `POST /api/auth/login`: Authenticate credentials, check for disabled status, return JWT and user profile.
- `POST /api/auth/logout`: Log out user and record logout event in audit trail.
- `POST /api/auth/google`: Firebase Google OAuth authentication; resolves Naisha to `admin` and all others to `user`.
- `POST /api/auth/forgot-password`: Generates cryptographic 1-hour reset token and logs activity.
- `POST /api/auth/reset-password`: Verifies reset token and updates password hash.

### 4.2. Recipe Management & Advanced Search (`/api/recipes`)
- `GET /api/recipes`: Public feed with parameterized query filters (`category`, `difficulty`, `maxTime`, `dietary`, `search`, and `ingredients` for pantry matching). Soft-deleted recipes are strictly excluded.
- `GET /api/recipes/recommended`: Personalized recipe recommendations matching user's favored cuisines and dietary preferences.
- `POST /api/recipes`: Protected creation saving prep time, servings, difficulty, dietary tags, nutrition facts, and media.
- `PUT /api/recipes/:id`: Protected update enforcing owner-or-admin authorization.
- `DELETE /api/recipes/:id`: Soft-delete moving recipe to Trash.
- `GET /api/recipes/:id/reviews`: Public fetch of all reviews and calculated average rating.
- `POST /api/recipes/:id/reviews`: Protected review submission; recalculates recipe average rating and triggers an author notification.
- `DELETE /api/recipes/reviews/:reviewId`: Protected review deletion for review authors and admins.

### 4.3. Meal Planner (`/api/meal-plan`)
- `GET /api/meal-plan`: Fetch weekly schedule sorted by Monday–Sunday and meal type.
- `POST /api/meal-plan`: Schedule a recipe into a specific day and meal slot.
- `DELETE /api/meal-plan/:id`: Remove a meal plan entry.

### 4.4. Shopping List (`/api/shopping-list`)
- `GET /api/shopping-list`: Retrieve grocery checklist items sorted by pending status.
- `POST /api/shopping-list`: Add a custom grocery item.
- `POST /api/shopping-list/from-recipe`: 1-click import of all recipe ingredients into the checklist.
- `PUT /api/shopping-list/:id/toggle`: Toggle checked/collected status.
- `DELETE /api/shopping-list/:id`: Delete individual item.
- `DELETE /api/shopping-list`: Clear all items or clear only checked items (`?checked=true`).

### 4.5. Profile & Notifications (`/api/profile` & `/api/notifications`)
- `GET /api/profile`: Retrieve user profile, created recipes count, favorites count, and published dishes.
- `PUT /api/profile`: Update display name, culinary bio, and dietary preference tags.
- `GET /api/notifications`: Retrieve recent notifications and unread badge count.
- `PUT /api/notifications/:id/read`: Mark single notification as read.
- `PUT /api/notifications/read-all`: Mark all notifications as read.

### 4.6. Admin Console (`/api/admin`)
- `GET /api/admin/stats`: Live count of users, published recipes, trashed recipes, and login activity.
- `GET /api/admin/users`: Searchable directory of all registered accounts.
- `PUT /api/admin/users/:id/status`: Activate or disable account (with self-action lockout prevention).
- `PUT /api/admin/users/:id/role`: Enforces sole administrator rule; non-Naisha promotion rejected with 403.
- `DELETE /api/admin/users/:id`: Delete user account with self-deletion protection.
- `GET /api/admin/recipes/trash`: List soft-deleted recipes in trash.
- `PUT /api/admin/recipes/:id/restore`: Restore trashed recipe to public feed.
- `DELETE /api/admin/recipes/:id/purge`: Permanently delete recipe from database.
- `GET /api/admin/activity`: Live audit trail of all platform events.

---

## 5. Security & RBAC Implementation Highlights

1. **Sole Administrator Enforcement**:
   ```javascript
   const isNaisha = targetEmail === "naisha@test.com" || 
                    targetEmail === "naishajain982@gmail.com" || 
                    (targetUser.name.toLowerCase() === "naisha" && targetEmail.includes("naisha"));

   if (newRole === "admin" && !isNaisha) {
       return res.status(403).json({
           success: false,
           message: "Administrator role is strictly reserved for Naisha. Other accounts cannot be promoted to admin.",
       });
   }
   ```
2. **Recipe Ownership Protection**:
   ```javascript
   const isOwner = req.user && recipe.user_id && req.user.id === recipe.user_id;
   const isAdmin = req.user && req.user.role === "admin";

   if (!isOwner && !isAdmin) {
       return res.status(403).json({
           success: false,
           message: "You can only edit or delete your own recipes.",
       });
   }
   ```
3. **Admin Self-Protection Guards**:
   Admins are prevented from disabling, deleting, or demoting their own active session account.

---

## 6. Automated End-to-End Integration Test Suite

I created an automated integration test suite in [backend/src/scripts/comprehensiveE2ETest.js](file:///Users/naishajain/Documents/crave-recipe-app/backend/src/scripts/comprehensiveE2ETest.js).

It runs 45 automated checks across 14 sections:
- System & Database Health (Health check, PostgreSQL connectivity)
- Authentication & Password Security (Admin login, User login, wrong password 401, short password 400, disabled account 403, logout audit)
- Google OAuth (Email validation, auto-registration, Naisha admin resolution)
- RBAC & Admin Route Security (401/403 checks, sole admin rule, self-lockout guards)
- Recipe CRUD & Ownership (Create, update, non-owner 403 block, soft-delete, trash exclusion, restore, permanent purge)
- Media Upload (Image & MP4 upload, static file serving, MIME rejection)
- Favorites System (Relational bookmarks verification)
- Audit Trail Integrity (Logging of 190+ events in PostgreSQL)
- Data Scrutiny (Image validity, category inventory)
- Advanced Filters & Pantry Search (Filter by category/difficulty, match ingredients in pantry)
- Ratings & Reviews (Post review, average calculation, author delete)
- Weekly Meal Planner (Schedule meal, verify weekly calendar, clean up)
- Shopping List (1-click import from recipe, toggle checkbox, clear list)
- Profile & Notifications (Fetch profile, update bio/dietary, notifications center)
- Password Recovery (Forgot password token generation, password reset confirmation)

**Latest Test Run Output**:
```text
===============================================================
         CRAVE COMPREHENSIVE END-TO-END AUDIT SUITE           
===============================================================
45 Passed, 0 Bugs, 0 Inconsistencies
Database connected, time: 2026-11-25T09:03:13.142Z
===============================================================
```

---

## 7. Local Setup & Testing

1. **Start the backend server**:
   ```bash
   cd backend
   node src/server.js
   ```
   Server listens on `http://localhost:5001`.

2. **Run the integration test suite**:
   ```bash
   node backend/src/scripts/comprehensiveE2ETest.js
   ```

3. **Default Test Accounts**:
   - **Primary Admin (Naisha)**: `naisha@test.com` | Password: `password123`
   - **Standard User**: `user@test.com` | Password: `password123`
   - **Google Admin**: `naishajain982@gmail.com`
