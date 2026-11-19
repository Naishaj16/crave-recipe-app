const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export interface Recipe {
    id: number;
    name: string;
    description: string;
    category: string;
    time_minutes: number;
    rating: number;
    image: string;
    ingredients: string[];
    instructions: string[];
    is_deleted?: boolean;
}

// GET all recipes
export const getRecipes = async (): Promise<Recipe[]> => {
    const response = await fetch(`${API_URL}/recipes`);

    if (!response.ok) {
        throw new Error("Failed to fetch recipes");
    }

    const data = await response.json();
    return data.recipes;
};

// POST create recipe
export const createRecipe = async (recipe: Omit<Recipe, "id">) => {
    const response = await fetch(`${API_URL}/recipes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(recipe),
    });

    if (!response.ok) {
        throw new Error("Failed to create recipe");
    }

    return response.json();
};

// PUT update recipe
export const updateRecipe = async (id: number, recipe: Omit<Recipe, "id">) => {
    const response = await fetch(`${API_URL}/recipes/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(recipe),
    });

    if (!response.ok) {
        throw new Error("Failed to update recipe");
    }

    return response.json();
};

// DELETE recipe (soft delete)
export const deleteRecipe = async (id: number) => {
    const response = await fetch(`${API_URL}/recipes/${id}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("Failed to delete recipe");
    }

    return response.json();
};