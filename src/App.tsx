
import { useEffect, useState } from "react";
import "./App.css";
import {
  getRecipes,
  createRecipe,
  deleteRecipe as deleteRecipeAPI,
  getFavorites,
  addFavorite,
  removeFavorite,
} from "./services/recipeService";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./context/AuthContext";

const initialRecipes: Recipe[] = [];
type Recipe = {
  id: number;
  name: string;
  category: string;
  time: string;
  rating?: string;
  image: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  videoUrl?: string;
  isDeleted?: boolean;
};

function App() {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(() => {
    return localStorage.getItem("crave-view") === "favorites";
  });
  useEffect(() => {
    localStorage.setItem(
      "crave-view",
      showFavoritesOnly ? "favorites" : "all"
    );
  }, [showFavoritesOnly]);
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null);

  useEffect(() => {
    getFavorites()
      .then((data) => setFavorites(data))
      .catch((error) => {
        console.error("Failed to load favorites:", error);
      });
  }, []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    description: "",
    category: "Healthy",
    time: "",
    image: "",
    ingredients: "",
    instructions: "",
    videoUrl: "",
  });
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  useEffect(() => {
    getRecipes()
      .then((data) => {
        setRecipes(data || []);

      })
      .catch((error) => {
        console.error("Failed to load recipes:", error);
        alert("Unable to load recipes. Check if your backend is running.");
      })
      .finally(() => setLoadingRecipes(false));
  }, []);

  const categories = ["All", "Italian", "Breakfast", "Healthy", "Dessert"];

  const filteredRecipes = recipes.filter((recipe) => {
    if (recipe.isDeleted) return false;

    const matchesSearch =
      recipe.name.toLowerCase().includes(search.toLowerCase()) ||
      recipe.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || recipe.category === category;

    const matchesFavorites =
      !showFavoritesOnly || favorites.includes(recipe.id);

    return matchesSearch && matchesCategory && matchesFavorites;
  });

  const toggleFavorite = async (id: number) => {
    const isFavorite = favorites.includes(id);

    try {
      if (isFavorite) {
        await removeFavorite(id);
        setFavorites((previous) => previous.filter((item) => item !== id));
      } else {
        await addFavorite(id);
        setFavorites((previous) => [...previous, id]);
      }
    } catch (error) {
      console.error("Favorite update failed:", error);
      alert("Could not update favorite. Please try again.");
    }
  };
  const deleteRecipe = async (id: number) => {
    const confirmed = window.confirm("Move this recipe to Trash?");
    if (!confirmed) return;

    try {
      await deleteRecipeAPI(id);
      await removeFavorite(id);

      setRecipes((previous) =>
        previous.map((recipe) =>
          recipe.id === id ? { ...recipe, isDeleted: true } : recipe
        )
      );

      setFavorites((previous) => previous.filter((item) => item !== id));

      if (selectedRecipe === id) {
        setSelectedRecipe(null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Could not delete recipe. Please try again.");
    }
  };

  const handleCreateRecipe = async () => {
    if (!newRecipe.name.trim()) {
      alert("Please enter a recipe name.");
      return;
    }

    const recipeToAdd = {
      name: newRecipe.name,
      description: newRecipe.description,
      category: newRecipe.category,
      time: newRecipe.time || "30 min",
      image: newRecipe.image || "",
      ingredients: newRecipe.ingredients
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      instructions: newRecipe.instructions
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      videoUrl: newRecipe.videoUrl || "",
      isDeleted: false,
    };

    try {
      const savedRecipe = await createRecipe(recipeToAdd);

      setRecipes((previous) => [savedRecipe, ...previous]);
      setShowAddForm(false);

      setNewRecipe({
        name: "",
        description: "",
        category: "Healthy",
        time: "",
        image: "",
        ingredients: "",
        instructions: "",
        videoUrl: "",
      });

      alert("Recipe saved successfully!");
    } catch (error) {
      console.error("Create recipe error:", error);
      alert("Failed to save recipe. Check your backend.");
    }
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
          <a
            href="#home"
            className={!showFavoritesOnly ? "active" : ""}
            onClick={() => setShowFavoritesOnly(false)}
          >
            Home
          </a>
          <a
            href="#recipes"
            className={!showFavoritesOnly ? "active" : ""}
            onClick={() => setShowFavoritesOnly(false)}
          >
            Explore
          </a>
          <a
            href="#recipes"
            className={showFavoritesOnly ? "active" : ""}
            onClick={() => setShowFavoritesOnly(true)}
          >
            Favorites
          </a>
        </div>

        <div className="nav-right">
          {user ? (
            <>
              <span className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </span>

              <span className="user-name">{user.name}</span>

              <button className="auth-nav-btn" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <button
              className="auth-nav-btn"
              onClick={() => setShowAuth(true)}
            >
              Login / Sign Up
            </button>
          )}
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

          <div className="recipe-filter-buttons">
            <button
              className={!showFavoritesOnly ? "active" : ""}
              onClick={() => setShowFavoritesOnly(false)}
            >
              All Recipes
            </button>

            <button
              className={showFavoritesOnly ? "active" : ""}
              onClick={() => setShowFavoritesOnly(true)}
            >
              ❤️ Favorites
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
                    className="delete-recipe-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRecipe(recipe.id);
                    }}
                    title="Delete recipe"
                  >
                    ×
                  </button>
                  <button
                    className={`favorite-btn ${favorites.includes(recipe.id) ? "liked" : ""
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(recipe.id);
                    }}
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
                    <span>{recipe.rating && Number(recipe.rating) > 0 ? `★ ${recipe.rating}` : "★ —"}</span>
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

          {loadingRecipes && (
            <div className="empty-state">
              <p>Loading recipes...</p>
            </div>
          )}

          {filteredRecipes.length === 0 && !loadingRecipes && (
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
                <span>{activeRecipe.rating && Number(activeRecipe.rating) > 0 ? `★ ${activeRecipe.rating}` : "★ —"}</span>
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

              {activeRecipe.videoUrl && (
                <div className="modal-video-section">
                  <h3>Video Tutorial</h3>
                  {activeRecipe.videoUrl.includes("youtube.com") || activeRecipe.videoUrl.includes("youtu.be") ? (
                    <iframe
                      className="recipe-video-frame"
                      src={
                        activeRecipe.videoUrl.includes("watch?v=")
                          ? activeRecipe.videoUrl.replace("watch?v=", "embed/").split("&")[0]
                          : activeRecipe.videoUrl.replace("youtu.be/", "www.youtube.com/embed/").split("?")[0]
                      }
                      title="Recipe Video Tutorial"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      className="recipe-video-player"
                      src={activeRecipe.videoUrl}
                      controls
                    />
                  )}
                </div>
              )}

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

              <input
                placeholder="Video URL (optional, YouTube or MP4)"
                value={newRecipe.videoUrl}
                onChange={(e) =>
                  setNewRecipe({ ...newRecipe, videoUrl: e.target.value })
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
                onClick={handleCreateRecipe}
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

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default App;
