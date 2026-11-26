const pool = require("../config/db");

// ==========================================
// PROFILE MANAGEMENT (Feature 18)
// ==========================================

// GET /api/profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const userRes = await pool.query(
      `SELECT id, name, email, role, status, bio, dietary_preferences, created_at, last_login, two_factor_enabled
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = userRes.rows[0];

    // Get count of user's created recipes
    const recipesCountRes = await pool.query(
      "SELECT COUNT(*) FROM recipes WHERE user_id = $1 AND is_deleted = false",
      [userId]
    );

    // Get count of user's favorites
    const favCountRes = await pool.query(
      "SELECT COUNT(*) FROM recipe_favorites rf JOIN recipes r ON rf.recipe_id = r.id WHERE r.is_deleted = false",
      []
    );

    // Get user's own created recipes
    const createdRecipes = await pool.query(
      "SELECT id, name, category, time_minutes, image, rating, created_at FROM recipes WHERE user_id = $1 AND is_deleted = false ORDER BY created_at DESC",
      [userId]
    );

    res.json({
      success: true,
      profile: {
        ...user,
        twoFactorEnabled: Boolean(user.two_factor_enabled),
        createdRecipesCount: parseInt(recipesCountRes.rows[0].count, 10),
        favoritesCount: parseInt(favCountRes.rows[0].count, 10),
        recipes: createdRecipes.rows,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Failed to load profile" });
  }
};

// PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio, dietary_preferences } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const result = await pool.query(
      `UPDATE users 
       SET name = $1, bio = $2, dietary_preferences = $3 
       WHERE id = $4 
       RETURNING id, name, email, role, status, bio, dietary_preferences`,
      [name.trim(), bio || "", dietary_preferences || [], userId]
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

// ==========================================
// NOTIFICATIONS (Feature 19)
// ==========================================

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Auto-seed welcome notification if user has none
    const existing = await pool.query(
      "SELECT COUNT(*) FROM notifications WHERE user_id = $1",
      [userId]
    );

    if (parseInt(existing.rows[0].count, 10) === 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES 
         ($1, 'Welcome to Crave!', 'Explore culinary recipes, save your favorites, and plan your weekly meals.', 'welcome', '/'),
         ($1, 'Weekly Meal Planner', 'You can now plan breakfast, lunch, and dinner directly from recipe cards.', 'info', '/meal-planner')`,
        [userId]
      );
    }

    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [userId]
    );

    const unreadCountRes = await pool.query(
      "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
      [userId]
    );

    res.json({
      success: true,
      notifications: result.rows,
      unreadCount: parseInt(unreadCountRes.rows[0].count, 10),
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: "Failed to load notifications" });
  }
};

// PUT /api/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ success: false, message: "Failed to update notification" });
  }
};

// PUT /api/notifications/read-all
const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1",
      [userId]
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ success: false, message: "Failed to update notifications" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
