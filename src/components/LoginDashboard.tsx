import { useState } from "react";
import {
  loginUser,
  signupUser,
  googleLoginUser,
  forgotPassword,
  resetPassword,
} from "../services/authService";
import {
  signInWithGooglePopup,
  isFirebaseConfigured,
  formatFirebaseAuthError,
} from "../services/firebase";
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
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await signupUser(name, email, password);
        const data = await loginUser(email, password);
        login(data.user, data.token);
      } else if (mode === "login") {
        const data = await loginUser(email, password);
        login(data.user, data.token);
      } else if (mode === "forgot") {
        const res = await forgotPassword(email);
        setSuccessMsg(res.message || "Password recovery token generated. Check your email or use the token below.");
        if (res.resetToken) {
          setResetToken(res.resetToken);
        }
        setMode("reset");
      } else if (mode === "reset") {
        const res = await resetPassword(resetToken, newPassword);
        setSuccessMsg(res.message || "Password successfully updated. You can now sign in.");
        setMode("login");
        setPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccessMsg("");

    // Verify Firebase configuration before opening popup
    if (!isFirebaseConfigured()) {
      setError(
        "Firebase Google Authentication is not configured yet. Please configure your Firebase environment variables in the project's .env file (VITE_FIREBASE_API_KEY). Click 'View setup steps' below for a quick guide."
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const googleUser = await signInWithGooglePopup();
      const data = await googleLoginUser(googleUser);
      login(data.user, data.token);
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-dashboard-page">
      <div className="login-dashboard-container">
        {/* Left Side: Brand Story & Hero Preview */}
        <div className="login-dashboard-hero">
          <div className="login-brand-badge">
            <span className="brand-dot" />
            Crave Recipe Studio
          </div>

          <h1 className="hero-headline">
            Where every dish
            <br />
            <span>begins with craft.</span>
          </h1>

          <p className="hero-description">
            Welcome to Crave Recipe Studio. Sign in to explore curated dishes,
            follow step-by-step video guides, organize weekly meal plans, and
            publish your own culinary creations.
          </p>

          <div className="login-feature-list">
            <div className="feature-item">
              <div className="feature-icon-bullet" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div>
                <strong>Curated Culinary Library</strong>
                <p>Filter by cuisine, prep duration, difficulty, and nutritional targets.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-bullet" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div>
                <strong>Integrated Video Tutorials</strong>
                <p>Watch step-by-step guides from YouTube, Instagram Reels, Shorts, and MP4 uploads.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-bullet" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <strong>Smart Meal Planner & Shopping List</strong>
                <p>Plan weekly meals and auto-generate grocery checklists with 1-click recipe sync.</p>
              </div>
            </div>
          </div>

          <div className="login-hero-footer">
            <span className="secure-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Encrypted session security
            </span>
          </div>
        </div>

        {/* Right Side: Authentication Card */}
        <div className="login-dashboard-card">
          <div className="card-top-nav">
            <button
              type="button"
              className={`mode-tab ${mode === "login" || mode === "forgot" || mode === "reset" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
                setSuccessMsg("");
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
                setSuccessMsg("");
              }}
            >
              Create Account
            </button>
          </div>

          <div className="card-header-text">
            <h2>
              {mode === "login" && "Welcome back"}
              {mode === "signup" && "Create your kitchen"}
              {mode === "forgot" && "Reset your password"}
              {mode === "reset" && "Set new password"}
            </h2>
            <p>
              {mode === "login" && "Enter your credentials to enter your recipe dashboard."}
              {mode === "signup" && "Join Crave to start saving and creating delicious meals."}
              {mode === "forgot" && "Enter your registered email address to receive reset instructions."}
              {mode === "reset" && "Enter your verification token and your new password."}
            </p>
          </div>

          {error && (
            <div className="login-error-alert" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="login-success-alert" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

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
                  autoComplete="name"
                  required
                />
              </div>
            )}

            {(mode === "login" || mode === "signup" || mode === "forgot") && (
              <div className="input-group">
                <label htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            )}

            {(mode === "login" || mode === "signup") && (
              <div className="input-group">
                <div className="label-with-action">
                  <label htmlFor="login-password">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                        setSuccessMsg("");
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="password-input-wrapper">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Enter password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === "reset" && (
              <>
                <div className="input-group">
                  <label htmlFor="reset-token">Recovery Token</label>
                  <input
                    id="reset-token"
                    type="text"
                    placeholder="Paste your reset token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="new-password">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading || googleLoading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign In to Studio"
                : mode === "signup"
                ? "Create Chef Account"
                : mode === "forgot"
                ? "Send Reset Instructions"
                : "Save New Password"}
            </button>

            {(mode === "forgot" || mode === "reset") && (
              <div className="back-to-login-row">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setSuccessMsg("");
                  }}
                >
                  ← Return to Sign In
                </button>
              </div>
            )}
          </form>

          {/* Google Sign-In & Alternate Actions (Available on Sign In and Create Account) */}
          {(mode === "login" || mode === "signup") && (
            <>
              <div className="auth-divider">
                <span>or continue with</span>
              </div>

              <button
                type="button"
                className="google-auth-btn"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
              </button>

              {!isFirebaseConfigured() && (
                <div className="firebase-status-hint">
                  <span>Firebase Google Auth requires configuration in .env</span>
                  <button
                    type="button"
                    className="setup-guide-link-btn"
                    onClick={() => setShowFirebaseGuide(true)}
                  >
                    View setup steps
                  </button>
                </div>
              )}

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
                    Administrator access
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Firebase Setup Modal */}
      {showFirebaseGuide && (
        <div className="firebase-guide-overlay" onClick={() => setShowFirebaseGuide(false)}>
          <div className="firebase-guide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="firebase-guide-header">
              <div>
                <h3>Firebase Google Authentication Setup</h3>
                <p>Follow these 4 simple steps to connect Google Sign-In to Crave Recipe Studio.</p>
              </div>
              <button
                type="button"
                className="guide-close-btn"
                onClick={() => setShowFirebaseGuide(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="firebase-guide-body">
              <ol className="guide-steps">
                <li>
                  <strong>1. Open Google Firebase Console</strong>
                  <p>Visit <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">https://console.firebase.google.com/</a> and log in with your Google account.</p>
                </li>
                <li>
                  <strong>2. Create or Select a Project</strong>
                  <p>Click <em>Add project</em>, name it <code>crave-recipe-app</code>, and complete the quick wizard.</p>
                </li>
                <li>
                  <strong>3. Enable Google Sign-In & Authorized Domain</strong>
                  <p>In the sidebar, go to <strong>Build &gt; Authentication &gt; Sign-in method</strong>. Click <strong>Add new provider</strong>, choose <strong>Google</strong>, and enable it with your email.</p>
                  <p>Under the <strong>Settings &gt; Authorized domains</strong> tab, verify <code>localhost</code> is in the list.</p>
                </li>
                <li>
                  <strong>4. Copy Web App Keys to your <code>.env</code> file</strong>
                  <p>Go to <strong>Project Settings &gt; General</strong>, scroll down to <em>Your apps</em>, click the Web (<code>&lt;/&gt;</code>) icon, and paste the values into your root <code>.env</code> file:</p>
                  <pre className="env-code-preview">
{`VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=crave-recipe-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=crave-recipe-app
VITE_FIREBASE_STORAGE_BUCKET=crave-recipe-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=1:...:web:...`}
                  </pre>
                </li>
              </ol>

              <div className="guide-demo-creds">
                <strong>Testing without Firebase setup:</strong>
                <p>You can immediately log in using standard credentials:</p>
                <ul>
                  <li><strong>Admin Account:</strong> <code>naisha@test.com</code> / <code>password123</code> (Sole Administrator)</li>
                  <li><strong>Standard Chef:</strong> <code>user@test.com</code> / <code>password123</code> (User Role)</li>
                  <li>Or create any new chef account using the <strong>Create Account</strong> tab!</li>
                </ul>
              </div>
            </div>

            <div className="firebase-guide-footer">
              <button
                type="button"
                className="guide-primary-btn"
                onClick={() => setShowFirebaseGuide(false)}
              >
                Got it, return to login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
