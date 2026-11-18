export interface Recipe {
    id: string;
    title: string;
    description: string;
    image: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    difficulty: "Easy" | "Medium" | "Hard";
    ingredients: string[];
    instructions: string[];
    category: string;
    cuisine: string;
    isVegetarian: boolean;
    videoUrl?: string;
    rating: number;
}