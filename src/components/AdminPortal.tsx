import { useEffect, useState } from "react";
import {
  getAdminStats,
  getAdminUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getAdminActivity,
  getAdminRecipes,
  softDeleteRecipe,
  restoreRecipe,
  permanentDeleteRecipe,
} from "../services/adminService";
import type {
  AdminStats,
  AdminUser,
  AdminRecipe,
  ActivityLog,
} from "../services/adminService";
import { useAuth } from "../context/AuthContext";

type AdminTab = "dashboard" | "users" | "activity" | "recipes";

interface AdminPortalProps {
  onBackToApp: () => void;
  onRecipeUpdated?: () => void;
}

export default function AdminPortal({
  onBackToApp,
  onRecipeUpdated,
}: AdminPortalProps) {
  const { user, login, logout } = useAuth();

  const getTabFromPath = (): AdminTab => {
    const path = window.location.pathname;
    if (path.includes("/admin/users")) return "users";
    if (path.includes("/admin/activity")) return "activity";
    if (path.includes("/admin/recipes")) return "recipes";
    return "dashboard";
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getTabFromPath);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeFilter, setRecipeFilter] = useState<"all" | "active" | "trash">(
    "all"
  );
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const switchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    window.history.pushState(null, "", `/admin/${tab}`);
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromPath());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const loadAdminData = async () => {
    if (!user || user.role !== "admin") return;
    setLoading(true);
    setError("");
    try {
      const [statsData, usersData, activityData, recipesData] =
        await Promise.all([
          getAdminStats(),
          getAdminUsers(),
          getAdminActivity(),
          getAdminRecipes(),
        ]);
      setStats(statsData);
      setUsers(usersData);
      setActivities(activityData);
      setRecipes(recipesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadAdminData();
    }
  }, [user]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001/api"}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      if (data.user.role !== "admin") {
        throw new Error(
          "Access denied. This account does not possess administrator privileges."
        );
      }

      login(data.user, data.token);
      showSuccess(`Signed in as ${data.user.name}`);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleToggleRole = async (targetUser: AdminUser) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    if (
      !window.confirm(
        `Update role for ${targetUser.name} to ${newRole.toUpperCase()}?`
      )
    ) {
      return;
    }

    try {
      await updateUserRole(targetUser.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      showSuccess(`Role updated to ${newRole} for ${targetUser.name}`);
      loadAdminData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleToggleStatus = async (targetUser: AdminUser) => {
    const newStatus = targetUser.status === "active" ? "disabled" : "active";
    const confirmMessage =
      newStatus === "disabled"
        ? `Deactivate account for ${targetUser.name}? User will be blocked from logging in.`
        : `Reactivate account for ${targetUser.name}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await updateUserStatus(targetUser.id, newStatus);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, status: newStatus } : u
        )
      );
      showSuccess(`Account status changed to ${newStatus}`);
      loadAdminData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change status");
    }
  };

  const handleDeleteUser = async (targetUser: AdminUser) => {
    if (
      !window.confirm(
        `Permanently delete user ${targetUser.name} (${targetUser.email})? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      showSuccess(`User account deleted`);
      loadAdminData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleSoftDelete = async (id: number) => {
    try {
      await softDeleteRecipe(id);
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_deleted: true } : r))
      );
      showSuccess("Recipe moved to trash");
      loadAdminData();
      onRecipeUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to soft-delete recipe");
    }
  };

  const handleRestoreRecipe = async (id: number) => {
    try {
      await restoreRecipe(id);
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_deleted: false } : r))
      );
      showSuccess("Recipe restored");
      loadAdminData();
      onRecipeUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to restore recipe");
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (
      !window.confirm(
        "Permanently delete this recipe from PostgreSQL? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await permanentDeleteRecipe(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      showSuccess("Recipe permanently deleted");
      loadAdminData();
      onRecipeUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete recipe");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const filteredRecipes = recipes.filter((r) => {
    const q = recipeSearch.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      Boolean(r.creator_name && r.creator_name.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (recipeFilter === "active") return !r.is_deleted;
    if (recipeFilter === "trash") return r.is_deleted;
    return true;
  });

  const filteredActivities = activities.filter((a) => {
    if (activityFilter === "all") return true;
    if (activityFilter === "admin") return a.action.includes(":");
    return a.action === activityFilter;
  });

  // 1. IF NOT SIGNED IN AS ADMIN -> RENDER RESTRAINED PROFESSIONAL LOGIN
  if (!user || user.role !== "admin") {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-box">
          <div className="admin-login-header">
            <span className="admin-logo-mark">CRAVE</span>
            <h1>Admin Authentication</h1>
            <p>Authorized personnel only. Normal accounts will be rejected.</p>
          </div>

          {loginError && <div className="admin-notice error">{loginError}</div>}

          <form onSubmit={handleAdminLogin} className="admin-form">
            <div className="form-field">
              <label htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                placeholder="admin@crave.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                placeholder="••••••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="admin-primary-btn"
              disabled={loginLoading}
            >
              {loginLoading ? "Authenticating..." : "Sign In to Admin Console"}
            </button>
          </form>

          <div className="admin-login-bottom">
            <button
              type="button"
              className="admin-text-link"
              onClick={onBackToApp}
            >
              Return to Crave website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN ADMIN CONSOLE
  return (
    <div className="admin-console">
      {/* Top Header */}
      <header className="admin-topbar">
        <div className="topbar-left">
          <span className="brand-logo">CRAVE</span>
          <span className="brand-divider">/</span>
          <span className="brand-section">Admin Console</span>
        </div>

        <div className="topbar-right">
          <div className="admin-identity">
            <span className="identity-name">{user.name}</span>
            <span className="identity-email">{user.email}</span>
            <span className="identity-badge">Admin</span>
          </div>

          <button className="topbar-action-btn" onClick={onBackToApp}>
            Public Site
          </button>
          <button
            className="topbar-signout-btn"
            onClick={() => {
              logout();
              onBackToApp();
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="admin-workspace">
        {/* Sidebar Navigation */}
        <aside className="admin-nav-sidebar">
          <nav className="nav-menu">
            <button
              className={`nav-menu-item ${
                activeTab === "dashboard" ? "active" : ""
              }`}
              onClick={() => switchTab("dashboard")}
            >
              Overview
            </button>

            <button
              className={`nav-menu-item ${
                activeTab === "users" ? "active" : ""
              }`}
              onClick={() => switchTab("users")}
            >
              Users
              <span className="count-pill">{users.length}</span>
            </button>

            <button
              className={`nav-menu-item ${
                activeTab === "activity" ? "active" : ""
              }`}
              onClick={() => switchTab("activity")}
            >
              Activity Logs
              <span className="count-pill">{activities.length}</span>
            </button>

            <button
              className={`nav-menu-item ${
                activeTab === "recipes" ? "active" : ""
              }`}
              onClick={() => switchTab("recipes")}
            >
              Recipes
              {stats && stats.trashedRecipes > 0 && (
                <span className="count-pill alert">
                  {stats.trashedRecipes} in trash
                </span>
              )}
            </button>
          </nav>

          <div className="sidebar-status-box">
            <div className="status-row">
              <span className="status-indicator-dot"></span>
              <span>PostgreSQL Connected</span>
            </div>
            <div className="status-row">
              <span className="status-indicator-dot"></span>
              <span>Port 5001 Active</span>
            </div>
          </div>
        </aside>

        {/* Workspace Content */}
        <main className="admin-content-pane">
          {actionSuccess && (
            <div className="admin-alert-banner success">{actionSuccess}</div>
          )}
          {error && <div className="admin-alert-banner error">{error}</div>}

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h2>System Overview</h2>
                  <p>Database statistics and recent application events.</p>
                </div>
                <button
                  className="secondary-btn"
                  onClick={loadAdminData}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {stats && (
                <div className="metrics-row">
                  <div className="metric-box">
                    <span className="metric-title">Total Users</span>
                    <strong className="metric-figure">{stats.totalUsers}</strong>
                    <span className="metric-caption">
                      {stats.activeUsers} active accounts
                    </span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-title">Published Recipes</span>
                    <strong className="metric-figure">
                      {stats.activeRecipes}
                    </strong>
                    <span className="metric-caption">Active in public feed</span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-title">Trashed Recipes</span>
                    <strong className="metric-figure">{stats.trashedRecipes}</strong>
                    <span className="metric-caption">Soft-deleted records</span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-title">Login Events</span>
                    <strong className="metric-figure">{stats.totalLogins}</strong>
                    <span className="metric-caption">
                      {stats.totalFavorites} saved favorites
                    </span>
                  </div>
                </div>
              )}

              {/* Recent Activity Table */}
              <div className="sub-panel">
                <div className="sub-panel-header">
                  <h3>Recent Activity</h3>
                  <button
                    className="link-btn"
                    onClick={() => switchTab("activity")}
                  >
                    View All Logs
                  </button>
                </div>

                <div className="table-wrapper">
                  <table className="compact-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Event</th>
                        <th>User</th>
                        <th>Status</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                        stats.recentActivity.map((log) => (
                          <tr key={log.id}>
                            <td className="time-col">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td>
                              <span className="tag-pill">
                                {log.action.replace("_", " ")}
                              </span>
                            </td>
                            <td>
                              <strong>{log.user_name || "Guest"}</strong>{" "}
                              <span className="sub-text">({log.email})</span>
                            </td>
                            <td>
                              <span
                                className={`status-badge ${
                                  log.status === "success"
                                    ? "success"
                                    : "failed"
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="mono-col">{log.ip_address}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="empty-cell">
                            No recent activity recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER DIRECTORY */}
          {activeTab === "users" && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h2>User Directory</h2>
                  <p>Manage accounts, role assignments, and account status.</p>
                </div>
                <div className="search-wrap">
                  <input
                    type="text"
                    className="compact-input"
                    placeholder="Search name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-wrapper">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                            {u.id === user.id && (
                              <span className="current-user-tag">You</span>
                            )}
                          </td>
                          <td>{u.email}</td>
                          <td>
                            <span
                              className={`role-chip ${
                                u.role === "admin" ? "admin" : "user"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status-chip ${
                                u.status === "active" ? "active" : "disabled"
                              }`}
                            >
                              {u.status || "active"}
                            </span>
                          </td>
                          <td className="time-col">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="action-row">
                              {u.id !== user.id ? (
                                <>
                                  <button
                                    className="table-btn"
                                    onClick={() => handleToggleRole(u)}
                                    title="Switch between user and admin"
                                  >
                                    {u.role === "admin"
                                      ? "Set User"
                                      : "Set Admin"}
                                  </button>
                                  <button
                                    className={`table-btn ${
                                      u.status === "disabled"
                                        ? "activate"
                                        : "deactivate"
                                    }`}
                                    onClick={() => handleToggleStatus(u)}
                                  >
                                    {u.status === "disabled"
                                      ? "Activate"
                                      : "Deactivate"}
                                  </button>
                                  <button
                                    className="table-btn danger"
                                    onClick={() => handleDeleteUser(u)}
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <span className="sub-text">Active session</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="empty-cell">
                          No users matched search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY LOGS */}
          {activeTab === "activity" && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h2>Authentication & Audit Logs</h2>
                  <p>Persistent database log of logins, logouts, and system events.</p>
                </div>
                <div className="filter-wrap">
                  <select
                    className="compact-select"
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                  >
                    <option value="all">All Events ({activities.length})</option>
                    <option value="login">Logins</option>
                    <option value="logout">Logouts</option>
                    <option value="signup">Signups</option>
                    <option value="failed_login">Failed Logins</option>
                    <option value="admin">Admin Actions</option>
                  </select>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event</th>
                      <th>User</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.length > 0 ? (
                      filteredActivities.map((act) => (
                        <tr key={act.id}>
                          <td className="time-col">
                            {new Date(act.created_at).toLocaleString()}
                          </td>
                          <td>
                            <span className="tag-pill">{act.action}</span>
                          </td>
                          <td>{act.user_name || "—"}</td>
                          <td>{act.email}</td>
                          <td>
                            <span
                              className={`status-badge ${
                                act.status === "success"
                                  ? "success"
                                  : "failed"
                              }`}
                            >
                              {act.status}
                            </span>
                          </td>
                          <td className="mono-col">{act.ip_address}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="empty-cell">
                          No activity events found for this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RECIPES */}
          {activeTab === "recipes" && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h2>Recipe Management</h2>
                  <p>Manage published recipes, soft-deletes, and trash recovery.</p>
                </div>
                <div className="controls-row">
                  <input
                    type="text"
                    className="compact-input"
                    placeholder="Search title, category, creator..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                  />
                  <div className="segmented-control">
                    <button
                      className={recipeFilter === "all" ? "active" : ""}
                      onClick={() => setRecipeFilter("all")}
                    >
                      All ({recipes.length})
                    </button>
                    <button
                      className={recipeFilter === "active" ? "active" : ""}
                      onClick={() => setRecipeFilter("active")}
                    >
                      Active ({recipes.filter((r) => !r.is_deleted).length})
                    </button>
                    <button
                      className={recipeFilter === "trash" ? "active" : ""}
                      onClick={() => setRecipeFilter("trash")}
                    >
                      Trash ({recipes.filter((r) => r.is_deleted).length})
                    </button>
                  </div>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Creator</th>
                      <th>Prep Time</th>
                      <th>State</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipes.length > 0 ? (
                      filteredRecipes.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div className="recipe-title-cell">
                              {r.image && (
                                <img
                                  src={r.image}
                                  alt=""
                                  className="mini-thumb"
                                />
                              )}
                              <div>
                                <strong>{r.name}</strong>
                                {r.video_url && (
                                  <span className="media-tag">Video</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{r.category}</td>
                          <td>
                            {r.creator_name ? (
                              <span>
                                {r.creator_name}{" "}
                                <span className="sub-text">
                                  ({r.creator_email})
                                </span>
                              </span>
                            ) : (
                              <span className="sub-text">System / Default</span>
                            )}
                          </td>
                          <td>{r.time_minutes} min</td>
                          <td>
                            <span
                              className={`status-chip ${
                                r.is_deleted ? "disabled" : "active"
                              }`}
                            >
                              {r.is_deleted ? "In Trash" : "Published"}
                            </span>
                          </td>
                          <td className="time-col">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="action-row">
                              {r.is_deleted ? (
                                <>
                                  <button
                                    className="table-btn activate"
                                    onClick={() => handleRestoreRecipe(r.id)}
                                  >
                                    Restore
                                  </button>
                                  <button
                                    className="table-btn danger"
                                    onClick={() => handlePermanentDelete(r.id)}
                                  >
                                    Purge
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="table-btn deactivate"
                                  onClick={() => handleSoftDelete(r.id)}
                                >
                                  Move to Trash
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="empty-cell">
                          No recipes found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
