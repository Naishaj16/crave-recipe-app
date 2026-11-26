const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("crave-token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  bio?: string;
  dietary_preferences?: string[];
  twoFactorEnabled?: boolean;
  created_at: string;
  last_login?: string;
  createdRecipesCount?: number;
  favoritesCount?: number;
  recipes?: any[];
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

// =======================
// PROFILE API (Feature 18)
// =======================

export const getProfile = async (): Promise<UserProfile> => {
  const response = await fetch(`${API_URL}/profile`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch profile");
  const data = await response.json();
  return data.profile;
};

export const updateProfile = async (profile: {
  name: string;
  bio?: string;
  dietary_preferences?: string[];
}) => {
  const response = await fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error("Failed to update profile");
  return response.json();
};

// =======================
// NOTIFICATIONS API (Feature 19)
// =======================

export const getNotifications = async (): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> => {
  const response = await fetch(`${API_URL}/notifications`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) return { notifications: [], unreadCount: 0 };
  const data = await response.json();
  return {
    notifications: data.notifications || [],
    unreadCount: data.unreadCount || 0,
  };
};

export const markNotificationRead = async (id: number): Promise<void> => {
  await fetch(`${API_URL}/notifications/${id}/read`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await fetch(`${API_URL}/notifications/read-all`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
};
