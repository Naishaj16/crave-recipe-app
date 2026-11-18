
import { useEffect, useState } from "react";
import "./App.css";


const initialRecipes = [
  {
    id: 1,
    name: "Creamy Tuscan Pasta",
    category: "Italian",
    time: "25 min",
    rating: "4.9",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800",
    description: "Creamy pasta with spinach, parmesan and sun-dried tomatoes.",
    ingredients: ["200g pasta", "1 cup cream", "1 cup spinach", "Parmesan cheese", "3 garlic cloves", "Sun-dried tomatoes", "Salt", "Pepper"],
    instructions: [
      "Boil the pasta in salted water until cooked.",
      "Heat a pan and saute garlic with sun-dried tomatoes.",
      "Add spinach and cook until wilted.",
      "Pour in cream and add parmesan, salt and pepper.",
      "Mix the cooked pasta into the sauce.",
      "Serve warm with extra parmesan."
    ],
  },
  {
    id: 2,
    name: "Avocado Toast",
    category: "Breakfast",
    time: "10 min",
    rating: "4.8",
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800",
    description: "Crispy toast topped with creamy avocado, herbs and fresh seasoning.",
    ingredients: ["2 slices sourdough bread", "1 ripe avocado", "1 tsp lemon juice", "Chilli flakes", "Salt", "Black pepper", "Olive oil"],
    instructions: [
      "Toast the bread slices until golden and crispy.",
      "Mash the avocado with lemon juice, salt and pepper.",
      "Spread the avocado mixture generously over the toast.",
      "Sprinkle chilli flakes and drizzle olive oil.",
      "Serve fresh."
    ],
  },
  {
    id: 3,
    name: "Classic Margherita Pizza",
    category: "Italian",
    time: "35 min",
    rating: "4.9",
    image: "https://images.unsplash.com/photo-1579751626657-72bc17010498?w=800",
    description: "Classic pizza with tomato sauce, mozzarella and fresh basil.",
    ingredients: ["1 pizza dough", "1/2 cup tomato sauce", "150g mozzarella", "Fresh basil leaves", "Olive oil", "Salt"],
    instructions: [
      "Preheat your oven to 220°C.",
      "Roll the pizza dough into a round shape.",
      "Spread tomato sauce evenly over the dough.",
      "Add mozzarella cheese and basil leaves.",
      "Bake for 12–15 minutes until the crust is golden.",
      "Drizzle olive oil and serve."
    ],
  },
  {
    id: 4,
    name: "Berry Pancakes",
    category: "Dessert",
    time: "20 min",
    rating: "4.7",
    image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800",
    description: "Fluffy pancakes topped with fresh berries and maple syrup.",
    ingredients: ["1 cup flour", "1 tbsp sugar", "1 tsp baking powder", "1 egg", "3/4 cup milk", "Fresh strawberries", "Blueberries", "Maple syrup"],
    instructions: [
      "Mix flour, sugar and baking powder in a bowl.",
      "Whisk egg and milk in a separate bowl.",
      "Combine the wet and dry ingredients.",
      "Heat a pan and pour a small amount of batter.",
      "Flip when bubbles appear and cook the other side.",
      "Serve with berries and maple syrup."
    ],
  },
  {
    id: 5,
    name: "Fresh Buddha Bowl",
    category: "Healthy",
    time: "20 min",
    rating: "4.8",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    description: "A colourful bowl of fresh vegetables, grains and wholesome ingredients.",
    ingredients: ["1 cup cooked quinoa", "1/2 avocado", "1 cup chickpeas", "Cucumber", "Cherry tomatoes", "Carrots", "Lettuce", "Olive oil", "Lemon juice"],
    instructions: [
      "Cook quinoa according to package instructions.",
      "Wash and chop all vegetables.",
      "Prepare chickpeas and season with salt and pepper.",
      "Arrange quinoa, vegetables and chickpeas in a bowl.",
      "Add sliced avocado.",
      "Drizzle olive oil and lemon juice before serving."
    ],
  },
  {
    id: 6,
    name: "Chocolate Brownie",
    category: "Dessert",
    time: "40 min",
    rating: "4.9",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800",
    description: "Rich, fudgy chocolate brownies with a soft centre.",
    ingredients: ["100g dark chocolate", "100g butter", "3/4 cup sugar", "2 eggs", "1/2 cup flour", "2 tbsp cocoa powder", "1 tsp vanilla extract"],
    instructions: [
      "Preheat the oven to 180°C.",
      "Melt dark chocolate and butter together.",
      "Whisk sugar, eggs and vanilla.",
      "Mix the melted chocolate into the egg mixture.",
      "Fold in flour and cocoa powder.",
      "Pour into a lined baking pan.",
      "Bake for 20–25 minutes and allow to cool before slicing."
    ],
  },
];

type Recipe = {
  id: number;
  name: string;
  category: string;
  time: string;
  rating: string;
  image: string;
  description: string;
  ingredients: string[];
  instructions: string[];
};

function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<number[]>(() => {
    const savedFavorites = localStorage.getItem("crave-favorites");
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  });
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null);
  useEffect(() => {
    localStorage.setItem("crave-favorites", JSON.stringify(favorites));
  }, [favorites]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    description: "",
    category: "Healthy",
    time: "",
    image: "",
    ingredients: "",
    instructions: "",
  });
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem("crave-recipes");
    return saved ? JSON.parse(saved) : initialRecipes;
  });
  useEffect(() => {
    localStorage.setItem("crave-recipes", JSON.stringify(recipes));
  }, [recipes]);

  const categories = ["All", "Italian", "Breakfast", "Healthy", "Dessert"];

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.name.toLowerCase().includes(search.toLowerCase()) ||
      recipe.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || recipe.category === category;

    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: number) => {
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const activeRecipe = recipes.find(
    (recipe) => recipe.id === selectedRecipe
  );

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">✳</span> crave
        </div>

        <div className="nav-links">
          <a href="#home" className="active">Home</a>
          <a href="#recipes">Explore</a>
          <a href="#favorites">Favorites</a>
        </div>

        <div className="nav-right">
          <span className="user-avatar">N</span>
          <span className="user-name">My Kitchen</span>
        </div>
      </nav>

      <main className="main-content" id="home">
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">YOUR DAILY DOSE OF DELICIOUS</span>
            <h1>
              Find your next
              <br />
              <span>favorite meal.</span>
            </h1>
            <p>
              Good food, great mood. Discover recipes that make
              every meal feel special.
            </p>

            <div className="search-box">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Search recipes, cuisines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button onClick={() => document.getElementById("recipes")?.scrollIntoView()}>
                Search
              </button>
            </div>

            <div className="hero-tags">
              <span>✨ Easy recipes</span>
              <span>🥗 Fresh ingredients</span>
              <span>⏱ Quick meals</span>
            </div>
          </div>

          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1000"
              alt="Fresh healthy meal"
            />
            <div className="hero-image-label">
              <span>Today's inspiration</span>
              <strong>Eat well, live well.</strong>
            </div>
          </div>
        </section>

        <section className="recipe-section" id="recipes">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MADE FOR YOUR TASTE</span>
              <h2>Explore recipes</h2>
            </div>
            <button
              className="add-recipe-btn"
              onClick={() => setShowAddForm(true)}
            >
              + Add Recipe
            </button>
          </div>

          <div className="category-list">
            {categories.map((item) => (
              <button
                key={item}
                className={`category-btn ${category === item ? "selected" : ""
                  }`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="recipe-grid">
            {filteredRecipes.map((recipe) => (
              <article className="recipe-card" key={recipe.id}>
                <div className="recipe-image">
                  <img src={recipe.image} alt={recipe.name} />
                  <button
                    className={`favorite-btn ${favorites.includes(recipe.id) ? "liked" : ""
                      }`}
                    onClick={() => toggleFavorite(recipe.id)}
                    aria-label="Toggle favorite"
                  >
                    {favorites.includes(recipe.id) ? "♥" : "♡"}
                  </button>
                  <span className="time-label">
                    ⏱ {recipe.time}
                  </span>
                </div>

                <div className="recipe-info">
                  <div className="recipe-meta">
                    <span>{recipe.category}</span>
                    <span>★ {recipe.rating}</span>
                  </div>

                  <h3>{recipe.name}</h3>
                  <p>{recipe.description}</p>

                  <button
                    className="view-recipe"
                    onClick={() => setSelectedRecipe(recipe.id)}
                  >
                    View recipe <span>↗</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="empty-state">
              <h3>No recipes found!</h3>
              <p>Try searching something else.</p>
            </div>
          )}
        </section>

        <section className="favorites-section" id="favorites">
          <div className="favorites-banner">
            <div>
              <span className="eyebrow">YOUR LITTLE COOKBOOK</span>
              <h2>Saved with love ♥</h2>
              <p>
                {favorites.length} recipes saved to your favorites.
              </p>
            </div>
            <span className="favorites-icon">♡</span>
          </div>
        </section>
      </main>

      {activeRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div
            className="recipe-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              onClick={() => setSelectedRecipe(null)}
            >
              ×
            </button>

            <img src={activeRecipe.image} alt={activeRecipe.name} />

            <div className="modal-content">
              <span className="eyebrow">{activeRecipe.category}</span>
              <h2>{activeRecipe.name}</h2>
              <p>{activeRecipe.description}</p>
              <div className="modal-meta">
                <span>⏱ {activeRecipe.time}</span>
                <span>★ {activeRecipe.rating}</span>
              </div>
              <h3>Ingredients</h3>
              <ul>
                {activeRecipe.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>

              <h3>Instructions</h3>
              <ol>
                {activeRecipe.instructions.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
              <button
                className="modal-favorite"
                onClick={() => toggleFavorite(activeRecipe.id)}
              >
                {favorites.includes(activeRecipe.id)
                  ? "♥ Remove from favorites"
                  : "♡ Add to favorites"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div
            className="recipe-modal add-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              onClick={() => setShowAddForm(false)}
            >
              ×
            </button>

            <div className="modal-content">
              <h2>Add a new recipe</h2>
              <p>Create your own recipe for your kitchen.</p>

              <input
                placeholder="Recipe name"
                value={newRecipe.name}
                onChange={(e) =>
                  setNewRecipe({ ...newRecipe, name: e.target.value })
                }
              />

              <textarea
                placeholder="Description"
                value={newRecipe.description}
                onChange={(e) =>
                  setNewRecipe({ ...newRecipe, description: e.target.value })
                }
              />

              <select
                value={newRecipe.category}
                onChange={(e) =>
                  setNewRecipe({ ...newRecipe, category: e.target.value })
                }
              >
                <option>Healthy</option>
                <option>Italian</option>
                <option>Breakfast</option>
                <option>Dessert</option>
              </select>

              <input
                placeholder="Cooking time (e.g. 30 min)"
                value={newRecipe.time}
                onChange={(e) =>
                  setNewRecipe({ ...newRecipe, time: e.target.value })
                }
              />

              <input
                placeholder="Image URL"
                value={newRecipe.image}
                onChange={(e) =>
                  setNewRecipe({ ...newRecipe, image: e.target.value })
                }
              />

              <textarea
                placeholder="Ingredients (separate each with a comma)"
                value={newRecipe.ingredients}
                onChange={(e) =>
                  setNewRecipe({ ...newRecipe, ingredients: e.target.value })
                }
              />

              <textarea
                placeholder="Instructions (separate each step with a new line)"
                value={newRecipe.instructions}
                onChange={(e) =>
                  setNewRecipe({ ...newRecipe, instructions: e.target.value })
                }
              />

              <button
                className="modal-favorite"
                onClick={() => {
                  if (!newRecipe.name.trim()) {
                    alert("Please enter a recipe name.");
                    return;
                  }

                  const recipeToAdd = {
                    id: Date.now(),
                    name: newRecipe.name,
                    description: newRecipe.description,
                    category: newRecipe.category,
                    time: newRecipe.time || "30 min",
                    rating: "5.0",
                    image:
                      newRecipe.image ||
                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
                    ingredients: newRecipe.ingredients
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                    instructions: newRecipe.instructions
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  };

                  console.log("New recipe captured:", recipeToAdd);
                  setRecipes((previous) => [...previous, recipeToAdd]);
                  setShowAddForm(false);

                  setNewRecipe({
                    name: "",
                    description: "",
                    category: "Healthy",
                    time: "",
                    image: "",
                    ingredients: "",
                    instructions: "",
                  });
                }}
              >
                Create Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>
        <div className="logo">✳ crave</div>
        <p>Made for the love of food.</p>
        <span>© 2026 Crave Recipe Studio</span>
      </footer>
    </div>
  );
}

export default App;
