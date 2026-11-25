const pool = require("../config/db");

// GET all active recipes with optional advanced filters & pantry search
const getRecipes = async (req, res) => {
  try {
    const {
      category,
      difficulty,
      maxTime,
      dietary,
      search,
      ingredients, // Comma-separated pantry ingredients (Feature 8)
    } = req.query;

    let queryText = "SELECT * FROM recipes WHERE is_deleted = false";
    const queryParams = [];
    let paramIndex = 1;

    // Filter by category
    if (category && category !== "All") {
      queryText += ` AND category = $${paramIndex++}`;
      queryParams.push(category);
    }

    // Filter by difficulty
    if (difficulty && difficulty !== "All") {
      queryText += ` AND difficulty = $${paramIndex++}`;
      queryParams.push(difficulty);
    }

    // Filter by max cooking time
    if (maxTime && !isNaN(parseInt(maxTime, 10))) {
      queryText += ` AND time_minutes <= $${paramIndex++}`;
      queryParams.push(parseInt(maxTime, 10));
    }

    // Filter by dietary tag
    if (dietary && dietary !== "All") {
      queryText += ` AND $${paramIndex++} = ANY(dietary_tags)`;
      queryParams.push(dietary);
    }

    // Search by keyword (name, description, category)
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      queryText += ` AND (LOWER(name) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex} OR LOWER(category) LIKE $${paramIndex})`;
      queryParams.push(term);
      paramIndex++;
    }

    // Pantry / Ingredient-based search (Feature 8)
    if (ingredients && ingredients.trim()) {
      const pantryList = ingredients
        .split(",")
        .map((i) => i.trim().toLowerCase())
        .filter(Boolean);

      if (pantryList.length > 0) {
        // Match recipes where ingredients array overlaps with any pantry term
        const likeConditions = pantryList.map((_, i) => `EXISTS (
          SELECT 1 FROM unnest(ingredients) ing 
          WHERE LOWER(ing) LIKE $${paramIndex + i}
        )`).join(" OR ");

        queryText += ` AND (${likeConditions})`;
        pantryList.forEach((item) => queryParams.push(`%${item}%`));
        paramIndex += pantryList.length;
      }
    }

    queryText += " ORDER BY created_at DESC";

    const result = await pool.query(queryText, queryParams);
    res.json({ success: true, recipes: result.rows });
  } catch (error) {
    console.error("Fetch error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch recipes" });
  }
};

// GET personalized recipe recommendations (Feature 13)
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // Find user's favorited categories and dietary preferences
      const favCategoriesRes = await pool.query(
        `SELECT DISTINCT r.category 
         FROM recipe_favorites rf
         JOIN recipes r ON rf.recipe_id = r.id
         WHERE rf.user_id = $1 AND r.is_deleted = false`,
        [userId]
      );
      const userRes = await pool.query(
        "SELECT dietary_preferences FROM users WHERE id = $1",
        [userId]
      );

      const preferredCategories = favCategoriesRes.rows.map((r) => r.category);
      const userDietary = userRes.rows[0]?.dietary_preferences || [];

      let recQuery = `SELECT * FROM recipes WHERE is_deleted = false`;
      const recParams = [];

      if (preferredCategories.length > 0 || userDietary.length > 0) {
        recQuery += ` AND (category = ANY($1) OR dietary_tags && $2)`;
        recParams.push(preferredCategories, userDietary);
      }

      recQuery += ` ORDER BY rating DESC, created_at DESC LIMIT 6`;
      const recResult = await pool.query(recQuery, recParams);

      if (recResult.rows.length >= 2) {
        return res.json({ success: true, recommendations: recResult.rows });
      }
    }

    // Default top rated recommendations
    const topRated = await pool.query(
      `SELECT * FROM recipes 
       WHERE is_deleted = false 
       ORDER BY rating DESC, created_at DESC 
       LIMIT 6`
    );

    res.json({ success: true, recommendations: topRated.rows });
  } catch (error) {
    console.error("Recommendations error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load recommendations" });
  }
};

// POST create recipe (supports prep time, servings, difficulty, dietary tags, nutrition)
const createRecipe = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      time_minutes,
      prep_time_minutes,
      servings,
      difficulty,
      dietary_tags,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      image,
      ingredients,
      instructions,
      video_url,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required",
      });
    }

    // Strict User Ownership: user_id must come directly from verified JWT, never request body
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to create a recipe.",
      });
    }

    const result = await pool.query(
      `INSERT INTO recipes
      (name, description, category, time_minutes, prep_time_minutes, servings, difficulty, 
       dietary_tags, calories, protein_g, carbs_g, fat_g, image, ingredients, instructions, video_url, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        name,
        description || "",
        category,
        parseInt(time_minutes, 10) || 30,
        parseInt(prep_time_minutes, 10) || 15,
        parseInt(servings, 10) || 2,
        difficulty || "Medium",
        Array.isArray(dietary_tags) ? dietary_tags : [],
        parseInt(calories, 10) || 420,
        parseInt(protein_g, 10) || 18,
        parseInt(carbs_g, 10) || 45,
        parseInt(fat_g, 10) || 14,
        image || "",
        Array.isArray(ingredients) ? ingredients : [],
        Array.isArray(instructions) ? instructions : [],
        video_url || null,
        userId,
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
      name,
      description,
      category,
      time_minutes,
      prep_time_minutes,
      servings,
      difficulty,
      dietary_tags,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      image,
      ingredients,
      instructions,
      video_url,
    } = req.body;

    const existing = await pool.query(
      "SELECT id, user_id, is_deleted FROM recipes WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0 || existing.rows[0].is_deleted) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    const recipe = existing.rows[0];

    // Authorization: only author or admin can edit
    const isOwner = req.user && recipe.user_id && req.user.id === recipe.user_id;
    const isAdmin = req.user && req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own recipes.",
      });
    }

    const result = await pool.query(
      `UPDATE recipes SET
        name = $1,
        description = $2,
        category = $3,
        time_minutes = $4,
        prep_time_minutes = $5,
        servings = $6,
        difficulty = $7,
        dietary_tags = $8,
        calories = $9,
        protein_g = $10,
        carbs_g = $11,
        fat_g = $12,
        image = $13,
        ingredients = $14,
        instructions = $15,
        video_url = $16,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $17 AND is_deleted = false
       RETURNING *`,
      [
        name,
        description || "",
        category,
        parseInt(time_minutes, 10) || 30,
        parseInt(prep_time_minutes, 10) || 15,
        parseInt(servings, 10) || 2,
        difficulty || "Medium",
        Array.isArray(dietary_tags) ? dietary_tags : [],
        parseInt(calories, 10) || 420,
        parseInt(protein_g, 10) || 18,
        parseInt(carbs_g, 10) || 45,
        parseInt(fat_g, 10) || 14,
        image || "",
        Array.isArray(ingredients) ? ingredients : [],
        Array.isArray(instructions) ? instructions : [],
        video_url || null,
        id,
      ]
    );

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

// DELETE soft-delete recipe
const deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT id, user_id, is_deleted FROM recipes WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0 || existing.rows[0].is_deleted) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    const recipe = existing.rows[0];

    // Authorization: only author or admin can delete
    const isOwner = req.user && recipe.user_id && req.user.id === recipe.user_id;
    const isAdmin = req.user && req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own recipes.",
      });
    }

    await pool.query(
      `UPDATE recipes
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_deleted = false
       RETURNING id`,
      [id]
    );

    res.json({ success: true, message: "Recipe moved to Trash" });
  } catch (error) {
    console.error("Delete error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete recipe" });
  }
};

// ==========================================
// REVIEWS & RATINGS CONTROLLERS (Features 11 & 12)
// ==========================================

// GET /api/recipes/:id/reviews
const getRecipeReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, u.name as user_name
       FROM recipe_reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.recipe_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    // Calculate average rating
    const avgRes = await pool.query(
      `SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as review_count
       FROM recipe_reviews WHERE recipe_id = $1`,
      [id]
    );

    res.json({
      success: true,
      reviews: result.rows,
      averageRating: parseFloat(avgRes.rows[0].avg_rating) || 0,
      reviewCount: parseInt(avgRes.rows[0].review_count, 10) || 0,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

// POST /api/recipes/:id/reviews
const addRecipeReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    const numRating = parseInt(rating, 10);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5" });
    }

    // Get user details
    const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [userId]);
    const userName = userRes.rows[0]?.name || "Verified Chef";

    // Insert review
    const insertRes = await pool.query(
      `INSERT INTO recipe_reviews (recipe_id, user_id, user_name, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, userName, numRating, comment || ""]
    );

    // Recalculate recipe average rating
    const avgRes = await pool.query(
      `SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating FROM recipe_reviews WHERE recipe_id = $1`,
      [id]
    );
    const newAvg = parseFloat(avgRes.rows[0].avg_rating) || numRating;

    await pool.query("UPDATE recipes SET rating = $1 WHERE id = $2", [newAvg, id]);

    // Send notification to recipe author if distinct
    const recipeAuthorRes = await pool.query("SELECT user_id, name FROM recipes WHERE id = $1", [id]);
    const recipeAuthorId = recipeAuthorRes.rows[0]?.user_id;
    const recipeName = recipeAuthorRes.rows[0]?.name || "recipe";

    if (recipeAuthorId && recipeAuthorId !== userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'New Review Received', $2, 'review', $3)`,
        [
          recipeAuthorId,
          `${userName} gave ${numRating} stars to your recipe "${recipeName}": "${(comment || '').slice(0, 45)}"`,
          `/#recipe-${id}`,
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      review: insertRes.rows[0],
      newAverageRating: newAvg,
    });
  } catch (error) {
    console.error("Add review error:", error);
    res.status(500).json({ success: false, message: "Failed to add review" });
  }
};

// DELETE /api/recipes/reviews/:reviewId
const deleteRecipeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const reviewRes = await pool.query("SELECT * FROM recipe_reviews WHERE id = $1", [reviewId]);
    if (reviewRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const review = reviewRes.rows[0];
    if (!isAdmin && review.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You can only delete your own reviews" });
    }

    await pool.query("DELETE FROM recipe_reviews WHERE id = $1", [reviewId]);

    // Recalculate average rating
    const avgRes = await pool.query(
      `SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating FROM recipe_reviews WHERE recipe_id = $1`,
      [review.recipe_id]
    );
    const newAvg = parseFloat(avgRes.rows[0]?.avg_rating) || 0;
    await pool.query("UPDATE recipes SET rating = $1 WHERE id = $2", [newAvg, review.recipe_id]);

    res.json({ success: true, message: "Review deleted successfully", newAverageRating: newAvg });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ success: false, message: "Failed to delete review" });
  }
};

module.exports = {
  getRecipes,
  getRecommendations,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeReviews,
  addRecipeReview,
  deleteRecipeReview,
};
