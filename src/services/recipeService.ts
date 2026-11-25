const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export interface Recipe {
    id: number;
    name: string;
    description: string;
    category: string;
    time: string;
    timeMinutes?: number;
    prepTimeMinutes?: number;
    servings?: number;
    difficulty?: string;
    dietaryTags?: string[];
    calories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    rating?: string;
    image: string;
    ingredients: string[];
    instructions: string[];
    videoUrl?: string;
    isDeleted?: boolean;
    userId?: number | null;
}

export interface Review {
    id: number;
    recipe_id: number;
    user_id?: number | null;
    user_name: string;
    rating: number;
    comment: string;
    created_at: string;
}

export interface RecipeFilters {
    category?: string;
    difficulty?: string;
    maxTime?: number;
    dietary?: string;
    search?: string;
    ingredients?: string;
}

const formatRecipe = (recipe: any): Recipe => ({
    ...recipe,
    time: `${recipe.time_minutes || 0} min`,
    timeMinutes: recipe.time_minutes || 0,
    prepTimeMinutes: recipe.prep_time_minutes ?? 15,
    servings: recipe.servings ?? 2,
    difficulty: recipe.difficulty || "Medium",
    dietaryTags: Array.isArray(recipe.dietary_tags) ? recipe.dietary_tags : [],
    calories: recipe.calories ?? 420,
    proteinG: recipe.protein_g ?? 18,
    carbsG: recipe.carbs_g ?? 45,
    fatG: recipe.fat_g ?? 14,
    rating: String(recipe.rating ?? "0"),
    videoUrl: recipe.video_url || recipe.videoUrl || "",
    isDeleted: recipe.is_deleted ?? false,
    userId: recipe.user_id ?? recipe.userId ?? null,
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

// GET recipes with optional filters
export const getRecipes = async (filters?: RecipeFilters): Promise<Recipe[]> => {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== "All") params.append("category", filters.category);
    if (filters?.difficulty && filters.difficulty !== "All") params.append("difficulty", filters.difficulty);
    if (filters?.maxTime) params.append("maxTime", String(filters.maxTime));
    if (filters?.dietary && filters.dietary !== "All") params.append("dietary", filters.dietary);
    if (filters?.search?.trim()) params.append("search", filters.search.trim());
    if (filters?.ingredients?.trim()) params.append("ingredients", filters.ingredients.trim());

    const queryString = params.toString();
    const url = `${API_URL}/recipes${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch recipes");

    const data = await response.json();
    return data.recipes.map(formatRecipe);
};

// GET personalized recommendations (Feature 13)
export const getRecommendations = async (): Promise<Recipe[]> => {
    const response = await fetch(`${API_URL}/recipes/recommended`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.recommendations || []).map(formatRecipe);
};

// POST recipe
export const createRecipe = async (recipe: Partial<Recipe>) => {
    const response = await fetch(`${API_URL}/recipes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            name: recipe.name,
            description: recipe.description || "",
            category: recipe.category,
            time_minutes: recipe.time ? timeToMinutes(recipe.time) : (recipe.timeMinutes || 30),
            prep_time_minutes: recipe.prepTimeMinutes || 15,
            servings: recipe.servings || 2,
            difficulty: recipe.difficulty || "Medium",
            dietary_tags: recipe.dietaryTags || [],
            calories: recipe.calories || 420,
            protein_g: recipe.proteinG || 18,
            carbs_g: recipe.carbsG || 45,
            fat_g: recipe.fatG || 14,
            image: recipe.image || "",
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            video_url: recipe.videoUrl || "",
        }),
    });

    if (!response.ok) throw new Error("Failed to create recipe");
    const data = await response.json();
    return formatRecipe(data.recipe);
};

// PUT recipe
export const updateRecipe = async (id: number, recipe: Partial<Recipe>) => {
    const response = await fetch(`${API_URL}/recipes/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            name: recipe.name,
            description: recipe.description || "",
            category: recipe.category,
            time_minutes: recipe.time ? timeToMinutes(recipe.time) : (recipe.timeMinutes || 30),
            prep_time_minutes: recipe.prepTimeMinutes || 15,
            servings: recipe.servings || 2,
            difficulty: recipe.difficulty || "Medium",
            dietary_tags: recipe.dietaryTags || [],
            calories: recipe.calories || 420,
            protein_g: recipe.proteinG || 18,
            carbs_g: recipe.carbsG || 45,
            fat_g: recipe.fatG || 14,
            image: recipe.image || "",
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
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

// REVIEWS & RATINGS (Features 11 & 12)
export const getRecipeReviews = async (recipeId: number) => {
    const response = await fetch(`${API_URL}/recipes/${recipeId}/reviews`);
    if (!response.ok) throw new Error("Failed to fetch recipe reviews");
    const data = await response.json();
    return {
        reviews: data.reviews as Review[],
        averageRating: data.averageRating as number,
        reviewCount: data.reviewCount as number,
    };
};

export const addRecipeReview = async (recipeId: number, rating: number, comment: string) => {
    const response = await fetch(`${API_URL}/recipes/${recipeId}/reviews`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ rating, comment }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to post review");
    }

    return response.json();
};

export const deleteRecipeReview = async (reviewId: number) => {
    const response = await fetch(`${API_URL}/recipes/reviews/${reviewId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to delete review");
    return response.json();
};
