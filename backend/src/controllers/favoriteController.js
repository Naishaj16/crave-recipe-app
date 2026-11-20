const pool = require("../config/db");

// Get all favorites
const getFavorites = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT recipes.* 
       FROM recipe_favorites 
       JOIN recipes ON recipes.id = recipe_favorites.recipe_id
       WHERE recipes.is_deleted = false
       ORDER BY recipe_favorites.created_at DESC`
    );

    res.json({
      success: true,
      favorites: result.rows,
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ message: "Failed to fetch favorites" });
  }
};

// Add a favorite
const addFavorite = async (req, res) => {
  try {
    const { recipe_id } = req.body;

    if (!recipe_id) {
      return res.status(400).json({ message: "Recipe ID is required" });
    }

    await pool.query(
      `INSERT INTO recipe_favorites (recipe_id)
       VALUES ($1)
       ON CONFLICT (recipe_id) DO NOTHING`,
      [recipe_id]
    );

    res.json({ success: true, message: "Recipe added to favorites" });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ message: "Failed to add favorite" });
  }
};

// Remove a favorite
const removeFavorite = async (req, res) => {
  try {
    const { recipe_id } = req.params;

    await pool.query("DELETE FROM recipe_favorites WHERE recipe_id = $1", [
      recipe_id,
    ]);

    res.json({ success: true, message: "Favorite removed" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ message: "Failed to remove favorite" });
  }
};

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
};

