
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
import type { Recipe } from "./services/recipeService";
import AuthModal from "./components/AuthModal";
import AdminPortal from "./components/AdminPortal";
import RecipeEditModal from "./components/RecipeEditModal";
import VideoPlayer from "./components/VideoPlayer";
import { uploadMediaFile } from "./utils/mediaUtils";
import { useAuth } from "./context/AuthContext";

const DEFAULT_RECIPE_IMAGE = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800";
const initialRecipes: Recipe[] = [];

function App() {
  const { user, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const onPop = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState(null, "", path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#admin" && user?.role === "admin") {
        navigate("/admin/dashboard");
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [user]);
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
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [addImageStatus, setAddImageStatus] = useState("");
  const [addVideoStatus, setAddVideoStatus] = useState("");
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

  const handleAddPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAddImageStatus("Compressing photo...");
      const url = await uploadMediaFile(file, (msg) => setAddImageStatus(msg));
      setNewRecipe((prev) => ({ ...prev, image: url }));
      setAddImageStatus("Photo uploaded successfully!");
      setTimeout(() => setAddImageStatus(""), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload photo");
      setAddImageStatus("");
    }
  };

  const handleAddVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAddVideoStatus("Uploading video from gallery...");
      const url = await uploadMediaFile(file, (msg) => setAddVideoStatus(msg));
      setNewRecipe((prev) => ({ ...prev, videoUrl: url }));
      setAddVideoStatus("Video uploaded successfully!");
      setTimeout(() => setAddVideoStatus(""), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload video");
      setAddVideoStatus("");
    }
  };
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

  const categories = [
    "All",
    "Italian",
    "Healthy",
    "Breakfast",
    "Dessert",
    "Main Course",
    "Quick Meals",
  ];

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
    if (!user) {
      alert("Please sign in to save your favorite recipes.");
      setShowAuth(true);
      return;
    }

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
    if (!user) {
      alert("Please sign in to manage recipes.");
      setShowAuth(true);
      return;
    }

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
    if (!user) {
      alert("Please sign in to your kitchen account to create a recipe.");
      setShowAuth(true);
      return;
    }

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
    } catch (error: any) {
      console.error("Create recipe error:", error);
      if (
        error?.message?.toLowerCase().includes("token") ||
        error?.message?.toLowerCase().includes("logged in") ||
        error?.message?.includes("401")
      ) {
        alert("Please sign in to save your recipe.");
        setShowAuth(true);
      } else {
        alert(error?.message || "Failed to save recipe. Please check your connection.");
      }
    }
  };

  const activeRecipe = recipes.find(
    (recipe) => recipe.id === selectedRecipe
  );

  if (currentPath.startsWith("/admin")) {
    return (
      <AdminPortal
        onBackToApp={() => navigate("/")}
        onRecipeUpdated={() => {
          getRecipes().then((data) => setRecipes(data || []));
        }}
      />
    );
  }

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
              <span>Fresh ingredients</span>
              <span>Easy recipes</span>
              <span>Quick meals</span>
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
              onClick={() => {
                if (!user) {
                  alert("Please sign in to your kitchen account to add recipes.");
                  setShowAuth(true);
                  return;
                }
                setShowAddForm(true);
              }}
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
                  <img
                    src={recipe.image?.trim() ? recipe.image : DEFAULT_RECIPE_IMAGE}
                    alt={recipe.name}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== DEFAULT_RECIPE_IMAGE) {
                        target.src = DEFAULT_RECIPE_IMAGE;
                      }
                    }}
                  />
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

                  <div className="card-actions-row">
                    <button
                      className="view-recipe"
                      onClick={() => setSelectedRecipe(recipe.id)}
                    >
                      View recipe <span>↗</span>
                    </button>
                    <button
                      className="card-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) {
                          alert("Please sign in to edit recipes.");
                          setShowAuth(true);
                          return;
                        }
                        setEditingRecipe(recipe);
                      }}
                      title="Edit this recipe"
                    >
                      ✎ Edit
                    </button>
                  </div>
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

            <img
              src={activeRecipe.image?.trim() ? activeRecipe.image : DEFAULT_RECIPE_IMAGE}
              alt={activeRecipe.name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== DEFAULT_RECIPE_IMAGE) {
                  target.src = DEFAULT_RECIPE_IMAGE;
                }
              }}
            />

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
                  <VideoPlayer url={activeRecipe.videoUrl} title={activeRecipe.name} />
                </div>
              )}

              <div className="modal-actions-container">
                <button
                  className="modal-favorite"
                  onClick={() => toggleFavorite(activeRecipe.id)}
                >
                  {favorites.includes(activeRecipe.id)
                    ? "♥ Remove from favorites"
                    : "♡ Add to favorites"}
                </button>

                <button
                  className="modal-edit-action"
                  onClick={() => {
                    if (!user) {
                      alert("Please sign in to edit recipes.");
                      setShowAuth(true);
                      return;
                    }
                    setEditingRecipe(activeRecipe);
                  }}
                >
                  ✎ Edit Recipe
                </button>
              </div>
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

              <div className="add-row">
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
                  <option>Main Course</option>
                  <option>Quick Meals</option>
                </select>

                <input
                  placeholder="Cooking time (e.g. 30 min)"
                  value={newRecipe.time}
                  onChange={(e) =>
                    setNewRecipe({ ...newRecipe, time: e.target.value })
                  }
                />
              </div>

              {/* Photo Upload & URL */}
              <div className="add-media-block">
                <div className="media-section-header">
                  <label>Recipe Photo</label>
                  {addImageStatus && (
                    <span className="upload-status-hint">{addImageStatus}</span>
                  )}
                </div>
                <div className="media-input-dual">
                  <div className="file-upload-box">
                    <label htmlFor="add-photo-file" className="file-upload-button">
                      📁 Choose Photo from Gallery
                    </label>
                    <input
                      id="add-photo-file"
                      type="file"
                      accept="image/*"
                      onChange={handleAddPhotoUpload}
                      style={{ display: "none" }}
                    />
                    <span className="upload-subtext">Auto-compressed</span>
                  </div>
                  <div className="url-input-box">
                    <span className="url-label">or paste URL:</span>
                    <input
                      placeholder="Image URL"
                      value={newRecipe.image}
                      onChange={(e) =>
                        setNewRecipe({ ...newRecipe, image: e.target.value })
                      }
                    />
                  </div>
                </div>
                {newRecipe.image && (
                  <div className="media-preview-bar">
                    <img
                      src={newRecipe.image}
                      alt="Preview"
                      className="media-mini-thumb"
                    />
                    <span className="media-preview-text">Photo attached</span>
                    <button
                      type="button"
                      className="media-clear-btn"
                      onClick={() => setNewRecipe({ ...newRecipe, image: "" })}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Video Upload & URL */}
              <div className="add-media-block">
                <div className="media-section-header">
                  <label>Video Tutorial</label>
                  {addVideoStatus && (
                    <span className="upload-status-hint">{addVideoStatus}</span>
                  )}
                </div>
                <div className="media-input-dual">
                  <div className="file-upload-box">
                    <label htmlFor="add-video-file" className="file-upload-button">
                      📁 Upload Video from Gallery
                    </label>
                    <input
                      id="add-video-file"
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                      onChange={handleAddVideoUpload}
                      style={{ display: "none" }}
                    />
                    <span className="upload-subtext">MP4, MOV, WebM</span>
                  </div>
                  <div className="url-input-box">
                    <span className="url-label">or paste link:</span>
                    <input
                      placeholder="YouTube, Shorts, Instagram Reel, TikTok, MP4"
                      value={newRecipe.videoUrl}
                      onChange={(e) =>
                        setNewRecipe({ ...newRecipe, videoUrl: e.target.value })
                      }
                    />
                  </div>
                </div>
                {newRecipe.videoUrl && (
                  <div className="video-preview-wrapper">
                    <div className="video-preview-header">
                      <span>Live Video Preview</span>
                      <button
                        type="button"
                        className="media-clear-btn"
                        onClick={() => setNewRecipe({ ...newRecipe, videoUrl: "" })}
                      >
                        Remove Video
                      </button>
                    </div>
                    <VideoPlayer url={newRecipe.videoUrl} title={newRecipe.name} />
                  </div>
                )}
              </div>

              <textarea
                placeholder="Ingredients (separate each with a comma or new line)"
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

      {editingRecipe && (
        <RecipeEditModal
          recipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSave={(updated) => {
            setRecipes((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            setSelectedRecipe(updated.id);
          }}
        />
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
