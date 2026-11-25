const pool = require("../config/db");

async function migrateAllFeatures() {
  console.log("Starting full database schema migration for Crave Recipe App...");

  try {
    // 1. Upgrade 'recipes' table
    await pool.query(`
      ALTER TABLE recipes 
      ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 15,
      ADD COLUMN IF NOT EXISTS servings INTEGER DEFAULT 2,
      ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'Medium',
      ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS calories INTEGER DEFAULT 420,
      ADD COLUMN IF NOT EXISTS protein_g INTEGER DEFAULT 18,
      ADD COLUMN IF NOT EXISTS carbs_g INTEGER DEFAULT 45,
      ADD COLUMN IF NOT EXISTS fat_g INTEGER DEFAULT 14;
    `);
    console.log("Upgraded recipes table with prep_time, servings, difficulty, dietary_tags, and nutrition facts.");

    // 2. Upgrade 'users' table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;
    `);
    console.log("Upgraded users table with dietary_preferences, bio, and reset_token.");

    // 3. Create 'recipe_reviews' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_reviews (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_name VARCHAR(100) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Verified recipe_reviews table.");

    // 4. Create 'meal_plans' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        day_of_week VARCHAR(20) NOT NULL,
        meal_type VARCHAR(20) NOT NULL,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Verified meal_plans table.");

    // 5. Create 'shopping_list' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_list (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_text VARCHAR(255) NOT NULL,
        is_checked BOOLEAN DEFAULT false,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Verified shopping_list table.");

    // 6. Create 'notifications' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        link VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Verified notifications table.");

    // 7. Seed varied metadata for recipes that have defaults
    await pool.query(`
      UPDATE recipes SET 
        difficulty = CASE 
          WHEN time_minutes <= 20 THEN 'Easy'
          WHEN time_minutes <= 40 THEN 'Medium'
          ELSE 'Hard'
        END,
        prep_time_minutes = CASE
          WHEN time_minutes <= 20 THEN 10
          WHEN time_minutes <= 40 THEN 15
          ELSE 25
        END,
        servings = CASE
          WHEN name ILIKE '%salad%' OR name ILIKE '%bowl%' THEN 2
          WHEN name ILIKE '%pasta%' OR name ILIKE '%chicken%' OR name ILIKE '%risotto%' THEN 4
          ELSE 3
        END,
        dietary_tags = CASE
          WHEN category = 'Healthy' THEN ARRAY['Vegetarian', 'Gluten-Free']
          WHEN category = 'Breakfast' THEN ARRAY['Vegetarian']
          WHEN category = 'Dessert' OR category = 'Desserts' THEN ARRAY['Vegetarian']
          WHEN name ILIKE '%vegan%' OR name ILIKE '%tofu%' THEN ARRAY['Vegan', 'Vegetarian', 'Dairy-Free']
          ELSE ARRAY['Nut-Free']
        END,
        calories = CASE
          WHEN category = 'Healthy' THEN 380
          WHEN category = 'Breakfast' THEN 420
          WHEN category = 'Dessert' OR category = 'Desserts' THEN 320
          ELSE 540
        END,
        protein_g = CASE
          WHEN category = 'Healthy' THEN 22
          WHEN category = 'Breakfast' THEN 14
          WHEN category = 'Dessert' OR category = 'Desserts' THEN 6
          ELSE 32
        END,
        carbs_g = CASE
          WHEN category = 'Healthy' THEN 35
          WHEN category = 'Breakfast' THEN 55
          WHEN category = 'Dessert' OR category = 'Desserts' THEN 45
          ELSE 48
        END,
        fat_g = CASE
          WHEN category = 'Healthy' THEN 12
          WHEN category = 'Breakfast' THEN 16
          WHEN category = 'Dessert' OR category = 'Desserts' THEN 14
          ELSE 20
        END
      WHERE difficulty IS NULL OR difficulty = 'Medium';
    `);

    // Ensure common categories (Breakfast, Lunch, Dinner, Snacks, Desserts, Beverages)
    await pool.query(`
      UPDATE recipes SET category = 'Desserts' WHERE category = 'Dessert';
    `);

    console.log("Migration complete and data synchronized successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrateAllFeatures();
