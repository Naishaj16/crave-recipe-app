import type { Recipe } from "../services/recipeService";

interface UserDashboardProps {
  userName: string;
  userRole?: string;
  userId?: number | null;
  recipes: Recipe[];
  favorites: number[];
  onNavigateToRecipes: () => void;
  onNavigateToFavorites: () => void;
  onOpenAddRecipe: () => void;
  onSelectRecipe: (id: number) => void;
  onOpenMealPlanner: () => void;
  onOpenShoppingList: () => void;
  onOpenProfile: () => void;
  onNavigateToAdmin?: () => void;
}

export default function UserDashboard({
  userName,
  userRole,
  userId,
  recipes,
  favorites,
  onNavigateToRecipes,
  onNavigateToFavorites,
  onOpenAddRecipe,
  onSelectRecipe,
  onOpenMealPlanner,
  onOpenShoppingList,
  onOpenProfile,
  onNavigateToAdmin,
}: UserDashboardProps) {
  const activeRecipes = recipes.filter((r) => !r.isDeleted);
  const myFavoritesCount = favorites.length;
  const myCreatedRecipes = activeRecipes.filter(
    (r) => userId && r.userId && r.userId === userId
  );
  const recentRecipes = activeRecipes.slice(0, 4);

  return (
    <div className="user-dashboard-view">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-banner">
        <div className="welcome-text-area">
          <span className="eyebrow">YOUR KITCHEN OVERVIEW</span>
          <h2>Welcome back, {userName}!</h2>
          <p>
            Here is what's cooking today in your Crave kitchen. Plan your weekly meals,
            manage your grocery shopping list, or publish your own culinary creations.
          </p>
        </div>

        <div className="welcome-actions">
          <button className="primary-action-btn" onClick={onNavigateToRecipes}>
            Explore All Recipes <span>↗</span>
          </button>
          <button className="secondary-action-btn" onClick={onOpenAddRecipe}>
            + Add Recipe
          </button>
          <button className="secondary-action-btn" onClick={onOpenMealPlanner}>
            Meal Planner
          </button>
          <button className="secondary-action-btn" onClick={onOpenShoppingList}>
            Shopping List
          </button>
          {userRole === "admin" && onNavigateToAdmin && (
            <button className="admin-portal-badge-btn" onClick={onNavigateToAdmin}>
              Admin Console
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Metric Counters */}
      <div className="dashboard-metrics-grid">
        <div className="dash-metric-card" onClick={onNavigateToRecipes}>
          <span className="dash-metric-label">Active Recipes</span>
          <strong className="dash-metric-num">{activeRecipes.length}</strong>
          <span className="dash-metric-hint">Available in catalog →</span>
        </div>

        <div className="dash-metric-card" onClick={onNavigateToFavorites}>
          <span className="dash-metric-label">Saved Favorites</span>
          <strong className="dash-metric-num">{myFavoritesCount}</strong>
          <span className="dash-metric-hint">In your personal cookbook →</span>
        </div>

        <div className="dash-metric-card" onClick={onOpenMealPlanner}>
          <span className="dash-metric-label">Meal Planner</span>
          <strong className="dash-metric-num">7 Days</strong>
          <span className="dash-metric-hint">Organize weekly menu →</span>
        </div>

        <div className="dash-metric-card highlight" onClick={onOpenShoppingList}>
          <span className="dash-metric-label">Shopping List</span>
          <strong className="dash-metric-status">Smart List</strong>
          <span className="dash-metric-hint">Auto-generated checklist →</span>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="dashboard-shortcuts-row">
        <div className="shortcut-box" onClick={onNavigateToRecipes}>
          <div className="shortcut-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div className="shortcut-details">
            <strong>Recipe Catalog</strong>
            <p>Filter by cuisine, search ingredients, or watch video tutorials.</p>
          </div>
          <span className="shortcut-arrow">→</span>
        </div>

        <div className="shortcut-box" onClick={onOpenMealPlanner}>
          <div className="shortcut-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="shortcut-details">
            <strong>Weekly Meal Planner</strong>
            <p>Schedule breakfast, lunch, and dinner recipes for the week.</p>
          </div>
          <span className="shortcut-arrow">→</span>
        </div>

        <div className="shortcut-box" onClick={onOpenShoppingList}>
          <div className="shortcut-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <div className="shortcut-details">
            <strong>Shopping List</strong>
            <p>Check off needed ingredients and add pantry items.</p>
          </div>
          <span className="shortcut-arrow">→</span>
        </div>

        <div className="shortcut-box" onClick={onOpenProfile}>
          <div className="shortcut-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="shortcut-details">
            <strong>Kitchen Profile</strong>
            <p>Manage your bio, dietary preferences, and published dishes.</p>
          </div>
          <span className="shortcut-arrow">→</span>
        </div>
      </div>

      {/* User's Created Recipes Section */}
      {myCreatedRecipes.length > 0 && (
        <div className="dashboard-recent-section" style={{ marginBottom: "2rem" }}>
          <div className="recent-section-header">
            <div>
              <span className="eyebrow">YOUR CONTRIBUTIONS</span>
              <h3>My Published Recipes ({myCreatedRecipes.length})</h3>
            </div>
            <button className="link-button" onClick={onOpenAddRecipe}>
              + Create Another Recipe
            </button>
          </div>

          <div className="recent-recipe-grid">
            {myCreatedRecipes.map((r) => (
              <div
                key={r.id}
                className="recent-recipe-card"
                onClick={() => onSelectRecipe(r.id)}
              >
                <div className="recent-card-image">
                  <img src={r.image} alt={r.name} />
                  <span className="recent-time-tag">{r.time}</span>
                </div>
                <div className="recent-card-body">
                  <span className="recent-cat-badge">{r.category}</span>
                  <h4>{r.name}</h4>
                  <p>{r.description || "A delicious homemade recipe."}</p>
                  <div className="recent-card-footer">
                    <span className="card-rating">
                      {r.rating && Number(r.rating) > 0 ? `Rating: ${r.rating}` : "Author"}
                    </span>
                    <span className="view-link">View Recipe ↗</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Recipes Showcase */}
      <div className="dashboard-recent-section">
        <div className="recent-section-header">
          <div>
            <span className="eyebrow">JUST ADDED</span>
            <h3>Fresh Community Recipes</h3>
          </div>
          <button className="link-button" onClick={onNavigateToRecipes}>
            View All ({activeRecipes.length}) →
          </button>
        </div>

        <div className="recent-recipe-grid">
          {recentRecipes.map((r) => (
            <div
              key={r.id}
              className="recent-recipe-card"
              onClick={() => onSelectRecipe(r.id)}
            >
              <div className="recent-card-image">
                <img src={r.image} alt={r.name} />
                <span className="recent-time-tag">{r.time}</span>
              </div>
              <div className="recent-card-body">
                <span className="recent-cat-badge">{r.category}</span>
                <h4>{r.name}</h4>
                <p>{r.description || "A delicious homemade recipe."}</p>
                <div className="recent-card-footer">
                  <span className="card-rating">
                    {r.rating && Number(r.rating) > 0 ? `Rating: ${r.rating}` : "New"}
                  </span>
                  <span className="view-link">View Recipe ↗</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
