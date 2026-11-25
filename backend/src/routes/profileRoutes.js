const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  getProfile,
  updateProfile,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/profileController");

// Profile Management (Feature 18)
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);

// Notifications Center (Feature 19)
router.get("/notifications", authenticate, getNotifications);
router.put("/notifications/:id/read", authenticate, markNotificationRead);
router.put("/notifications/read-all", authenticate, markAllNotificationsRead);

module.exports = router;
