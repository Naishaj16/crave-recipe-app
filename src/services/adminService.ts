const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("crave-token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface ActivityLog {
  id: number;
  user_id?: number | null;
  email: string;
  user_name: string;
  action: "login" | "logout" | "signup" | "failed_login" | string;
  status: "success" | "failed" | "disabled_account" | string;
  ip_address: string;
  user_agent?: string;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  activeRecipes: number;
  trashedRecipes: number;
  totalFavorites: number;
  totalLogins: number;
  recentActivity: ActivityLog[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "disabled";
  last_login?: string | null;
  created_at: string;
}

export interface AdminRecipe {
  id: number;
  name: string;
  description?: string;
  category: string;
  time_minutes: number;
  image?: string;
  is_deleted: boolean;
  video_url?: string | null;
  created_at: string;
  creator_name?: string | null;
  creator_email?: string | null;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  const res = await fetch(`${API_URL}/admin/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load admin stats");
  const data = await res.json();
  return data.stats;
};

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  const res = await fetch(`${API_URL}/admin/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load users");
  const data = await res.json();
  return data.users;
};

export const updateUserRole = async (userId: number, role: "user" | "admin") => {
  const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to update user role");
  }
  return res.json();
};

export const updateUserStatus = async (
  userId: number,
  status: "active" | "disabled"
) => {
  const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to update user status");
  }
  return res.json();
};

export const deleteUser = async (userId: number) => {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to delete user");
  }
  return res.json();
};

export const getAdminActivity = async (): Promise<ActivityLog[]> => {
  const res = await fetch(`${API_URL}/admin/activity`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load activity logs");
  const data = await res.json();
  return data.activities;
};

export const getAdminRecipes = async (): Promise<AdminRecipe[]> => {
  const res = await fetch(`${API_URL}/admin/recipes`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load recipes");
  const data = await res.json();
  return data.recipes;
};

export const softDeleteRecipe = async (recipeId: number) => {
  const res = await fetch(`${API_URL}/admin/recipes/${recipeId}/soft-delete`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to soft-delete recipe");
  return res.json();
};

export const restoreRecipe = async (recipeId: number) => {
  const res = await fetch(`${API_URL}/admin/recipes/${recipeId}/restore`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to restore recipe");
  return res.json();
};

export const permanentDeleteRecipe = async (recipeId: number) => {
  const res = await fetch(`${API_URL}/admin/recipes/${recipeId}/permanent`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to permanently delete recipe");
  return res.json();
};
