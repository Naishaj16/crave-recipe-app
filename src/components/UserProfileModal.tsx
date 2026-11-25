import { useState, useEffect } from "react";
import type { UserProfile } from "../services/profileService";
import { getProfile, updateProfile } from "../services/profileService";
import type { Recipe } from "../services/recipeService";

interface UserProfileModalProps {
  onClose: () => void;
  onSelectRecipe: (id: number) => void;
  onEditRecipe: (recipe: Recipe) => void;
}

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Nut-Free",
  "Low Carb",
  "Halal",
];

export default function UserProfileModal({
  onClose,
  onSelectRecipe,
  onEditRecipe,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
      setName(data.name || "");
      setBio(data.bio || "");
      setDietaryPrefs(data.dietary_preferences || []);
    } catch (err) {
      console.error("Failed to load user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDietaryPref = (pref: string) => {
    setDietaryPrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setStatusMsg("");
    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        dietary_preferences: dietaryPrefs,
      });
      setStatusMsg("Profile updated successfully!");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header-row">
          <div>
            <span className="eyebrow">CHEF ACCOUNT</span>
            <h2>Kitchen Profile</h2>
            <p>Manage your culinary identity, dietary preferences, and published creations.</p>
          </div>
          <button className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading profile...</p>
          </div>
        ) : profile ? (
          <div className="profile-content-body">
            {/* User Meta Card */}
            <div className="profile-card-header">
              <div className="profile-avatar-circle">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="profile-meta-details">
                <h3>{profile.name}</h3>
                <span className="profile-email-text">{profile.email}</span>
                <div className="profile-role-row">
                  <span className={`role-badge ${profile.role === "admin" ? "admin" : ""}`}>
                    {profile.role === "admin" ? "Sole Administrator" : "Verified Chef"}
                  </span>
                  <span className="status-badge-active">Active</span>
                </div>
              </div>
              <div className="profile-stats-box">
                <div className="p-stat">
                  <strong>{profile.createdRecipesCount || 0}</strong>
                  <span>Created</span>
                </div>
                <div className="p-stat">
                  <strong>{profile.favoritesCount || 0}</strong>
                  <span>Favorites</span>
                </div>
              </div>
            </div>

            {statusMsg && <div className="login-success-alert">{statusMsg}</div>}

            {/* Profile Form */}
            <form onSubmit={handleSave} className="profile-edit-form">
              <div className="input-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Culinary Bio</label>
                <textarea
                  placeholder="Share a short bio about your cooking passions..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="input-group">
                <label>Dietary Preferences</label>
                <p className="field-hint">
                  Select preferences to personalize recipe recommendations.
                </p>
                <div className="dietary-chips-group">
                  {DIETARY_OPTIONS.map((opt) => {
                    const isSelected = dietaryPrefs.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`dietary-chip-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleDietaryPref(opt)}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="primary-action-btn small"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Profile Changes"}
              </button>
            </form>

            {/* User's Created Recipes Section */}
            <div className="profile-recipes-section">
              <div className="section-header-mini">
                <h4>My Published Recipes ({profile.recipes?.length || 0})</h4>
              </div>
              {profile.recipes && profile.recipes.length > 0 ? (
                <div className="profile-recipe-list">
                  {profile.recipes.map((r: any) => (
                    <div key={r.id} className="profile-recipe-item">
                      <div
                        className="r-info-clickable"
                        onClick={() => {
                          onClose();
                          onSelectRecipe(r.id);
                        }}
                      >
                        {r.image && (
                          <img src={r.image} alt={r.name} className="mini-recipe-thumb" />
                        )}
                        <div>
                          <strong>{r.name}</strong>
                          <span className="r-cat">{r.category} • {r.time_minutes} min</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="secondary-action-btn small"
                        onClick={() => {
                          onClose();
                          onEditRecipe(r);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-recipes-text">
                  You haven't published any recipes yet. Click "+ Add Recipe" on the dashboard to share your dishes!
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>User profile could not be loaded.</p>
          </div>
        )}
      </div>
    </div>
  );
}
