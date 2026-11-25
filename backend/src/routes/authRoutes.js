const express = require("express");
const router = express.Router();

const { signup, login, logout, googleAuth, forgotPassword, resetPassword } = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/google", googleAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
