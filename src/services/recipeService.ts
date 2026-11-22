const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export interface Recipe {
    id: number;
    name: string;
    description: string;
    category: string;
    time: string;
    rating?: string;
    image: string;
    ingredients: string[];
    instructions: string[];
    videoUrl?: string;
    isDeleted?: boolean;
}

const formatRecipe = (recipe: any): Recipe => ({
    ...recipe,
    time: `${recipe.time_minutes || 0} min`,
    rating: String(recipe.rating ?? "0"),
    videoUrl: recipe.video_url || recipe.videoUrl || "",
    isDeleted: recipe.is_deleted ?? false,
});

const timeToMinutes = (time: string) => {
    const match = time.match(/\d+/);
    return match ? Number(match[0]) : 0;
};

const getAuthHeaders = () => {
    const token = localStorage.getItem("crave-token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// GET recipes
export const getRecipes = async (): Promise<Recipe[]> => {
    const response = await fetch(`${API_URL}/recipes`);
    if (!response.ok) throw new Error("Failed to fetch recipes");

    const data = await response.json();
    return data.recipes.map(formatRecipe);
};

// POST recipe
export const createRecipe = async (recipe: Omit<Recipe, "id">) => {
    const response = await fetch(`${API_URL}/recipes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            ...recipe,
            time_minutes: timeToMinutes(recipe.time),
            video_url: recipe.videoUrl || "",
            is_deleted: false,
        }),
    });

    if (!response.ok) throw new Error("Failed to create recipe");
    const data = await response.json();
    return formatRecipe(data.recipe);
};

// PUT recipe
export const updateRecipe = async (id: number, recipe: Omit<Recipe, "id">) => {
    const response = await fetch(`${API_URL}/recipes/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            ...recipe,
            time_minutes: timeToMinutes(recipe.time),
            video_url: recipe.videoUrl || "",
        }),
    });

    if (!response.ok) throw new Error("Failed to update recipe");
    const data = await response.json();
    return formatRecipe(data.recipe);
};

// DELETE recipe
export const deleteRecipe = async (id: number) => {
    const response = await fetch(`${API_URL}/recipes/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to delete recipe");
    return response.json();
};
// GET favorites
export const getFavorites = async (): Promise<number[]> => {
    const response = await fetch(`${API_URL}/favorites`);

    if (!response.ok) throw new Error("Failed to fetch favorites");

    const data = await response.json();

    return data.favorites.map((recipe: any) => recipe.id);
};

// ADD favorite
export const addFavorite = async (recipeId: number) => {
    const response = await fetch(`${API_URL}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId }),
    });

    if (!response.ok) throw new Error("Failed to add favorite");

    return response.json();
};

// REMOVE favorite
export const removeFavorite = async (recipeId: number) => {
    const response = await fetch(`${API_URL}/favorites/${recipeId}`, {
        method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to remove favorite");

    return response.json();
};