const express = require("express");
const router = express.Router();

const { authenticate, requireAdmin } = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

// All admin routes strictly require JWT authentication + admin role
router.use(authenticate, requireAdmin);

// Overview Stats
router.get("/stats", adminController.getStats);

// User Management
router.get("/users", adminController.getUsers);
router.put("/users/:id/role", adminController.updateUserRole);
router.put("/users/:id/status", adminController.updateUserStatus);
router.delete("/users/:id", adminController.deleteUser);

// Activity & Session Tracking
router.get("/activity", adminController.getActivityLogs);

// Recipe Management
router.get("/recipes", adminController.getAllRecipes);
router.put("/recipes/:id/soft-delete", adminController.softDeleteRecipe);
router.put("/recipes/:id/restore", adminController.restoreRecipe);
router.delete("/recipes/:id/permanent", adminController.permanentDeleteRecipe);

module.exports = router;
