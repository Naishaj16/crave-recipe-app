const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  getMealPlans,
  addMealPlan,
  deleteMealPlan,
  getShoppingList,
  addShoppingItem,
  addFromRecipe,
  toggleShoppingItem,
  deleteShoppingItem,
  clearShoppingList,
} = require("../controllers/plannerController");

// Meal Planner Endpoints (Feature 14)
router.get("/meal-plan", authenticate, getMealPlans);
router.post("/meal-plan", authenticate, addMealPlan);
router.delete("/meal-plan/:id", authenticate, deleteMealPlan);

// Shopping List Endpoints (Feature 15)
router.get("/shopping-list", authenticate, getShoppingList);
router.post("/shopping-list", authenticate, addShoppingItem);
router.post("/shopping-list/from-recipe", authenticate, addFromRecipe);
router.put("/shopping-list/:id/toggle", authenticate, toggleShoppingItem);
router.delete("/shopping-list/:id", authenticate, deleteShoppingItem);
router.delete("/shopping-list", authenticate, clearShoppingList);

module.exports = router;
