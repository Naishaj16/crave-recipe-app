const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const recipeRoutes = require("./routes/recipeRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: "http://localhost:5173"
}));
app.use(express.json());

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

// Start server
app.listen(PORT, () => {
  console.log(`Crave server running on http://localhost:${PORT}`);
});
