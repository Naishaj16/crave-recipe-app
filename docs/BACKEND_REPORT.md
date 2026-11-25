# Crave – Backend Report

Naisha Jain
November 2026

Stack: Node.js, Express, PostgreSQL (`pg`), JWT, bcrypt, Multer
Runs locally at `http://127.0.0.1:5001/api`

---

## What I was trying to build

I wanted the backend to actually store things in a database instead of keeping recipes in an array or in localStorage. So everything (users, recipes, favorites, and a log of what happened) goes into a PostgreSQL database called `crave_db`.

The other things I cared about:

- Normal users and admins should be separated on the server, not just by hiding buttons on the frontend.
- There should be a record of logins, logouts, failed logins, and admin actions.
- Users should be able to upload photos and videos from their phone or laptop.

## Why I picked these tools

I used Express because I already knew it and the project isn't big enough to need anything heavier. I split the code into routes, controllers, middleware and config so each file has one job.

For the database I used `pg` directly with parameterized queries instead of an ORM like Prisma or Sequelize. Part of the reason was that I wanted to actually understand the SQL I was running. It also made it easier to use Postgres-specific things like `TEXT[]` columns and to remember the `is_deleted` filter everywhere.

Passwords are hashed with bcrypt (10 salt rounds) and login gives back a JWT. Uploads go through Multer and are saved in `backend/uploads/`, which Express serves as static files.

## Folder structure

```text
backend/
├── src/
│   ├── config/db.js                  # Postgres connection pool
│   ├── controllers/
│   │   ├── authController.js         # signup, login, logout, activity logging
│   │   ├── recipeController.js       # recipe CRUD and soft delete
│   │   ├── adminController.js        # stats, users, trash, purge
│   │   └── favoriteController.js     # favorites
│   ├── middleware/authMiddleware.js  # checks the token, account status, admin role
│   ├── routes/                       # auth, recipes, admin, favorites, upload
│   ├── scripts/comprehensiveE2ETest.js
│   └── server.js                     # app setup, CORS, static files, error handler
├── uploads/
├── package.json
└── .env
```

## Database

There are four tables.

**users** stores name, email (unique), the hashed password, `role` ('user' or 'admin'), `status` ('active' or 'disabled'), `last_login` and `created_at`.

**recipes** stores the recipe itself. Ingredients and instructions are Postgres text arrays. `user_id` points to whoever created it, and it's set to `ON DELETE SET NULL` so that if a user gets deleted, their recipes stay. There's also an `is_deleted` flag for soft delete.

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

**recipe_favorites** links to a recipe with `ON DELETE CASCADE`, so purging a recipe removes its favorites too. Right now it only has `recipe_id` with a unique constraint on it, which means favorites are shared by everyone and not per user. I explain this more under "Known limitations".

**activity_logs** is the audit log: user id, email, name, action, status, IP address, user agent and time. I only ever insert into it, never update.

## Auth and permissions

Signup needs a password of at least 8 characters. The email is trimmed and lowercased before I check whether it already exists, so `Test@x.com` and `test@x.com` count as the same account.

The auth middleware doesn't only check that the JWT is valid. It also looks the user up in the database on every request:

```javascript
const userRes = await pool.query(
    "SELECT id, name, email, role, status FROM users WHERE id = $1",
    [decoded.id]
);
```

I did this so that if an admin disables someone, their very next request gets a 403. Otherwise they'd stay logged in until the token expired. The trade-off is one extra query per request, which is fine at this size.

`requireAdmin` checks `req.user.role === 'admin'` and returns 403 for anyone else. In the admin controller I also stopped admins from disabling or deleting their own account, since that could lock the only admin out.

## Bugs I ran into

**Deleting a user gave a 500 error.** The delete function had `DELETE FROM recipe_favorites WHERE user_id = $1`, but that table doesn't have a `user_id` column, so Postgres threw an error. I removed that line. Recipes don't need any cleanup because of `ON DELETE SET NULL`.

**Upload errors came back as HTML.** When Multer rejected a file (wrong type or too big), Express sent its default HTML error page. The frontend tried to parse it as JSON and just showed "Failed to upload file". I added an error handler at the end of `server.js` that always returns JSON:

```javascript
app.use((err, req, res, next) => {
  res.status(err.status || 400).json({
    success: false,
    message: err.message || "An unexpected error occurred",
  });
});
```

Now the user sees the actual reason, like "Only image and video files are supported". One thing I'd still change: it defaults to 400, so a real server bug would also show up as 400 instead of 500.

**Logouts weren't in the activity log.** Signups and logins showed up but logouts never did. The frontend `logout()` was only clearing localStorage and never called `/api/auth/logout`. I changed it to call the endpoint first.

**Soft delete vs purge.** When a user deletes a recipe it only sets `is_deleted = true`, so it disappears from the public list but can be recovered. Admins have a Trash tab where they can restore it or delete it for real.

## API endpoints

Auth (`/api/auth`)
- `POST /signup`
- `POST /login` – returns a token and the user
- `POST /logout` – needs a token, writes a logout entry to the log

Recipes (`/api/recipes`)
- `GET /` – all recipes where `is_deleted = false`
- `POST /` – needs a token, saves the creator's id
- `PUT /:id` – needs a token
- `DELETE /:id` – needs a token, soft delete

Upload (`/api/upload`)
- `POST /` – images (JPEG, PNG, WebP) and videos (MP4, MOV, WebM), up to 100 MB. Returns the file URL.

Favorites (`/api/favorites`)
- `GET /`, `POST /` (uses `ON CONFLICT DO NOTHING`), `DELETE /:id`

Admin (`/api/admin`, admin token required)
- `GET /stats`
- `GET /users`
- `PUT /users/:id/role`
- `PUT /users/:id/status`
- `DELETE /users/:id`
- `GET /activity` – latest 200 entries
- `GET /recipes` – includes trashed ones
- `PUT /recipes/:id/restore`
- `DELETE /recipes/:id/permanent`

## Testing

I wrote a script, `backend/src/scripts/comprehensiveE2ETest.js`, that runs against the live server and database. It has 30 checks, including:

- the server and database are up
- admin and normal user can log in
- wrong password, short password and disabled accounts are rejected
- protected routes return 401/403, and an admin can't disable themselves
- a recipe can be created, edited, soft deleted (and is then hidden), restored and purged
- uploads work and wrong file types are rejected
- the actions above actually show up in `activity_logs`

All 30 checks passed on my last run. These are integration tests rather than unit tests, so they need Postgres running and they create real rows in the database.

## Known limitations / what I'd do next

- **Favorites aren't per user.** Because `recipe_favorites` only has `recipe_id`, if one person favorites a recipe, it's a favorite for everyone. The fix is adding a `user_id` column, changing the unique constraint to `(user_id, recipe_id)`, and filtering by the logged-in user.
- No rate limiting on login yet, so someone could keep guessing passwords.
- Files are stored on local disk, which won't work if the app is deployed on more than one server. Something like S3 would be better.
- The tests use the same database as development. A separate test database would be cleaner.

## Running it locally

1. Create `backend/.env`:
   ```env
   PORT=5001
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=crave_db
   DB_USER=your_postgres_username
   DB_PASSWORD=your_postgres_password
   JWT_SECRET=any_long_random_string
   ```
2. Start the server:
   ```bash
   cd backend
   node src/server.js
   ```
3. Run the tests (with the server running):
   ```bash
   node backend/src/scripts/comprehensiveE2ETest.js
   ```
