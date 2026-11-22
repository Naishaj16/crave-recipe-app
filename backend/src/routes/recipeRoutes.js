const express = require("express");
const router = express.Router();

const {
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} = require("../controllers/recipeController");

const { authenticate } = require("../middleware/authMiddleware");

// Public route – anyone can view recipes
router.get("/", getRecipes);

// Protected routes – login required
router.post("/", authenticate, createRecipe);
router.put("/:id", authenticate, updateRecipe);
router.delete("/:id", authenticate, deleteRecipe);

module.exports = router;
