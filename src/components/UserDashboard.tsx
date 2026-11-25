import type { Recipe } from "../services/recipeService";

interface UserDashboardProps {
  userName: string;
  userRole?: string;
  recipes: Recipe[];
  favorites: number[];
  onNavigateToRecipes: () => void;
  onNavigateToFavorites: () => void;
  onOpenAddRecipe: () => void;
  onSelectRecipe: (id: number) => void;
  onNavigateToAdmin?: () => void;
}

export default function UserDashboard({
  userName,
  userRole,
  recipes,
  favorites,
  onNavigateToRecipes,
  onNavigateToFavorites,
  onOpenAddRecipe,
  onSelectRecipe,
  onNavigateToAdmin,
}: UserDashboardProps) {
  const activeRecipes = recipes.filter((r) => !r.isDeleted);
  const myFavoritesCount = favorites.length;
  const recentRecipes = activeRecipes.slice(0, 4);

  // Unique categories count
  const uniqueCategories = Array.from(
    new Set(activeRecipes.map((r) => r.category).filter(Boolean))
  );

  return (
    <div className="user-dashboard-view">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-banner">
        <div className="welcome-text-area">
          <span className="eyebrow">YOUR KITCHEN OVERVIEW</span>
          <h2>Welcome back, {userName}!</h2>
          <p>
            Here is what's cooking today in your Crave kitchen. Browse community
            favorites, check out fresh recipes, or submit your own creation.
          </p>
        </div>

        <div className="welcome-actions">
          <button className="primary-action-btn" onClick={onNavigateToRecipes}>
            Explore All Recipes <span>↗</span>
          </button>
          <button className="secondary-action-btn" onClick={onOpenAddRecipe}>
            + Add Recipe
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

        <div className="dash-metric-card">
          <span className="dash-metric-label">Cuisines & Tags</span>
          <strong className="dash-metric-num">{uniqueCategories.length}</strong>
          <span className="dash-metric-hint">
            {uniqueCategories.slice(0, 3).join(", ") || "Varied"}
          </span>
        </div>

        <div className="dash-metric-card highlight" onClick={onOpenAddRecipe}>
          <span className="dash-metric-label">Kitchen Status</span>
          <strong className="dash-metric-status">Ready to Cook</strong>
          <span className="dash-metric-hint">Add a new dish now →</span>
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

        <div className="shortcut-box" onClick={onOpenAddRecipe}>
          <div className="shortcut-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <div className="shortcut-details">
            <strong>Publish Recipe</strong>
            <p>Upload gallery photos with compression, add videos, and share steps.</p>
          </div>
          <span className="shortcut-arrow">→</span>
        </div>

        <div className="shortcut-box" onClick={onNavigateToFavorites}>
          <div className="shortcut-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div className="shortcut-details">
            <strong>My Favorites</strong>
            <p>Quick access to all your bookmarked meals in one spot.</p>
          </div>
          <span className="shortcut-arrow">→</span>
        </div>
      </div>

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
