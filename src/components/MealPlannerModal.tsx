import { useState, useEffect } from "react";
import type { MealPlanItem } from "../services/plannerService";
import { getMealPlans, addMealPlan, deleteMealPlan } from "../services/plannerService";
import type { Recipe } from "../services/recipeService";

interface MealPlannerModalProps {
  onClose: () => void;
  recipes: Recipe[];
  onSelectRecipe: (id: number) => void;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];

export default function MealPlannerModal({
  onClose,
  recipes,
  onSelectRecipe,
}: MealPlannerModalProps) {
  const [plans, setPlans] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetMealType, setTargetMealType] = useState("Dinner");
  const [targetRecipeId, setTargetRecipeId] = useState<number>(recipes[0]?.id || 0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await getMealPlans();
      setPlans(data);
    } catch (err) {
      console.error("Failed to load meal plans:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMealPlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Failed to delete meal plan item");
    }
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRecipeId) return;

    setSubmitting(true);
    try {
      const created = await addMealPlan({
        day_of_week: selectedDay,
        meal_type: targetMealType,
        recipe_id: targetRecipeId,
        notes: notes.trim(),
      });
      setPlans((prev) => [...prev, created]);
      setShowAddForm(false);
      setNotes("");
    } catch (err) {
      alert("Failed to add meal to planner");
    } finally {
      setSubmitting(false);
    }
  };

  const currentDayPlans = plans.filter((p) => p.day_of_week === selectedDay);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="planner-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header-row">
          <div>
            <span className="eyebrow">WEEKLY SCHEDULE</span>
            <h2>Meal Planner</h2>
            <p>Plan your daily culinary lineup and track weekly nutrition.</p>
          </div>
          <button className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Days of week selector tabs */}
        <div className="planner-days-nav">
          {DAYS_OF_WEEK.map((day) => {
            const count = plans.filter((p) => p.day_of_week === day).length;
            return (
              <button
                key={day}
                type="button"
                className={`day-tab ${selectedDay === day ? "active" : ""}`}
                onClick={() => {
                  setSelectedDay(day);
                  setShowAddForm(false);
                }}
              >
                <span className="day-name">{day.slice(0, 3)}</span>
                {count > 0 && <span className="day-badge">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="planner-day-header">
          <h3>{selectedDay}'s Menu</h3>
          <button
            type="button"
            className="secondary-action-btn small"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "+ Add Meal to " + selectedDay}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddMeal} className="planner-add-card">
            <h4>Schedule a Meal for {selectedDay}</h4>
            <div className="add-row">
              <div className="input-group">
                <label>Meal Type</label>
                <select
                  value={targetMealType}
                  onChange={(e) => setTargetMealType(e.target.value)}
                >
                  {MEAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Select Recipe</label>
                <select
                  value={targetRecipeId}
                  onChange={(e) => setTargetRecipeId(Number(e.target.value))}
                >
                  {recipes
                    .filter((r) => !r.isDeleted)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.category})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Notes (optional)</label>
              <input
                type="text"
                placeholder="e.g. Prep chicken night before"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="primary-action-btn small"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Add to Schedule"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="empty-state">
            <p>Loading meal schedule...</p>
          </div>
        ) : (
          <div className="planner-meals-grid">
            {MEAL_TYPES.map((type) => {
              const meal = currentDayPlans.find((p) => p.meal_type === type);
              return (
                <div key={type} className="planner-meal-slot">
                  <div className="slot-header">
                    <span className="slot-type-label">{type}</span>
                    {!meal && (
                      <button
                        type="button"
                        className="slot-quick-add"
                        onClick={() => {
                          setTargetMealType(type);
                          setShowAddForm(true);
                        }}
                      >
                        + Plan
                      </button>
                    )}
                  </div>

                  {meal ? (
                    <div className="meal-card-item">
                      {meal.recipe_image && (
                        <img
                          src={meal.recipe_image}
                          alt={meal.recipe_name || "Meal"}
                          className="meal-thumb"
                        />
                      )}
                      <div className="meal-details">
                        <strong
                          className="meal-name-link"
                          onClick={() => {
                            onClose();
                            onSelectRecipe(meal.recipe_id);
                          }}
                        >
                          {meal.recipe_name}
                        </strong>
                        <div className="meal-meta-row">
                          {meal.calories && <span>{meal.calories} kcal</span>}
                          {meal.time_minutes && <span>{meal.time_minutes} min</span>}
                          {meal.difficulty && <span>{meal.difficulty}</span>}
                        </div>
                        {meal.notes && <p className="meal-notes-text">"{meal.notes}"</p>}
                      </div>
                      <button
                        type="button"
                        className="slot-delete-btn"
                        onClick={() => handleDelete(meal.id)}
                        title="Remove from schedule"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="empty-slot-placeholder">
                      <span>No meal scheduled</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
