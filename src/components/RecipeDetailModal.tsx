import { useState, useEffect } from "react";
import type { Recipe, Review } from "../services/recipeService";
import { getRecipeReviews, addRecipeReview, deleteRecipeReview } from "../services/recipeService";
import { addIngredientsFromRecipe, addMealPlan } from "../services/plannerService";
import VideoPlayer from "./VideoPlayer";

interface RecipeDetailModalProps {
  recipe: Recipe;
  isFavorite: boolean;
  canModify: boolean;
  currentUserId?: number | null;
  isAdmin?: boolean;
  onClose: () => void;
  onToggleFavorite: (id: number) => void;
  onEdit: (recipe: Recipe) => void;
  onOpenShoppingList?: () => void;
  onOpenMealPlanner?: () => void;
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export default function RecipeDetailModal({
  recipe,
  isFavorite,
  canModify,
  currentUserId,
  isAdmin,
  onClose,
  onToggleFavorite,
  onEdit,
  onOpenShoppingList,
  onOpenMealPlanner,
}: RecipeDetailModalProps) {
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number>(parseFloat(recipe.rating || "0"));
  const [userRating, setUserRating] = useState<number>(5);
  const [commentText, setCommentText] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Toast / feedback states
  const [toastMessage, setToastMessage] = useState("");

  // Meal Planner quick add state
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [planDay, setPlanDay] = useState("Monday");
  const [planType, setPlanType] = useState("Dinner");
  const [planningSaving, setPlanningSaving] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [recipe.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const loadReviews = async () => {
    try {
      setLoadingReviews(true);
      const res = await getRecipeReviews(recipe.id);
      setReviews(res.reviews);
      setAvgRating(res.averageRating);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      alert("Please sign in to rate and review recipes.");
      return;
    }

    setSubmittingReview(true);
    setReviewError("");
    try {
      const res = await addRecipeReview(recipe.id, userRating, commentText.trim());
      setReviews((prev) => [res.review, ...prev]);
      setAvgRating(res.newAverageRating);
      setCommentText("");
      showToast("Review submitted successfully!");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to post review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      const res = await deleteRecipeReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setAvgRating(res.newAverageRating);
      showToast("Review deleted");
    } catch (err) {
      alert("Failed to delete review");
    }
  };

  // Add all ingredients to shopping list (Feature 15)
  const handleAddAllToShoppingList = async () => {
    if (!currentUserId) {
      alert("Please sign in to manage your shopping list.");
      return;
    }

    try {
      await addIngredientsFromRecipe(recipe.id);
      showToast("All ingredients added to your shopping list!");
      if (onOpenShoppingList) {
        setTimeout(onOpenShoppingList, 800);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add ingredients");
    }
  };

  // Add to Meal Plan (Feature 14)
  const handleAddToMealPlan = async () => {
    if (!currentUserId) {
      alert("Please sign in to plan meals.");
      return;
    }

    setPlanningSaving(true);
    try {
      await addMealPlan({
        day_of_week: planDay,
        meal_type: planType,
        recipe_id: recipe.id,
      });
      setShowPlanDropdown(false);
      showToast(`Added to ${planDay}'s ${planType}!`);
      if (onOpenMealPlanner) {
        setTimeout(onOpenMealPlanner, 800);
      }
    } catch (err) {
      alert("Failed to add meal plan");
    } finally {
      setPlanningSaving(false);
    }
  };

  // Social Sharing (Feature 17)
  const recipeUrl = `${window.location.origin}/#recipe-${recipe.id}`;
  const shareTitle = `Check out this recipe for ${recipe.name} on Crave!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(recipeUrl);
      showToast("Recipe link copied to clipboard!");
    } catch {
      prompt("Copy recipe link:", recipeUrl);
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} ${recipeUrl}`)}`;
    window.open(url, "_blank");
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(recipeUrl)}`;
    window.open(url, "_blank");
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.name,
          text: recipe.description,
          url: recipeUrl,
        });
      } catch {
        // user cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recipe-modal detail-modal-enhanced" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose} aria-label="Close modal">
          ×
        </button>

        {toastMessage && <div className="floating-toast-alert">{toastMessage}</div>}

        <div className="modal-image-container">
          <img
            src={recipe.image?.trim() ? recipe.image : DEFAULT_IMAGE}
            alt={recipe.name}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== DEFAULT_IMAGE) target.src = DEFAULT_IMAGE;
            }}
          />
        </div>

        <div className="modal-content">
          {/* Header Meta */}
          <div className="recipe-tag-row">
            <span className="eyebrow">{recipe.category}</span>
            {recipe.difficulty && (
              <span className={`difficulty-badge ${recipe.difficulty.toLowerCase()}`}>
                {recipe.difficulty}
              </span>
            )}
            {recipe.dietaryTags && recipe.dietaryTags.map((tag) => (
              <span key={tag} className="dietary-badge">
                {tag}
              </span>
            ))}
          </div>

          <h2>{recipe.name}</h2>
          <p className="recipe-description-text">{recipe.description}</p>

          {/* Quick Metrics Bar (Prep, Cook, Servings, Rating) */}
          <div className="modal-meta-grid">
            <div className="metric-cell">
              <span className="m-label">Prep Time</span>
              <strong className="m-val">{recipe.prepTimeMinutes || 15} min</strong>
            </div>
            <div className="metric-cell">
              <span className="m-label">Cook Time</span>
              <strong className="m-val">{recipe.time}</strong>
            </div>
            <div className="metric-cell">
              <span className="m-label">Servings</span>
              <strong className="m-val">{recipe.servings || 2} people</strong>
            </div>
            <div className="metric-cell">
              <span className="m-label">Rating</span>
              <strong className="m-val">
                {avgRating > 0 ? `${avgRating.toFixed(1)} / 5 (${reviews.length})` : "No ratings yet"}
              </strong>
            </div>
          </div>

          {/* Action Toolbar: Favorite, Shopping List, Meal Planner, Share */}
          <div className="recipe-action-toolbar">
            <button
              type="button"
              className={`toolbar-btn ${isFavorite ? "active" : ""}`}
              onClick={() => onToggleFavorite(recipe.id)}
            >
              {isFavorite ? "Saved in Favorites" : "+ Save Favorite"}
            </button>

            <button
              type="button"
              className="toolbar-btn"
              onClick={handleAddAllToShoppingList}
              title="Add all ingredients to your shopping checklist"
            >
              + Add to Shopping List
            </button>

            <button
              type="button"
              className="toolbar-btn"
              onClick={() => setShowPlanDropdown(!showPlanDropdown)}
              title="Schedule this recipe in weekly meal planner"
            >
              Plan Meal
            </button>

            {canModify && (
              <button
                type="button"
                className="toolbar-btn edit"
                onClick={() => onEdit(recipe)}
              >
                Edit Recipe
              </button>
            )}
          </div>

          {/* Meal Planner Dropdown Panel */}
          {showPlanDropdown && (
            <div className="quick-plan-panel">
              <h4>Schedule in Weekly Planner</h4>
              <div className="quick-plan-selectors">
                <div>
                  <label>Day:</label>
                  <select value={planDay} onChange={(e) => setPlanDay(e.target.value)}>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Meal:</label>
                  <select value={planType} onChange={(e) => setPlanType(e.target.value)}>
                    {MEALS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="primary-action-btn small"
                  onClick={handleAddToMealPlan}
                  disabled={planningSaving}
                >
                  {planningSaving ? "Adding..." : "Confirm Schedule"}
                </button>
              </div>
            </div>
          )}

          {/* Nutritional Information (Feature 16) */}
          <div className="nutrition-facts-card">
            <h4>Nutritional Information (estimated per serving)</h4>
            <div className="nutrition-grid">
              <div className="nutri-item">
                <span className="n-num">{recipe.calories || 420}</span>
                <span className="n-unit">Calories</span>
              </div>
              <div className="nutri-item">
                <span className="n-num">{recipe.proteinG || 18}g</span>
                <span className="n-unit">Protein</span>
              </div>
              <div className="nutri-item">
                <span className="n-num">{recipe.carbsG || 45}g</span>
                <span className="n-unit">Carbohydrates</span>
              </div>
              <div className="nutri-item">
                <span className="n-num">{recipe.fatG || 14}g</span>
                <span className="n-unit">Fat</span>
              </div>
            </div>
          </div>

          {/* Ingredients & Instructions */}
          <div className="ingredients-instructions-block">
            <div className="ingredients-column">
              <div className="section-sub-header">
                <h3>Ingredients</h3>
                <span className="count-hint">{recipe.ingredients.length} items</span>
              </div>
              <ul className="modal-ingredients-list">
                {recipe.ingredients.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="instructions-column">
              <div className="section-sub-header">
                <h3>Step-by-Step Instructions</h3>
                <span className="count-hint">{recipe.instructions.length} steps</span>
              </div>
              <ol className="modal-instructions-list">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx}>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Video Guide (Feature 9) */}
          {recipe.videoUrl && (
            <div className="modal-video-section">
              <h3>Cooking Video Tutorial</h3>
              <VideoPlayer url={recipe.videoUrl} title={recipe.name} />
            </div>
          )}

          {/* Recipe Sharing Bar (Feature 17) */}
          <div className="recipe-share-bar">
            <span>Share this recipe:</span>
            <button type="button" className="share-pill-btn" onClick={handleCopyLink}>
              Copy Link
            </button>
            <button type="button" className="share-pill-btn" onClick={handleWhatsAppShare}>
              WhatsApp
            </button>
            <button type="button" className="share-pill-btn" onClick={handleTwitterShare}>
              X / Twitter
            </button>
            {"share" in navigator && (
              <button type="button" className="share-pill-btn" onClick={handleWebShare}>
                More Options...
              </button>
            )}
          </div>

          {/* Ratings, Reviews & Discussion Section (Features 11 & 12) */}
          <div className="recipe-reviews-section">
            <div className="reviews-header-row">
              <div>
                <h3>Ratings & Reviews</h3>
                <p>Share your cooking tips, substitutions, and experience.</p>
              </div>
              <div className="avg-rating-display">
                <span className="avg-num">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</span>
                <span className="avg-sub">/ 5.0</span>
              </div>
            </div>

            {/* Leave a review form */}
            {currentUserId ? (
              <form onSubmit={handlePostReview} className="add-review-form">
                {reviewError && <div className="login-error-alert">{reviewError}</div>}
                <div className="star-rating-selector">
                  <label>Your Rating:</label>
                  <div className="stars-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-select-btn ${star <= userRating ? "active" : ""}`}
                        onClick={() => setUserRating(star)}
                      >
                        ★
                      </button>
                    ))}
                    <span className="star-rating-text">{userRating} of 5 stars</span>
                  </div>
                </div>

                <textarea
                  placeholder="How did this recipe turn out? Share cooking thoughts, tips, or modifications..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  required
                />

                <button
                  type="submit"
                  className="primary-action-btn small"
                  disabled={submittingReview}
                >
                  {submittingReview ? "Posting..." : "Submit Review"}
                </button>
              </form>
            ) : (
              <div className="login-prompt-banner">
                <p>Sign in to your account to rate this recipe and post reviews.</p>
              </div>
            )}

            {/* Existing reviews list */}
            <div className="existing-reviews-list">
              {loadingReviews ? (
                <p className="loading-text">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <div className="empty-reviews-state">
                  <p>No reviews yet. Be the first chef to share your experience!</p>
                </div>
              ) : (
                reviews.map((r) => {
                  const canDeleteReview =
                    Boolean(isAdmin || (currentUserId && r.user_id === currentUserId));

                  return (
                    <div key={r.id} className="review-card-item">
                      <div className="review-card-top">
                        <div className="reviewer-info">
                          <strong>{r.user_name}</strong>
                          <span className="review-stars">
                            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                          </span>
                        </div>
                        {canDeleteReview && (
                          <button
                            type="button"
                            className="review-delete-btn"
                            onClick={() => handleDeleteReview(r.id)}
                            title="Delete review"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <p className="review-comment-text">{r.comment}</p>
                      <span className="review-date-text">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
