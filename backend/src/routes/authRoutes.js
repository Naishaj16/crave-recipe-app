const express = require("express");
const router = express.Router();

const { signup, login, logout } = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", authenticate, logout);

module.exports = router;
