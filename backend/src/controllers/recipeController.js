const pool = require("../config/db");

// GET all active recipes
const getRecipes = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM recipes WHERE is_deleted = false ORDER BY created_at DESC"
    );

    res.json({ success: true, recipes: result.rows });
  } catch (error) {
    console.error("Fetch error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch recipes" });
  }
};

// POST create recipe
const createRecipe = async (req, res) => {
  try {
    const {
      name, description, category, time_minutes,
      rating, image, ingredients, instructions,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO recipes
      (name, description, category, time_minutes, rating, image, ingredients, instructions)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        name, description || "", category, time_minutes || 0,
        rating || 0, image || "", ingredients || [], instructions || [],
      ]
    );

    res.status(201).json({
      success: true,
      message: "Recipe created",
      recipe: result.rows[0],
    });
  } catch (error) {
    console.error("Create error:", error.message);
    res.status(500).json({ success: false, message: "Failed to create recipe" });
  }
};

// PUT update recipe
const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, category, time_minutes,
      rating, image, ingredients, instructions,
    } = req.body;

    const result = await pool.query(
      `UPDATE recipes SET
        name = $1,
        description = $2,
        category = $3,
        time_minutes = $4,
        rating = $5,
        image = $6,
        ingredients = $7,
        instructions = $8,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND is_deleted = false
       RETURNING *`,
      [
        name, description || "", category, time_minutes || 0,
        rating || 0, image || "", ingredients || [], instructions || [], id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    res.json({
      success: true,
      message: "Recipe updated",
      recipe: result.rows[0],
    });
  } catch (error) {
    console.error("Update error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update recipe" });
  }
};

// DELETE soft-delete recipe (move to Trash)
const deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE recipes
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_deleted = false
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    res.json({ success: true, message: "Recipe moved to Trash" });
  } catch (error) {
    console.error("Delete error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete recipe" });
  }
};

module.exports = {
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
};