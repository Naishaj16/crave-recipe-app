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

export default function RecipeEditModal({
  recipe,
  onClose,
  onSave,
}: RecipeEditModalProps) {
  const [name, setName] = useState(recipe.name);
  const [description, setDescription] = useState(recipe.description || "");
  const [category, setCategory] = useState(recipe.category || "Healthy");
  const [time, setTime] = useState(recipe.time || "30 min");
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

  // Handle Photo selection from Gallery/Files
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageUploadStatus("Compressing and uploading photo...");
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

  // Handle Video selection from Gallery/Files
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

      const updatedPayload: Omit<Recipe, "id"> = {
        name: name.trim(),
        description: description.trim(),
        category,
        time: time.trim() || "30 min",
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
      if (
        msg.includes("Authentication required") ||
        msg.includes("Failed to update recipe")
      ) {
        setError("Please sign in to your kitchen account to save changes.");
      } else {
        setError(msg || "Failed to save changes. Please try again.");
      }
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
            <p>Modify ingredients, photo, cooking time, or video tutorial.</p>
          </div>

          {error && <div className="form-error-alert">{error}</div>}

          <form onSubmit={handleSave} className="edit-form">
            <div className="form-row">
              <div className="form-group flex-2">
                <label>Recipe Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Classic Tiramisu"
                  required
                />
              </div>

              <div className="form-group flex-1">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Italian">Italian</option>
                  <option value="Healthy">Healthy</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Quick Meals">Quick Meals</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Cook Time</label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g. 25 min"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief overview of flavors and technique..."
              />
            </div>

            {/* PHOTO UPLOAD & URL SECTION */}
            <div className="media-upload-section">
              <div className="media-section-header">
                <label>Recipe Photo</label>
                {imageUploadStatus && (
                  <span className="upload-status-hint">
                    {imageUploadStatus}
                  </span>
                )}
              </div>

              <div className="media-input-dual">
                <div className="file-upload-box">
                  <label
                    htmlFor="edit-photo-file"
                    className="file-upload-button"
                  >
                    Choose Photo from Gallery
                  </label>
                  <input
                    id="edit-photo-file"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: "none" }}
                  />
                  <span className="upload-subtext">
                    Auto-compressed for fast loading
                  </span>
                </div>

                <div className="url-input-box">
                  <span className="url-label">or paste URL:</span>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://images.unsplash.com/... or /uploads/..."
                  />
                </div>
              </div>

              {image && (
                <div className="media-preview-bar">
                  <img src={image} alt="Preview" className="media-mini-thumb" />
                  <span className="media-preview-text">
                    Current photo selected
                  </span>
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

            {/* VIDEO TUTORIAL SECTION */}
            <div className="media-upload-section">
              <div className="media-section-header">
                <label>Video Tutorial</label>
                {videoUploadStatus && (
                  <span className="upload-status-hint">
                    {videoUploadStatus}
                  </span>
                )}
              </div>

              <div className="media-input-dual">
                <div className="file-upload-box">
                  <label
                    htmlFor="edit-video-file"
                    className="file-upload-button"
                  >
                    Upload Video from Gallery
                  </label>
                  <input
                    id="edit-video-file"
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                    onChange={handleVideoUpload}
                    style={{ display: "none" }}
                  />
                  <span className="upload-subtext">
                    Supports MP4, MOV, WebM (up to 100MB)
                  </span>
                </div>

                <div className="url-input-box">
                  <span className="url-label">or paste video link:</span>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="YouTube, Shorts, Instagram Reel, TikTok, or MP4 URL"
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

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Ingredients (one per line)</label>
                <textarea
                  rows={5}
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  placeholder="2 cups rice&#10;4 cups water&#10;1 tsp salt&#10;1 tbsp olive oil"
                />
              </div>

              <div className="form-group flex-1">
                <label>Instructions (one per line)</label>
                <textarea
                  rows={5}
                  value={instructionsText}
                  onChange={(e) => setInstructionsText(e.target.value)}
                  placeholder="Rinse rice thoroughly&#10;Bring water to a boil&#10;Simmer covered for 18 minutes&#10;Fluff with fork and serve"
                />
              </div>
            </div>

            <div className="modal-actions-bar">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="modal-save-btn"
                disabled={isSaving}
              >
                {isSaving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

