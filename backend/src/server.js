const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const adminRoutes = require("./routes/adminRoutes");
const pool = require("./config/db");
const recipeRoutes = require("./routes/recipeRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
  ],
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded static media files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Test routes
app.get("/", (req, res) => {
  res.send("Welcome to Crave API!");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Crave API is running!"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "PostgreSQL connected successfully!",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Routes
app.use("/api/recipes", recipeRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);

// Global JSON error handling middleware (handles Multer errors, file validation, etc.)
app.use((err, req, res, next) => {
  console.error("API error:", err.message);
  res.status(err.status || 400).json({
    success: false,
    message: err.message || "An unexpected error occurred",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Crave server running on http://localhost:${PORT}`);
});
