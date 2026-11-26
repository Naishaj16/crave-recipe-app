import { useEffect, useState, useCallback } from "react";
import "./App.css";
import {
  getRecipes,
  createRecipe,
  deleteRecipe as deleteRecipeAPI,
  getFavorites,
  addFavorite,
  removeFavorite,
  getRecommendations,
} from "./services/recipeService";
import type { Recipe } from "./services/recipeService";
import type { AppNotification } from "./services/profileService";
import { getNotifications } from "./services/profileService";
import AuthModal from "./components/AuthModal";
import AdminPortal from "./components/AdminPortal";
import RecipeEditModal from "./components/RecipeEditModal";
import RecipeDetailModal from "./components/RecipeDetailModal";
import VideoPlayer from "./components/VideoPlayer";
import LoginDashboard from "./components/LoginDashboard";
import UserDashboard from "./components/UserDashboard";
import MealPlannerModal from "./components/MealPlannerModal";
import ShoppingListModal from "./components/ShoppingListModal";
import UserProfileModal from "./components/UserProfileModal";
import NotificationsDropdown from "./components/NotificationsDropdown";
import { uploadMediaFile } from "./utils/mediaUtils";
import { useAuth } from "./context/AuthContext";

const DEFAULT_RECIPE_IMAGE = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800";

const CATEGORIES = [
  "All",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Desserts",
  "Beverages",
  "Healthy",
];

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"];
const DIETARY_OPTIONS = ["All", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto"];

function App() {
  const { user, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [showAuth, setShowAuth] = useState(false);

  // Theme Management (Feature 21: Light and Dark Themes)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("crave-theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("crave-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // View navigation state with reload persistence
  const [activeView, setActiveView] = useState<"dashboard" | "recipes" | "favorites">(() => {
    const saved = localStorage.getItem("crave-active-view");
    if (saved === "dashboard" || saved === "recipes" || saved === "favorites") {
      return saved;
    }
    return "recipes";
  });

  const changeView = (view: "dashboard" | "recipes" | "favorites") => {
    setActiveView(view);
    localStorage.setItem("crave-active-view", view);
  };

  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return sessionStorage.getItem("crave-guest") === "true";
  });

  const setGuestMode = (guest: boolean) => {
    setIsGuest(guest);
    if (guest) {
      sessionStorage.setItem("crave-guest", "true");
    } else {
      sessionStorage.removeItem("crave-guest");
    }
  };

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

  // Notifications (Feature 19)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getNotifications();
      setNotifications(res.notifications);
      setUnreadNotifCount(res.unreadCount);
    } catch {
      // silently ignore if offline
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshNotifications();
    }
  }, [user, refreshNotifications]);

  // Search & Filtering State (Features 4, 5, 6, 8)
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(() => {
    return localStorage.getItem("crave-category") || "All";
  });

  const changeCategory = (cat: string) => {
    setCategory(cat);
    localStorage.setItem("crave-category", cat);
  };

  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [maxTimeFilter, setMaxTimeFilter] = useState<number | null>(null);
  const [dietaryFilter, setDietaryFilter] = useState("All");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pantry / Ingredient-Based Search (Feature 8)
  const [isPantryMode, setIsPantryMode] = useState(false);
  const [pantryInput, setPantryInput] = useState("");

  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(() => {
    const savedActive = localStorage.getItem("crave-active-view");
    return savedActive === "favorites" || localStorage.getItem("crave-view") === "favorites";
  });

  useEffect(() => {
    localStorage.setItem("crave-view", showFavoritesOnly ? "favorites" : "all");
  }, [showFavoritesOnly]);

  // Recipe selection with URL hash persistence
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#recipe-")) {
      const id = parseInt(hash.replace("#recipe-", ""), 10);
      return isNaN(id) ? null : id;
    }
    return null;
  });

  const handleSelectRecipe = (id: number | null) => {
    setSelectedRecipe(id);
    if (id !== null) {
      window.history.replaceState(null, "", `#recipe-${id}`);
    } else {
      if (window.location.hash.startsWith("#recipe-")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#recipe-")) {
        const id = parseInt(hash.replace("#recipe-", ""), 10);
        if (!isNaN(id)) setSelectedRecipe(id);
      } else if (selectedRecipe !== null) {
        setSelectedRecipe(null);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [selectedRecipe]);

  // Load favorites
  useEffect(() => {
    getFavorites()
      .then((data) => setFavorites(data))
      .catch((error) => console.error("Failed to load favorites:", error));
  }, []);

  // Modal dialog states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // New Recipe State
  const [addImageStatus, setAddImageStatus] = useState("");
  const [addVideoStatus, setAddVideoStatus] = useState("");
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    description: "",
    category: "Healthy",
    time: "30 min",
    prepTimeMinutes: 15,
    servings: 2,
    difficulty: "Medium",
    dietaryTags: [] as string[],
    calories: 420,
    proteinG: 18,
    carbsG: 45,
    fatG: 14,
    image: "",
    ingredients: "",
    instructions: "",
    videoUrl: "",
  });

  const toggleNewRecipeDietary = (tag: string) => {
    setNewRecipe((prev) => ({
      ...prev,
      dietaryTags: prev.dietaryTags.includes(tag)
        ? prev.dietaryTags.filter((t) => t !== tag)
        : [...prev.dietaryTags, tag],
    }));
  };

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

  // Recipes and recommendations state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  const loadAllRecipes = useCallback(() => {
    setLoadingRecipes(true);
    getRecipes()
      .then((data) => setRecipes(data || []))
      .catch((err) => console.error("Failed to load recipes:", err))
      .finally(() => setLoadingRecipes(false));

    getRecommendations()
      .then((data) => setRecommendations(data || []))
      .catch((err) => console.error("Failed to load recommendations:", err));
  }, []);

  useEffect(() => {
    loadAllRecipes();
  }, [loadAllRecipes]);

  // Client-side filtering across search, category, difficulty, time, dietary, and pantry
  const filteredRecipes = recipes.filter((recipe) => {
    if (recipe.isDeleted) return false;

    // Search query matches name, description, category, or any ingredient
    const searchLower = search.trim().toLowerCase();
    const matchesSearch =
      !searchLower ||
      recipe.name.toLowerCase().includes(searchLower) ||
      recipe.category.toLowerCase().includes(searchLower) ||
      (recipe.description && recipe.description.toLowerCase().includes(searchLower)) ||
      recipe.ingredients.some((ing) => ing.toLowerCase().includes(searchLower));

    // Category filter
    const matchesCategory = category === "All" || recipe.category === category;

    // Difficulty filter
    const matchesDifficulty =
      difficultyFilter === "All" ||
      (recipe.difficulty && recipe.difficulty.toLowerCase() === difficultyFilter.toLowerCase());

    // Max cooking time filter
    const matchesTime =
      !maxTimeFilter ||
      (recipe.timeMinutes && recipe.timeMinutes <= maxTimeFilter);

    // Dietary preference tag filter
    const matchesDietary =
      dietaryFilter === "All" ||
      (recipe.dietaryTags && recipe.dietaryTags.some((t) => t.toLowerCase() === dietaryFilter.toLowerCase()));

    // Pantry / Ingredient-Based Search (Feature 8)
    let matchesPantry = true;
    if (isPantryMode && pantryInput.trim()) {
      const pantryItems = pantryInput
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);

      if (pantryItems.length > 0) {
        matchesPantry = pantryItems.some((item) =>
          recipe.ingredients.some((ing) => ing.toLowerCase().includes(item))
        );
      }
    }

    // Favorites filter
    const matchesFavorites = !showFavoritesOnly || favorites.includes(recipe.id);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesDifficulty &&
      matchesTime &&
      matchesDietary &&
      matchesPantry &&
      matchesFavorites
    );
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
        setFavorites((prev) => prev.filter((item) => item !== id));
      } else {
        await addFavorite(id);
        setFavorites((prev) => [...prev, id]);
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

      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isDeleted: true } : r))
      );
      setFavorites((prev) => prev.filter((item) => item !== id));

      if (selectedRecipe === id) {
        handleSelectRecipe(null);
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

    const recipeToAdd: Partial<Recipe> = {
      name: newRecipe.name.trim(),
      description: newRecipe.description.trim(),
      category: newRecipe.category,
      time: newRecipe.time || "30 min",
      prepTimeMinutes: Number(newRecipe.prepTimeMinutes) || 15,
      servings: Number(newRecipe.servings) || 2,
      difficulty: newRecipe.difficulty || "Medium",
      dietaryTags: newRecipe.dietaryTags,
      calories: Number(newRecipe.calories) || 420,
      proteinG: Number(newRecipe.proteinG) || 18,
      carbsG: Number(newRecipe.carbsG) || 45,
      fatG: Number(newRecipe.fatG) || 14,
      image: newRecipe.image || "",
      ingredients: newRecipe.ingredients
        .split(/[\n,]+/)
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
      setRecipes((prev) => [savedRecipe, ...prev]);
      setShowAddForm(false);

      setNewRecipe({
        name: "",
        description: "",
        category: "Healthy",
        time: "30 min",
        prepTimeMinutes: 15,
        servings: 2,
        difficulty: "Medium",
        dietaryTags: [],
        calories: 420,
        proteinG: 18,
        carbsG: 45,
        fatG: 14,
        image: "",
        ingredients: "",
        instructions: "",
        videoUrl: "",
      });

      alert("Recipe created and published successfully!");
    } catch (error: any) {
      console.error("Create recipe error:", error);
      alert(error?.message || "Failed to save recipe. Please check your connection.");
    }
  };

  const activeRecipe = recipes.find((r) => r.id === selectedRecipe);

  const handleLogout = async () => {
    await logout();
    setGuestMode(false);
    localStorage.removeItem("crave-active-view");
    changeView("recipes");
    handleSelectRecipe(null);
  };

  if (currentPath.startsWith("/admin")) {
    return (
      <AdminPortal
        onBackToApp={() => navigate("/")}
        onRecipeUpdated={loadAllRecipes}
      />
    );
  }

  // If unauthenticated and not explicitly in guest preview -> Render Login Dashboard first!
  if (!user && !isGuest) {
    return (
      <LoginDashboard
        onGuestContinue={() => {
          setGuestMode(true);
          changeView("recipes");
        }}
        onAdminNavigate={() => navigate("/admin")}
      />
    );
  }

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div
          className="logo"
          onClick={() => (user ? changeView("dashboard") : changeView("recipes"))}
          style={{ cursor: "pointer" }}
        >
          crave
        </div>

        <div className="nav-links">
          {user && (
            <button
              type="button"
              className={`nav-tab-btn ${activeView === "dashboard" ? "active" : ""}`}
              onClick={() => changeView("dashboard")}
            >
              Dashboard
            </button>
          )}

          <button
            type="button"
            className={`nav-tab-btn ${activeView === "recipes" ? "active" : ""}`}
            onClick={() => {
              changeView("recipes");
              setShowFavoritesOnly(false);
            }}
          >
            Explore Recipes
          </button>

          {user && (
            <>
              <button
                type="button"
                className="nav-tab-btn"
                onClick={() => setShowMealPlanner(true)}
              >
                Meal Planner
              </button>

              <button
                type="button"
                className="nav-tab-btn"
                onClick={() => setShowShoppingList(true)}
              >
                Shopping List
              </button>
            </>
          )}

          <button
            type="button"
            className={`nav-tab-btn ${activeView === "favorites" ? "active" : ""}`}
            onClick={() => {
              changeView("favorites");
              setShowFavoritesOnly(true);
            }}
          >
            Favorites {favorites.length > 0 ? `(${favorites.length})` : ""}
          </button>
        </div>

        <div className="nav-right">
          {/* Light / Dark Theme Toggle (Feature 21) */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme"}
            aria-label="Toggle application theme"
          >
            {theme === "light" ? (
              // Moon Icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              // Sun Icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>

          {/* Notifications Bell (Feature 19) */}
          {user && (
            <div className="notif-bell-container">
              <button
                type="button"
                className="notif-bell-btn"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  refreshNotifications();
                }}
                title="Notifications"
                aria-label="View notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadNotifCount > 0 && (
                  <span className="notif-badge-count">{unreadNotifCount}</span>
                )}
              </button>

              {showNotifications && (
                <NotificationsDropdown
                  notifications={notifications}
                  unreadCount={unreadNotifCount}
                  onClose={() => setShowNotifications(false)}
                  onRefresh={refreshNotifications}
                  onNavigateToRecipe={(id) => handleSelectRecipe(id)}
                />
              )}
            </div>
          )}

          {user ? (
            <>
              {/* Profile Avatar & Name (Feature 18) */}
              <button
                type="button"
                className="link-button"
                onClick={() => setShowUserProfile(true)}
                title="Manage Kitchen Profile"
                style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
              >
                <span className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="user-name">{user.name}</span>
              </button>

              {user.role === "admin" && (
                <button
                  className="auth-nav-btn admin-badge-btn"
                  onClick={() => navigate("/admin/dashboard")}
                  title="Open Admin Console"
                >
                  Admin
                </button>
              )}

              <button className="auth-nav-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <button className="auth-nav-btn" onClick={() => setGuestMode(false)}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="main-content" id="home">
        {/* VIEW 1: AUTHENTICATED USER DASHBOARD (Feature 2) */}
        {activeView === "dashboard" && user && (
          <UserDashboard
            userName={user.name}
            userRole={user.role}
            userId={user.id}
            recipes={recipes}
            favorites={favorites}
            onNavigateToRecipes={() => {
              changeView("recipes");
              setShowFavoritesOnly(false);
            }}
            onNavigateToFavorites={() => {
              changeView("favorites");
              setShowFavoritesOnly(true);
            }}
            onOpenAddRecipe={() => setShowAddForm(true)}
            onSelectRecipe={(id) => handleSelectRecipe(id)}
            onOpenMealPlanner={() => setShowMealPlanner(true)}
            onOpenShoppingList={() => setShowShoppingList(true)}
            onOpenProfile={() => setShowUserProfile(true)}
            onNavigateToAdmin={
              user.role === "admin"
                ? () => navigate("/admin/dashboard")
                : undefined
            }
          />
        )}

        {/* VIEW 2 & 3: EXPLORE RECIPES & FAVORITES VIEWS */}
        {(activeView === "recipes" || activeView === "favorites" || !user) && (
          <>
            {activeView === "recipes" && (
              <section className="hero">
                <div className="hero-content">
                  <span className="eyebrow">YOUR DAILY DOSE OF DELICIOUS</span>
                  <h1>
                    Find your next
                    <br />
                    <span>favorite meal.</span>
                  </h1>
                  <p>
                    Good food, great mood. Discover culinary recipes, check available fridge
                    ingredients, plan meals, and watch tutorial videos.
                  </p>

                  <div className="search-box">
                    <span aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Search recipes, ingredients, cuisines..."
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
            )}

            {activeView === "favorites" && (
              <section className="favorites-section" id="favorites">
                <div className="favorites-banner">
                  <div>
                    <span className="eyebrow">SAVED COLLECTION</span>
                    <h2>Saved Recipes</h2>
                    <p>{favorites.length} recipes saved to your favorites.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Personalized Recommendations Section (Feature 13) */}
            {activeView === "recipes" && recommendations.length > 0 && !search && (
              <section className="recommendations-section">
                <div className="recommendations-header">
                  <span className="eyebrow">CURATED FOR YOU</span>
                  <h3>Recommended Dishes</h3>
                </div>
                <div className="recommendations-grid">
                  {recommendations.slice(0, 4).map((rec) => (
                    <article
                      key={rec.id}
                      className="recent-recipe-card"
                      onClick={() => handleSelectRecipe(rec.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="recent-card-image">
                        <img src={rec.image || DEFAULT_RECIPE_IMAGE} alt={rec.name} />
                        <span className="recent-time-tag">{rec.time}</span>
                      </div>
                      <div className="recent-card-body">
                        <span className="rec-badge-pill">Recommended</span>
                        <h4>{rec.name}</h4>
                        <p>{rec.description}</p>
                        <div className="recent-card-footer">
                          <span className="card-rating">
                            {rec.rating && Number(rec.rating) > 0 ? `Rating: ${rec.rating}` : "Featured"}
                          </span>
                          <span className="view-link">View Recipe ↗</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* RECIPES EXPLORE SECTION */}
            <section className="recipe-section" id="recipes">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    {activeView === "favorites" ? "SAVED COLLECTION" : "MADE FOR YOUR TASTE"}
                  </span>
                  <h2>{activeView === "favorites" ? "Your Favorite Recipes" : "Explore recipes"}</h2>
                </div>
                <button
                  className="add-recipe-btn"
                  onClick={() => {
                    if (!user) {
                      alert("Please sign in to your kitchen account to add recipes.");
                      setIsGuest(false);
                      return;
                    }
                    setShowAddForm(true);
                  }}
                >
                  + Add Recipe
                </button>
              </div>

              {/* Advanced Filter & Pantry Search Bar (Features 5, 6, 8) */}
              <div className="filter-controls-container">
                <div className="filter-toggle-row">
                  <button
                    type="button"
                    className={`pantry-switch-btn ${isPantryMode ? "active" : ""}`}
                    onClick={() => setIsPantryMode(!isPantryMode)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Pantry Ingredient Search
                  </button>

                  <button
                    type="button"
                    className="filter-expand-btn"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    {showAdvancedFilters ? "Hide Advanced Filters ▲" : "Advanced Filters (Time, Difficulty, Diet) ▼"}
                  </button>
                </div>

                {/* Pantry Input Field */}
                {isPantryMode && (
                  <div className="pantry-search-box">
                    <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                      Find recipes using ingredients in your fridge:
                    </label>
                    <div className="pantry-input-row">
                      <input
                        type="text"
                        placeholder="e.g. eggs, tomato, garlic, mozzarella..."
                        value={pantryInput}
                        onChange={(e) => setPantryInput(e.target.value)}
                      />
                      {pantryInput && (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => setPantryInput("")}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Collapsible Advanced Filters */}
                {showAdvancedFilters && (
                  <div className="advanced-filters-grid">
                    <div className="filter-group">
                      <label>Cooking Time</label>
                      <select
                        value={maxTimeFilter || ""}
                        onChange={(e) => setMaxTimeFilter(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Any Duration</option>
                        <option value="15">Under 15 min</option>
                        <option value="30">Under 30 min</option>
                        <option value="60">Under 60 min</option>
                      </select>
                    </div>

                    <div className="filter-group">
                      <label>Difficulty</label>
                      <select
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value)}
                      >
                        {DIFFICULTIES.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label>Dietary Tag</label>
                      <select
                        value={dietaryFilter}
                        onChange={(e) => setDietaryFilter(e.target.value)}
                      >
                        {DIETARY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    {(maxTimeFilter || difficultyFilter !== "All" || dietaryFilter !== "All") && (
                      <button
                        type="button"
                        className="filter-reset-btn"
                        onClick={() => {
                          setMaxTimeFilter(null);
                          setDifficultyFilter("All");
                          setDietaryFilter("All");
                        }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Recipe Filter Buttons */}
              <div className="recipe-filter-buttons">
                <button
                  className={activeView !== "favorites" && !showFavoritesOnly ? "active" : ""}
                  onClick={() => {
                    changeView("recipes");
                    setShowFavoritesOnly(false);
                  }}
                >
                  All Recipes
                </button>

                <button
                  className={activeView === "favorites" || showFavoritesOnly ? "active" : ""}
                  onClick={() => {
                    changeView("favorites");
                    setShowFavoritesOnly(true);
                  }}
                >
                  Favorites
                </button>
              </div>

              {/* Categories Navigation (Feature 4) */}
              <div className="category-list">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    className={`category-btn ${category === item ? "selected" : ""}`}
                    onClick={() => changeCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {/* Recipe Cards Grid */}
              <div className="recipe-grid">
                {filteredRecipes.map((recipe) => {
                  const canModify = Boolean(
                    user && (user.role === "admin" || (recipe.userId && recipe.userId === user.id))
                  );

                  return (
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
                        {canModify && (
                          <button
                            className="delete-recipe-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRecipe(recipe.id);
                            }}
                            title="Delete your recipe"
                          >
                            ×
                          </button>
                        )}
                        <button
                          className={`favorite-btn ${favorites.includes(recipe.id) ? "liked" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(recipe.id);
                          }}
                          aria-label="Toggle favorite"
                        >
                          {favorites.includes(recipe.id) ? "Saved" : "Save"}
                        </button>
                        <span className="time-label">{recipe.time}</span>
                      </div>

                      <div className="recipe-info">
                        <div className="recipe-meta">
                          <span>{recipe.category}</span>
                          <span>
                            {recipe.rating && Number(recipe.rating) > 0
                              ? `Rating: ${recipe.rating}`
                              : "Rating: —"}
                          </span>
                        </div>

                        <h3>{recipe.name}</h3>
                        <p>{recipe.description}</p>

                        <div className="card-actions-row">
                          <button
                            className="view-recipe"
                            onClick={() => handleSelectRecipe(recipe.id)}
                          >
                            View recipe <span>↗</span>
                          </button>
                          {canModify && (
                            <button
                              className="card-edit-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRecipe(recipe);
                              }}
                              title="Edit your recipe"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {loadingRecipes && (
                <div className="empty-state">
                  <p>Loading recipes...</p>
                </div>
              )}

              {filteredRecipes.length === 0 && !loadingRecipes && (
                <div className="empty-state">
                  <h3>No recipes found!</h3>
                  <p>
                    {activeView === "favorites"
                      ? "You haven't added any favorites yet."
                      : "Try adjusting your filters, pantry ingredients, or search keywords."}
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* RECIPE DETAILS MODAL (Features 7, 11, 12, 14, 15, 16, 17) */}
      {activeRecipe && (
        <RecipeDetailModal
          recipe={activeRecipe}
          isFavorite={favorites.includes(activeRecipe.id)}
          canModify={Boolean(
            user && (user.role === "admin" || (activeRecipe.userId && activeRecipe.userId === user.id))
          )}
          currentUserId={user?.id}
          isAdmin={user?.role === "admin"}
          onClose={() => handleSelectRecipe(null)}
          onToggleFavorite={(id) => toggleFavorite(id)}
          onEdit={(r) => setEditingRecipe(r)}
          onOpenShoppingList={() => setShowShoppingList(true)}
          onOpenMealPlanner={() => setShowMealPlanner(true)}
        />
      )}

      {/* ADD RECIPE MODAL (Features 3, 9, 16) */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div
            className="recipe-modal add-modal detail-modal-enhanced"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-modal" onClick={() => setShowAddForm(false)}>
              ×
            </button>

            <div className="modal-content">
              <h2>Add a New Recipe</h2>
              <p>Create and publish your recipe for the culinary community.</p>

              <div className="input-group">
                <label>Recipe Name</label>
                <input
                  placeholder="e.g. Creamy Tuscan Garlic Pasta"
                  value={newRecipe.name}
                  onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Description</label>
                <textarea
                  placeholder="Briefly describe flavors, aroma, and presentation..."
                  value={newRecipe.description}
                  onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="add-row">
                <div className="input-group">
                  <label>Category</label>
                  <select
                    value={newRecipe.category}
                    onChange={(e) => setNewRecipe({ ...newRecipe, category: e.target.value })}
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Difficulty</label>
                  <select
                    value={newRecipe.difficulty}
                    onChange={(e) => setNewRecipe({ ...newRecipe, difficulty: e.target.value })}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Cook Time</label>
                  <input
                    placeholder="e.g. 30 min"
                    value={newRecipe.time}
                    onChange={(e) => setNewRecipe({ ...newRecipe, time: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Prep Time (min)</label>
                  <input
                    type="number"
                    value={newRecipe.prepTimeMinutes}
                    onChange={(e) => setNewRecipe({ ...newRecipe, prepTimeMinutes: Number(e.target.value) })}
                  />
                </div>

                <div className="input-group">
                  <label>Servings</label>
                  <input
                    type="number"
                    value={newRecipe.servings}
                    onChange={(e) => setNewRecipe({ ...newRecipe, servings: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Dietary Tags */}
              <div className="input-group">
                <label>Dietary Tags</label>
                <div className="dietary-chips-group">
                  {DIETARY_OPTIONS.filter((d) => d !== "All").map((tag) => {
                    const sel = newRecipe.dietaryTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`dietary-chip-btn ${sel ? "selected" : ""}`}
                        onClick={() => toggleNewRecipeDietary(tag)}
                      >
                        {sel ? "✓ " : "+ "} {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nutrition Facts */}
              <div className="nutrition-inputs-row">
                <div className="input-group">
                  <label>Calories (kcal)</label>
                  <input
                    type="number"
                    value={newRecipe.calories}
                    onChange={(e) => setNewRecipe({ ...newRecipe, calories: Number(e.target.value) })}
                  />
                </div>
                <div className="input-group">
                  <label>Protein (g)</label>
                  <input
                    type="number"
                    value={newRecipe.proteinG}
                    onChange={(e) => setNewRecipe({ ...newRecipe, proteinG: Number(e.target.value) })}
                  />
                </div>
                <div className="input-group">
                  <label>Carbs (g)</label>
                  <input
                    type="number"
                    value={newRecipe.carbsG}
                    onChange={(e) => setNewRecipe({ ...newRecipe, carbsG: Number(e.target.value) })}
                  />
                </div>
                <div className="input-group">
                  <label>Fat (g)</label>
                  <input
                    type="number"
                    value={newRecipe.fatG}
                    onChange={(e) => setNewRecipe({ ...newRecipe, fatG: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Photo Upload & URL */}
              <div className="add-media-block">
                <div className="media-section-header">
                  <label>Recipe Photo</label>
                  {addImageStatus && <span className="upload-status-hint">{addImageStatus}</span>}
                </div>
                <div className="media-input-dual">
                  <div className="file-upload-box">
                    <label htmlFor="add-photo-file" className="file-upload-button">
                      Choose Photo from Gallery
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
                      onChange={(e) => setNewRecipe({ ...newRecipe, image: e.target.value })}
                    />
                  </div>
                </div>
                {newRecipe.image && (
                  <div className="media-preview-bar">
                    <img src={newRecipe.image} alt="Preview" className="media-mini-thumb" />
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
                  {addVideoStatus && <span className="upload-status-hint">{addVideoStatus}</span>}
                </div>
                <div className="media-input-dual">
                  <div className="file-upload-box">
                    <label htmlFor="add-video-file" className="file-upload-button">
                      Upload Video from Gallery
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
                      placeholder="YouTube, Shorts, Reel, TikTok link"
                      value={newRecipe.videoUrl}
                      onChange={(e) => setNewRecipe({ ...newRecipe, videoUrl: e.target.value })}
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

              <div className="input-group">
                <label>Ingredients (one per line or comma-separated)</label>
                <textarea
                  placeholder="2 cups flour, 1 tsp salt, 3 eggs..."
                  value={newRecipe.ingredients}
                  onChange={(e) => setNewRecipe({ ...newRecipe, ingredients: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="input-group">
                <label>Instructions (one step per line)</label>
                <textarea
                  placeholder="1. Preheat oven to 375F&#10;2. Mix dry ingredients in a large bowl&#10;3. Bake for 25 minutes..."
                  value={newRecipe.instructions}
                  onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
                  rows={4}
                />
              </div>

              <button
                className="modal-favorite"
                onClick={handleCreateRecipe}
              >
                Publish Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RECIPE MODAL */}
      {editingRecipe && (
        <RecipeEditModal
          recipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSave={(updated) => {
            setRecipes((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            handleSelectRecipe(updated.id);
          }}
        />
      )}

      {/* MEAL PLANNER MODAL (Feature 14) */}
      {showMealPlanner && (
        <MealPlannerModal
          onClose={() => setShowMealPlanner(false)}
          recipes={recipes}
          onSelectRecipe={(id) => handleSelectRecipe(id)}
        />
      )}

      {/* SHOPPING LIST MODAL (Feature 15) */}
      {showShoppingList && (
        <ShoppingListModal
          onClose={() => setShowShoppingList(false)}
          onSelectRecipe={(id) => handleSelectRecipe(id)}
        />
      )}

      {/* USER PROFILE MODAL (Feature 18) */}
      {showUserProfile && (
        <UserProfileModal
          onClose={() => setShowUserProfile(false)}
          onSelectRecipe={(id) => handleSelectRecipe(id)}
          onEditRecipe={(r) => setEditingRecipe(r)}
        />
      )}

      <footer>
        <div className="logo">crave</div>
        <p>Made for the love of food.</p>
        <span>© 2026 Crave Recipe Studio</span>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default App;
