const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  logout,
  googleAuth,
  forgotPassword,
  resetPassword,
  verify2FA,
  resend2FA,
  toggle2FA,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/google", googleAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Two-Factor Authentication (2FA) Routes
router.post("/verify-2fa", verify2FA);
router.post("/resend-2fa", resend2FA);
router.post("/toggle-2fa", authenticate, toggle2FA);

module.exports = router;
