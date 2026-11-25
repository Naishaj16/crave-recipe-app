import { useState } from "react";
import { loginUser, signupUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";

interface LoginDashboardProps {
  onGuestContinue?: () => void;
  onAdminNavigate?: () => void;
}

export default function LoginDashboard({
  onGuestContinue,
  onAdminNavigate,
}: LoginDashboardProps) {
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await signupUser(name, email, password);
      }
      const data = await loginUser(email, password);
      login(data.user, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-dashboard-page">
      <div className="login-dashboard-container">
        {/* Left Side: Brand Story & Feature Preview */}
        <div className="login-dashboard-hero">
          <div className="login-brand-badge">
            crave recipe studio
          </div>
          <h1>
            Your kitchen,
            <br />
            <span>elevated daily.</span>
          </h1>
          <p>
            Welcome to Crave. Sign in to your kitchen dashboard to explore
            curated recipes, save favorites, follow step-by-step video
            tutorials, and publish your own culinary creations.
          </p>

          <div className="login-feature-list">
            <div className="feature-item">
              <span className="feature-bullet">•</span>
              <div>
                <strong>Personal Cookbook</strong>
                <p>Save and organize your favorite recipes and custom creations.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-bullet">•</span>
              <div>
                <strong>Integrated Video Guides</strong>
                <p>Watch step-by-step tutorials from Instagram Reels, YouTube, and direct videos.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-bullet">•</span>
              <div>
                <strong>Optimized Media Uploads</strong>
                <p>Add photos and cooking videos from your gallery with fast client-side optimization.</p>
              </div>
            </div>
          </div>

          <div className="login-hero-footer">
            <span className="secure-badge">Curated culinary studio</span>
          </div>
        </div>

        {/* Right Side: Authentication Card */}
        <div className="login-dashboard-card">
          <div className="card-top-nav">
            <button
              type="button"
              className={`mode-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`mode-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create Account
            </button>
          </div>

          <div className="card-header-text">
            <h2>{mode === "login" ? "Welcome back" : "Create your kitchen"}</h2>
            <p>
              {mode === "login"
                ? "Enter your credentials to enter your recipe dashboard."
                : "Join Crave to start saving and creating delicious meals."}
            </p>
          </div>

          {error && <div className="login-error-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="login-dashboard-form">
            {mode === "signup" && (
              <div className="input-group">
                <label htmlFor="signup-name">Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="e.g. Alex Chef"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="input-group">
              <label htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder={mode === "signup" ? "At least 8 characters" : "Enter password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          {/* Guest Explorer Option */}
          {onGuestContinue && (
            <div className="guest-fallback-row">
              <button
                type="button"
                className="guest-link-btn"
                onClick={onGuestContinue}
              >
                Browse recipes as guest
              </button>
            </div>
          )}

          {onAdminNavigate && (
            <div className="admin-shortcut-link">
              <button
                type="button"
                className="admin-link-btn"
                onClick={onAdminNavigate}
              >
                Administrator sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
