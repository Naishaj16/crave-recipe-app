const pool = require("../config/db");

// ==========================================
// MEAL PLANNER CONTROLLERS
// ==========================================

// GET /api/meal-plan
const getMealPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT mp.*, r.name as recipe_name, r.image as recipe_image, 
              r.time_minutes, r.category, r.difficulty, r.calories
       FROM meal_plans mp
       JOIN recipes r ON mp.recipe_id = r.id
       WHERE mp.user_id = $1 AND r.is_deleted = false
       ORDER BY 
         CASE mp.day_of_week
           WHEN 'Monday' THEN 1
           WHEN 'Tuesday' THEN 2
           WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4
           WHEN 'Friday' THEN 5
           WHEN 'Saturday' THEN 6
           WHEN 'Sunday' THEN 7
           ELSE 8
         END,
         CASE mp.meal_type
           WHEN 'Breakfast' THEN 1
           WHEN 'Lunch' THEN 2
           WHEN 'Dinner' THEN 3
           WHEN 'Snack' THEN 4
           ELSE 5
         END`,
      [userId]
    );

    res.json({ success: true, mealPlans: result.rows });
  } catch (error) {
    console.error("Get meal plans error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch meal plans" });
  }
};

// POST /api/meal-plan
const addMealPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { day_of_week, meal_type, recipe_id, notes } = req.body;

    if (!day_of_week || !meal_type || !recipe_id) {
      return res.status(400).json({
        success: false,
        message: "Day of week, meal type, and recipe ID are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO meal_plans (user_id, day_of_week, meal_type, recipe_id, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, day_of_week, meal_type, recipe_id, notes || ""]
    );

    // Fetch complete recipe info for response
    const complete = await pool.query(
      `SELECT mp.*, r.name as recipe_name, r.image as recipe_image, 
              r.time_minutes, r.category, r.difficulty, r.calories
       FROM meal_plans mp
       JOIN recipes r ON mp.recipe_id = r.id
       WHERE mp.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: "Meal added to planner",
      mealPlan: complete.rows[0] || result.rows[0],
    });
  } catch (error) {
    console.error("Add meal plan error:", error);
    res.status(500).json({ success: false, message: "Failed to add meal plan" });
  }
};

// DELETE /api/meal-plan/:id
const deleteMealPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM meal_plans WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Meal plan item not found" });
    }

    res.json({ success: true, message: "Meal removed from planner" });
  } catch (error) {
    console.error("Delete meal plan error:", error);
    res.status(500).json({ success: false, message: "Failed to delete meal plan" });
  }
};

// ==========================================
// SHOPPING LIST CONTROLLERS
// ==========================================

// GET /api/shopping-list
const getShoppingList = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT sl.*, r.name as recipe_name 
       FROM shopping_list sl
       LEFT JOIN recipes r ON sl.recipe_id = r.id
       WHERE sl.user_id = $1
       ORDER BY sl.is_checked ASC, sl.created_at DESC`,
      [userId]
    );

    res.json({ success: true, items: result.rows });
  } catch (error) {
    console.error("Get shopping list error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch shopping list" });
  }
};

// POST /api/shopping-list
const addShoppingItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_text, recipe_id } = req.body;

    if (!item_text || !item_text.trim()) {
      return res.status(400).json({ success: false, message: "Item text is required" });
    }

    const result = await pool.query(
      `INSERT INTO shopping_list (user_id, item_text, recipe_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, item_text.trim(), recipe_id || null]
    );

    res.status(201).json({
      success: true,
      message: "Item added to shopping list",
      item: result.rows[0],
    });
  } catch (error) {
    console.error("Add shopping item error:", error);
    res.status(500).json({ success: false, message: "Failed to add shopping item" });
  }
};

// POST /api/shopping-list/from-recipe (Feature 15)
const addFromRecipe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipe_id } = req.body;

    if (!recipe_id) {
      return res.status(400).json({ success: false, message: "Recipe ID is required" });
    }

    const recipeRes = await pool.query(
      "SELECT id, name, ingredients FROM recipes WHERE id = $1 AND is_deleted = false",
      [recipe_id]
    );

    if (recipeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Recipe not found" });
    }

    const recipe = recipeRes.rows[0];
    let ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

    if (ingredients.length === 0) {
      ingredients = [`Fresh ingredients for ${recipe.name}`];
    }

    for (const ing of ingredients) {
      if (ing && ing.trim()) {
        await pool.query(
          `INSERT INTO shopping_list (user_id, item_text, recipe_id)
           VALUES ($1, $2, $3)`,
          [userId, ing.trim(), recipe.id]
        );
      }
    }

    const updated = await pool.query(
      "SELECT * FROM shopping_list WHERE user_id = $1 ORDER BY is_checked ASC, created_at DESC",
      [userId]
    );

    res.json({
      success: true,
      message: `Added ${ingredients.length} ingredients from "${recipe.name}" to shopping list`,
      items: updated.rows,
    });
  } catch (error) {
    console.error("Add from recipe error:", error);
    res.status(500).json({ success: false, message: "Failed to add ingredients" });
  }
};

// PUT /api/shopping-list/:id/toggle
const toggleShoppingItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE shopping_list 
       SET is_checked = NOT is_checked 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error("Toggle shopping item error:", error);
    res.status(500).json({ success: false, message: "Failed to update item" });
  }
};

// DELETE /api/shopping-list/:id
const deleteShoppingItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM shopping_list WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, message: "Item removed" });
  } catch (error) {
    console.error("Delete shopping item error:", error);
    res.status(500).json({ success: false, message: "Failed to delete item" });
  }
};

// DELETE /api/shopping-list/clear
const clearShoppingList = async (req, res) => {
  try {
    const userId = req.user.id;
    const onlyChecked = req.query.checked === "true";

    if (onlyChecked) {
      await pool.query("DELETE FROM shopping_list WHERE user_id = $1 AND is_checked = true", [userId]);
    } else {
      await pool.query("DELETE FROM shopping_list WHERE user_id = $1", [userId]);
    }

    res.json({ success: true, message: "Shopping list cleared" });
  } catch (error) {
    console.error("Clear shopping list error:", error);
    res.status(500).json({ success: false, message: "Failed to clear list" });
  }
};

module.exports = {
  getMealPlans,
  addMealPlan,
  deleteMealPlan,
  getShoppingList,
  addShoppingItem,
  addFromRecipe,
  toggleShoppingItem,
  deleteShoppingItem,
  clearShoppingList,
};
