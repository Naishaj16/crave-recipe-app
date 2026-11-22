const pool = require("../config/db");

// Audit helper for administrator actions
const logAdminAction = async (req, action, targetEmail = "", details = "") => {
  try {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";

    await pool.query(
      `INSERT INTO activity_logs (user_id, email, user_name, action, status, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, 'success', $5, $6)`,
      [
        req.user.id,
        targetEmail || req.user.email,
        req.user.name,
        action,
        String(ip).slice(0, 100),
        userAgent,
      ]
    );
  } catch (err) {
    console.error("Admin audit log error:", err.message);
  }
};

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const userRes = await pool.query("SELECT COUNT(*) FROM users");
    const activeUsersRes = await pool.query(
      "SELECT COUNT(*) FROM users WHERE status = 'active'"
    );
    const activeRecipesRes = await pool.query(
      "SELECT COUNT(*) FROM recipes WHERE is_deleted = false"
    );
    const trashRes = await pool.query(
      "SELECT COUNT(*) FROM recipes WHERE is_deleted = true"
    );
    const favoritesRes = await pool.query(
      "SELECT COUNT(*) FROM recipe_favorites"
    );
    const loginCountRes = await pool.query(
      "SELECT COUNT(*) FROM activity_logs WHERE action = 'login' AND status = 'success'"
    );
    const recentActivityRes = await pool.query(
      "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 8"
    );

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(userRes.rows[0].count, 10),
        activeUsers: parseInt(activeUsersRes.rows[0].count, 10),
        activeRecipes: parseInt(activeRecipesRes.rows[0].count, 10),
        trashedRecipes: parseInt(trashRes.rows[0].count, 10),
        totalFavorites: parseInt(favoritesRes.rows[0].count, 10),
        totalLogins: parseInt(loginCountRes.rows[0].count, 10),
        recentActivity: recentActivityRes.rows,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, status, last_login, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error("Admin getUsers error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// PUT /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be 'user' or 'admin'",
      });
    }

    const result = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, status",
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = result.rows[0];

    await logAdminAction(
      req,
      `role_change:${role}`,
      updatedUser.email,
      `Changed role of ${updatedUser.name} to ${role}`
    );

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Admin updateUserRole error:", error);
    res.status(500).json({ success: false, message: "Failed to update user role" });
  }
};

// PUT /api/admin/users/:id/status
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'disabled'",
      });
    }

    // Safety: prevent admin from disabling own account
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot disable your own administrator account",
      });
    }

    const result = await pool.query(
      "UPDATE users SET status = $1 WHERE id = $2 RETURNING id, name, email, role, status",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = result.rows[0];

    await logAdminAction(
      req,
      status === "disabled" ? "account_deactivated" : "account_activated",
      updatedUser.email,
      `${status === "disabled" ? "Deactivated" : "Activated"} account for ${updatedUser.name}`
    );

    res.json({
      success: true,
      message: `User status changed to ${status}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Admin updateUserStatus error:", error);
    res.status(500).json({ success: false, message: "Failed to update user status" });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own administrator account",
      });
    }

    // Get user details before deletion for audit log
    const userRes = await pool.query(
      "SELECT name, email FROM users WHERE id = $1",
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const targetUser = userRes.rows[0];

    await pool.query("DELETE FROM recipe_favorites WHERE user_id = $1", [id]);
    await pool.query("UPDATE recipes SET user_id = NULL WHERE user_id = $1", [id]);
    await pool.query("DELETE FROM users WHERE id = $1", [id]);

    await logAdminAction(
      req,
      "user_deleted",
      targetUser.email,
      `Permanently deleted account ${targetUser.name} (${targetUser.email})`
    );

    res.json({
      success: true,
      message: "User account deleted successfully",
      id: parseInt(id, 10),
    });
  } catch (error) {
    console.error("Admin deleteUser error:", error);
    res.status(500).json({ success: false, message: "Failed to delete user account" });
  }
};

// GET /api/admin/activity
const getActivityLogs = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200"
    );
    res.json({ success: true, activities: result.rows });
  } catch (error) {
    console.error("Admin getActivityLogs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch activity logs" });
  }
};

// GET /api/admin/recipes
const getAllRecipes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        u.name AS creator_name,
        u.email AS creator_email,
        u.role AS creator_role
      FROM recipes r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, recipes: result.rows });
  } catch (error) {
    console.error("Admin getAllRecipes error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch recipes" });
  }
};

// PUT /api/admin/recipes/:id/soft-delete
const softDeleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE recipes SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Recipe not found" });
    }

    const recipe = result.rows[0];

    await logAdminAction(
      req,
      "recipe_soft_deleted",
      req.user.email,
      `Moved recipe "${recipe.name}" (ID: ${recipe.id}) to trash`
    );

    res.json({
      success: true,
      message: "Recipe moved to trash",
      recipe,
    });
  } catch (error) {
    console.error("Admin softDeleteRecipe error:", error);
    res.status(500).json({ success: false, message: "Failed to soft-delete recipe" });
  }
};

// PUT /api/admin/recipes/:id/restore
const restoreRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE recipes SET is_deleted = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Recipe not found" });
    }

    const recipe = result.rows[0];

    await logAdminAction(
      req,
      "recipe_restored",
      req.user.email,
      `Restored recipe "${recipe.name}" (ID: ${recipe.id}) from trash`
    );

    res.json({
      success: true,
      message: "Recipe restored successfully",
      recipe,
    });
  } catch (error) {
    console.error("Admin restoreRecipe error:", error);
    res.status(500).json({ success: false, message: "Failed to restore recipe" });
  }
};

// DELETE /api/admin/recipes/:id/permanent
const permanentDeleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;

    const recipeRes = await pool.query(
      "SELECT name FROM recipes WHERE id = $1",
      [id]
    );

    if (recipeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Recipe not found" });
    }

    const recipeName = recipeRes.rows[0].name;

    await pool.query("DELETE FROM recipe_favorites WHERE recipe_id = $1", [id]);
    await pool.query("DELETE FROM recipes WHERE id = $1", [id]);

    await logAdminAction(
      req,
      "recipe_permanently_deleted",
      req.user.email,
      `Permanently deleted recipe "${recipeName}" (ID: ${id})`
    );

    res.json({
      success: true,
      message: "Recipe permanently deleted",
      id: parseInt(id, 10),
    });
  } catch (error) {
    console.error("Admin permanentDeleteRecipe error:", error);
    res.status(500).json({ success: false, message: "Failed to permanently delete recipe" });
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getActivityLogs,
  getAllRecipes,
  softDeleteRecipe,
  restoreRecipe,
  permanentDeleteRecipe,
};
