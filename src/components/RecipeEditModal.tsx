import { useState } from "react";
import type { Recipe } from "../services/recipeService";
import { updateRecipe } from "../services/recipeService";
import { uploadMediaFile } from "../utils/mediaUtils";
import VideoPlayer from "./VideoPlayer";

interface RecipeEditModalProps {
  recipe: Recipe;
  onClose: () => void;
  onSave: (updated: Recipe) => void;
}

const CATEGORIES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Desserts",
  "Beverages",
  "Healthy",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const DIETARY_TAG_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Nut-Free",
];

export default function RecipeEditModal({
  recipe,
  onClose,
  onSave,
}: RecipeEditModalProps) {
  const [name, setName] = useState(recipe.name);
  const [description, setDescription] = useState(recipe.description || "");
  const [category, setCategory] = useState(recipe.category || "Healthy");
  const [time, setTime] = useState(recipe.time || "30 min");
  const [prepTime, setPrepTime] = useState(recipe.prepTimeMinutes || 15);
  const [servings, setServings] = useState(recipe.servings || 2);
  const [difficulty, setDifficulty] = useState(recipe.difficulty || "Medium");
  const [dietaryTags, setDietaryTags] = useState<string[]>(recipe.dietaryTags || []);
  const [calories, setCalories] = useState(recipe.calories || 420);
  const [proteinG, setProteinG] = useState(recipe.proteinG || 18);
  const [carbsG, setCarbsG] = useState(recipe.carbsG || 45);
  const [fatG, setFatG] = useState(recipe.fatG || 14);

  const [image, setImage] = useState(recipe.image || "");
  const [videoUrl, setVideoUrl] = useState(recipe.videoUrl || "");
  const [ingredientsText, setIngredientsText] = useState(
    Array.isArray(recipe.ingredients) ? recipe.ingredients.join("\n") : ""
  );
  const [instructionsText, setInstructionsText] = useState(
    Array.isArray(recipe.instructions) ? recipe.instructions.join("\n") : ""
  );

  // Upload status & loading
  const [imageUploadStatus, setImageUploadStatus] = useState("");
  const [videoUploadStatus, setVideoUploadStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleDietaryTag = (tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageUploadStatus("Compressing photo...");
      const uploadedUrl = await uploadMediaFile(file, (msg) =>
        setImageUploadStatus(msg)
      );
      setImage(uploadedUrl);
      setImageUploadStatus("Photo uploaded successfully!");
      setTimeout(() => setImageUploadStatus(""), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload photo");
      setImageUploadStatus("");
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setVideoUploadStatus("Uploading video from gallery...");
      const uploadedUrl = await uploadMediaFile(file, (msg) =>
        setVideoUploadStatus(msg)
      );
      setVideoUrl(uploadedUrl);
      setVideoUploadStatus("Video uploaded successfully!");
      setTimeout(() => setVideoUploadStatus(""), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload video");
      setVideoUploadStatus("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Recipe title is required");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const ingredients = ingredientsText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const instructions = instructionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const updatedPayload: Partial<Recipe> = {
        name: name.trim(),
        description: description.trim(),
        category,
        time: time.trim() || "30 min",
        prepTimeMinutes: Number(prepTime),
        servings: Number(servings),
        difficulty,
        dietaryTags,
        calories: Number(calories),
        proteinG: Number(proteinG),
        carbsG: Number(carbsG),
        fatG: Number(fatG),
        image: image.trim(),
        videoUrl: videoUrl.trim(),
        ingredients,
        instructions,
        isDeleted: false,
      };

      const saved = await updateRecipe(recipe.id, updatedPayload);
      onSave(saved);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="recipe-modal edit-recipe-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-modal" onClick={onClose}>
          ×
        </button>

        <div className="modal-content">
          <div className="modal-title-area">
            <span className="eyebrow">RECIPE STUDIO</span>
            <h2>Edit Recipe</h2>
            <p>Modify ingredients, photo, cooking time, nutrition, or video tutorial.</p>
          </div>

          {error && <div className="login-error-alert">{error}</div>}

          <form onSubmit={handleSave} className="edit-recipe-form">
            <div className="input-group">
              <label>Recipe Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="add-row">
              <div className="input-group">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Cook Time</label>
                <input
                  type="text"
                  placeholder="e.g. 30 min"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Prep Time (min)</label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                />
              </div>

              <div className="input-group">
                <label>Servings</label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Dietary Tags */}
            <div className="input-group">
              <label>Dietary Tags</label>
              <div className="dietary-chips-group">
                {DIETARY_TAG_OPTIONS.map((tag) => {
                  const sel = dietaryTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`dietary-chip-btn ${sel ? "selected" : ""}`}
                      onClick={() => toggleDietaryTag(tag)}
                    >
                      {sel ? "✓ " : "+ "}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nutrition Facts */}
            <div className="nutrition-inputs-row">
              <div className="input-group">
                <label>Calories (kcal)</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label>Protein (g)</label>
                <input
                  type="number"
                  value={proteinG}
                  onChange={(e) => setProteinG(Number(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label>Carbs (g)</label>
                <input
                  type="number"
                  value={carbsG}
                  onChange={(e) => setCarbsG(Number(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label>Fat (g)</label>
                <input
                  type="number"
                  value={fatG}
                  onChange={(e) => setFatG(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Photo Upload & URL */}
            <div className="add-media-block">
              <div className="media-section-header">
                <label>Recipe Photo</label>
                {imageUploadStatus && (
                  <span className="upload-status-hint">{imageUploadStatus}</span>
                )}
              </div>
              <div className="media-input-dual">
                <div className="file-upload-box">
                  <label htmlFor="edit-photo-file" className="file-upload-button">
                    Choose Photo from Gallery
                  </label>
                  <input
                    id="edit-photo-file"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: "none" }}
                  />
                  <span className="upload-subtext">Auto-compressed</span>
                </div>
                <div className="url-input-box">
                  <span className="url-label">or paste URL:</span>
                  <input
                    placeholder="Image URL"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                  />
                </div>
              </div>
              {image && (
                <div className="media-preview-bar">
                  <img src={image} alt="Preview" className="media-mini-thumb" />
                  <span className="media-preview-text">Photo attached</span>
                  <button
                    type="button"
                    className="media-clear-btn"
                    onClick={() => setImage("")}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Video Tutorial */}
            <div className="add-media-block">
              <div className="media-section-header">
                <label>Video Tutorial</label>
                {videoUploadStatus && (
                  <span className="upload-status-hint">{videoUploadStatus}</span>
                )}
              </div>
              <div className="media-input-dual">
                <div className="file-upload-box">
                  <label htmlFor="edit-video-file" className="file-upload-button">
                    Upload Video from Gallery
                  </label>
                  <input
                    id="edit-video-file"
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                    onChange={handleVideoUpload}
                    style={{ display: "none" }}
                  />
                  <span className="upload-subtext">MP4, MOV, WebM</span>
                </div>
                <div className="url-input-box">
                  <span className="url-label">or paste link:</span>
                  <input
                    placeholder="YouTube, Shorts, Reel, TikTok link"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </div>
              </div>
              {videoUrl && (
                <div className="video-preview-wrapper">
                  <div className="video-preview-header">
                    <span>Live Video Preview</span>
                    <button
                      type="button"
                      className="media-clear-btn"
                      onClick={() => setVideoUrl("")}
                    >
                      Remove Video
                    </button>
                  </div>
                  <VideoPlayer url={videoUrl} title={name} />
                </div>
              )}
            </div>

            <div className="input-group">
              <label>Ingredients (one per line or comma-separated)</label>
              <textarea
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="input-group">
              <label>Step-by-Step Instructions (one per line)</label>
              <textarea
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="modal-actions-container">
              <button
                type="submit"
                className="primary-action-btn"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Recipe Changes"}
              </button>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
