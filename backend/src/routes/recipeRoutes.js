const express = require("express");
const router = express.Router();

const {
  getRecipes,
  getRecommendations,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeReviews,
  addRecipeReview,
  deleteRecipeReview,
} = require("../controllers/recipeController");

const { authenticate, optionalAuthenticate } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getRecipes);
router.get("/recommended", optionalAuthenticate, getRecommendations);
router.get("/:id/reviews", getRecipeReviews);

// Protected routes
router.post("/", authenticate, createRecipe);
router.put("/:id", authenticate, updateRecipe);
router.delete("/:id", authenticate, deleteRecipe);

// Reviews & Ratings (Features 11 & 12)
router.post("/:id/reviews", authenticate, addRecipeReview);
router.delete("/reviews/:reviewId", authenticate, deleteRecipeReview);

module.exports = router;
