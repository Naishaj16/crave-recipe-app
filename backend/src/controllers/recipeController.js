const pool = require("../config/db");

// GET /api/recipes - Fetch all active recipes
const getAllRecipes = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM recipes WHERE is_deleted = false ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
};

// GET /api/recipes/:id - Fetch single recipe by ID
const getRecipeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM recipes WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
};

// POST /api/recipes - Create a new recipe
const createRecipe = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      time,
      rating,
      image,
      ingredients,
      instructions,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO recipes 
       (name, description, category, time, rating, image, ingredients, instructions, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
       RETURNING *`,
      [
        name,
        description,
        category,
        time || "30 min",
        rating || "5.0",
        image,
        ingredients,
        instructions,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json({ error: "Failed to create recipe" });
  }
};

// PUT /api/recipes/:id - Update an existing recipe
const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      time,
      rating,
      image,
      ingredients,
      instructions,
    } = req.body;

    const result = await pool.query(
      `UPDATE recipes 
       SET name = $1, description = $2, category = $3, time = $4, rating = $5, image = $6, ingredients = $7, instructions = $8
       WHERE id = $9
       RETURNING *`,
      [name, description, category, time, rating, image, ingredients, instructions, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating recipe:", error);
    res.status(500).json({ error: "Failed to update recipe" });
  }
};

// DELETE /api/recipes/:id - Soft delete a recipe
const deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE recipes SET is_deleted = true WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.json({ message: "Recipe moved to trash", recipe: result.rows[0] });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
};

module.exports = {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
};

