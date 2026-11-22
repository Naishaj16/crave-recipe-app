import { useEffect, useState } from "react";
import {
  getAdminStats,
  getAdminUsers,
  updateUserRole,
  getAdminRecipes,
  restoreRecipe,
  permanentDeleteRecipe,
} from "../services/adminService";
import type {
  AdminStats,
  AdminUser,
  AdminRecipe,
} from "../services/adminService";

interface AdminDashboardProps {
  onClose: () => void;
  onRecipeUpdated: () => void;
}

export default function AdminDashboard({
  onClose,
  onRecipeUpdated,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "recipes">(
    "stats"
  );
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
  const [recipeFilter, setRecipeFilter] = useState<"all" | "trash">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsData, usersData, recipesData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminRecipes(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setRecipes(recipesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleToggle = async (user: AdminUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    if (
      !window.confirm(
        `Are you sure you want to change ${user.name}'s role to ${newRole}?`
      )
    ) {
      return;
    }

    try {
      await updateUserRole(user.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      // Refresh stats
      const newStats = await getAdminStats();
      setStats(newStats);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restoreRecipe(id);
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_deleted: false } : r))
      );
      const newStats = await getAdminStats();
      setStats(newStats);
      onRecipeUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to restore recipe");
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (
      !window.confirm(
        "Permanently delete this recipe? This action CANNOT be undone."
      )
    ) {
      return;
    }

    try {
      await permanentDeleteRecipe(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      const newStats = await getAdminStats();
      setStats(newStats);
      onRecipeUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete recipe");
    }
  };

  const displayedRecipes = recipes.filter((r) =>
    recipeFilter === "trash" ? r.is_deleted : true
  );

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-header">
          <div>
            <div className="admin-badge">Admin Workspace</div>
            <h2>Crave Control Center</h2>
          </div>
          <button className="admin-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="admin-tabs">
          <button
            className={activeTab === "stats" ? "active" : ""}
            onClick={() => setActiveTab("stats")}
          >
            📊 Overview & Stats
          </button>
          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            👥 User Directory ({users.length})
          </button>
          <button
            className={activeTab === "recipes" ? "active" : ""}
            onClick={() => setActiveTab("recipes")}
          >
            🍲 Recipe & Trash Manager ({stats?.trashedRecipes || 0} in Trash)
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">Loading administrative data...</div>
        ) : error ? (
          <div className="admin-error">{error}</div>
        ) : (
          <div className="admin-content">
            {activeTab === "stats" && stats && (
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <span className="stat-label">Total Registered Users</span>
                  <strong className="stat-value">{stats.totalUsers}</strong>
                  <span className="stat-hint">Active kitchen accounts</span>
                </div>
                <div className="admin-stat-card">
                  <span className="stat-label">Active Recipes</span>
                  <strong className="stat-value">{stats.activeRecipes}</strong>
                  <span className="stat-hint">Published & visible</span>
                </div>
                <div className="admin-stat-card">
                  <span className="stat-label">Recipes in Trash</span>
                  <strong className="stat-value alert">
                    {stats.trashedRecipes}
                  </strong>
                  <span className="stat-hint">Can be restored anytime</span>
                </div>
                <div className="admin-stat-card">
                  <span className="stat-label">Total Saved Favorites</span>
                  <strong className="stat-value">{stats.totalFavorites}</strong>
                  <span className="stat-hint">Across all users</span>
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-tag ${u.role}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="admin-action-btn"
                            onClick={() => handleRoleToggle(u)}
                          >
                            {u.role === "admin"
                              ? "Demote to User"
                              : "Promote to Admin"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "recipes" && (
              <div className="admin-recipes-container">
                <div className="admin-filter-bar">
                  <button
                    className={recipeFilter === "all" ? "selected" : ""}
                    onClick={() => setRecipeFilter("all")}
                  >
                    All Recipes ({recipes.length})
                  </button>
                  <button
                    className={recipeFilter === "trash" ? "selected" : ""}
                    onClick={() => setRecipeFilter("trash")}
                  >
                    Trash Only (
                    {recipes.filter((r) => r.is_deleted).length})
                  </button>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRecipes.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.name}</strong>
                          </td>
                          <td>{r.category}</td>
                          <td>{r.time_minutes} min</td>
                          <td>
                            <span
                              className={`status-pill ${r.is_deleted ? "trashed" : "active"
                                }`}
                            >
                              {r.is_deleted ? "In Trash" : "Active"}
                            </span>
                          </td>
                          <td className="action-cell">
                            {r.is_deleted ? (
                              <>
                                <button
                                  className="admin-restore-btn"
                                  onClick={() => handleRestore(r.id)}
                                >
                                  ↩ Restore
                                </button>
                                <button
                                  className="admin-delete-btn"
                                  onClick={() => handlePermanentDelete(r.id)}
                                >
                                  Delete Permanently
                                </button>
                              </>
                            ) : (
                              <span className="hint-active">Live on site</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
