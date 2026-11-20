const express = require("express");
const router = express.Router();

const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// Protected admin route
router.get("/", authenticate, requireAdmin, (req, res) => {
    res.json({
        success: true,
        message: "Welcome to the Crave Admin Dashboard",
        admin: req.user,
    });
});

module.exports = router;