const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("crave-token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface MealPlanItem {
  id: number;
  user_id: number;
  day_of_week: string;
  meal_type: string;
  recipe_id: number;
  notes?: string;
  recipe_name?: string;
  recipe_image?: string;
  time_minutes?: number;
  category?: string;
  difficulty?: string;
  calories?: number;
}

export interface ShoppingItem {
  id: number;
  user_id: number;
  item_text: string;
  is_checked: boolean;
  recipe_id?: number | null;
  recipe_name?: string;
  created_at: string;
}

// =======================
// MEAL PLANNER API
// =======================

export const getMealPlans = async (): Promise<MealPlanItem[]> => {
  const response = await fetch(`${API_URL}/meal-plan`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch meal plans");
  const data = await response.json();
  return data.mealPlans || [];
};

export const addMealPlan = async (item: {
  day_of_week: string;
  meal_type: string;
  recipe_id: number;
  notes?: string;
}): Promise<MealPlanItem> => {
  const response = await fetch(`${API_URL}/meal-plan`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(item),
  });
  if (!response.ok) throw new Error("Failed to add meal plan");
  const data = await response.json();
  return data.mealPlan;
};

export const deleteMealPlan = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/meal-plan/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete meal plan");
};

// =======================
// SHOPPING LIST API
// =======================

export const getShoppingList = async (): Promise<ShoppingItem[]> => {
  const response = await fetch(`${API_URL}/shopping-list`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch shopping list");
  const data = await response.json();
  return data.items || [];
};

export const addShoppingItem = async (item_text: string, recipe_id?: number): Promise<ShoppingItem> => {
  const response = await fetch(`${API_URL}/shopping-list`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ item_text, recipe_id }),
  });
  if (!response.ok) throw new Error("Failed to add item to shopping list");
  const data = await response.json();
  return data.item;
};

export const addIngredientsFromRecipe = async (recipe_id: number): Promise<ShoppingItem[]> => {
  const response = await fetch(`${API_URL}/shopping-list/from-recipe`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ recipe_id }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Failed to add ingredients");
  }
  const data = await response.json();
  return data.items;
};

export const toggleShoppingItem = async (id: number): Promise<ShoppingItem> => {
  const response = await fetch(`${API_URL}/shopping-list/${id}/toggle`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to update item");
  const data = await response.json();
  return data.item;
};

export const deleteShoppingItem = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/shopping-list/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete item");
};

export const clearShoppingList = async (onlyChecked = false): Promise<void> => {
  const url = `${API_URL}/shopping-list${onlyChecked ? "?checked=true" : ""}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to clear shopping list");
};
