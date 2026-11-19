const pool = require("./config/db");

const recipes = [
    {
        name: "Creamy Tuscan Pasta",
        description: "Creamy pasta with spinach, parmesan and sun-dried tomatoes.",
        category: "Italian",
        time_minutes: 25,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800",
        ingredients: ["200g pasta", "1 cup cream", "1 cup spinach", "Parmesan cheese", "3 garlic cloves", "Sun-dried tomatoes", "Salt", "Pepper"],
        instructions: ["Boil pasta in salted water.", "Saute garlic and sun-dried tomatoes.", "Add spinach and cook until wilted.", "Add cream, parmesan, salt and pepper.", "Mix pasta into the sauce.", "Serve warm."]
    },
    {
        name: "Avocado Toast",
        description: "Crispy toast topped with creamy avocado, herbs and fresh seasoning.",
        category: "Breakfast",
        time_minutes: 10,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800",
        ingredients: ["2 slices sourdough bread", "1 ripe avocado", "1 tsp lemon juice", "Chilli flakes", "Salt", "Black pepper", "Olive oil"],
        instructions: ["Toast bread until golden.", "Mash avocado with lemon juice, salt and pepper.", "Spread avocado over toast.", "Add chilli flakes and olive oil.", "Serve fresh."]
    },
    {
        name: "Classic Margherita Pizza",
        description: "Classic pizza with tomato sauce, mozzarella and fresh basil.",
        category: "Italian",
        time_minutes: 35,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1579751626657-72bc17010498?w=800",
        ingredients: ["1 pizza dough", "1/2 cup tomato sauce", "150g mozzarella", "Fresh basil leaves", "Olive oil", "Salt"],
        instructions: ["Preheat oven to 220°C.", "Roll pizza dough.", "Spread tomato sauce.", "Add mozzarella and basil.", "Bake for 12–15 minutes.", "Drizzle olive oil and serve."]
    },
    {
        name: "Berry Pancakes",
        description: "Fluffy pancakes topped with fresh berries and maple syrup.",
        category: "Dessert",
        time_minutes: 20,
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800",
        ingredients: ["1 cup flour", "1 tbsp sugar", "1 tsp baking powder", "1 egg", "3/4 cup milk", "Fresh strawberries", "Blueberries", "Maple syrup"],
        instructions: ["Mix flour, sugar and baking powder.", "Whisk egg and milk separately.", "Combine wet and dry ingredients.", "Pour batter into a heated pan.", "Flip when bubbles appear.", "Serve with berries and maple syrup."]
    },
    {
        name: "Fresh Buddha Bowl",
        description: "A colourful bowl of fresh vegetables, grains and wholesome ingredients.",
        category: "Healthy",
        time_minutes: 20,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
        ingredients: ["1 cup cooked quinoa", "1/2 avocado", "1 cup chickpeas", "Cucumber", "Cherry tomatoes", "Carrots", "Lettuce", "Olive oil", "Lemon juice"],
        instructions: ["Cook quinoa.", "Wash and chop vegetables.", "Season chickpeas.", "Arrange quinoa, vegetables and chickpeas in a bowl.", "Add avocado.", "Drizzle olive oil and lemon juice."]
    },
    {
        name: "Chocolate Brownie",
        description: "Rich, fudgy chocolate brownies with a soft centre.",
        category: "Dessert",
        time_minutes: 40,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800",
        ingredients: ["100g dark chocolate", "100g butter", "3/4 cup sugar", "2 eggs", "1/2 cup flour", "2 tbsp cocoa powder", "1 tsp vanilla extract"],
        instructions: ["Preheat oven to 180°C.", "Melt chocolate and butter.", "Whisk sugar, eggs and vanilla.", "Mix melted chocolate into the egg mixture.", "Fold in flour and cocoa.", "Pour into a baking pan.", "Bake for 20–25 minutes and cool before slicing."]
    }
];

async function seedRecipes() {
    try {
        for (const recipe of recipes) {
            const exists = await pool.query(
                "SELECT id FROM recipes WHERE name = $1",
                [recipe.name]
            );

            if (exists.rows.length === 0) {
                await pool.query(
                    `INSERT INTO recipes
          (name, description, category, time_minutes, rating, image, ingredients, instructions)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        recipe.name,
                        recipe.description,
                        recipe.category,
                        recipe.time_minutes,
                        recipe.rating,
                        recipe.image,
                        recipe.ingredients,
                        recipe.instructions
                    ]
                );

                console.log(`Added: ${recipe.name}`);
            } else {
                console.log(`Already exists: ${recipe.name}`);
            }
        }

        console.log("Recipe seeding completed!");
    } catch (error) {
        console.error("Error seeding recipes:", error);
    } finally {
        await pool.end();
    }
}

seedRecipes();