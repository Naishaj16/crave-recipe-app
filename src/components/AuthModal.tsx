import { useState } from "react";
import {
  loginUser,
  signupUser,
  googleLoginUser,
  forgotPassword,
  resetPassword,
} from "../services/authService";
import { signInWithGooglePopup, isFirebaseConfigured, formatFirebaseAuthError } from "../services/firebase";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
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
        onClose();
      } else if (mode === "login") {
        const data = await loginUser(email, password);
        login(data.user, data.token);
        onClose();
      } else if (mode === "forgot") {
        const res = await forgotPassword(email);
        setSuccessMsg(res.message || "Reset token generated. Enter token to create new password.");
        if (res.resetToken) setResetToken(res.resetToken);
        setMode("reset");
      } else if (mode === "reset") {
        const res = await resetPassword(resetToken, newPassword);
        setSuccessMsg(res.message || "Password updated. You can now sign in.");
        setMode("login");
        setPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccessMsg("");

    if (!isFirebaseConfigured()) {
      setError(
        "Firebase Google Authentication is not configured yet. Please configure VITE_FIREBASE_API_KEY in your .env file."
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const googleUser = await signInWithGooglePopup();
      const data = await googleLoginUser(googleUser);
      login(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="Close modal">
          ×
        </button>

        <div className="auth-header">
          <span className="auth-brand">crave.</span>
          <h2>
            {mode === "login" && "Welcome back"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && "Recover your password"}
            {mode === "reset" && "Set new password"}
          </h2>
          <p>
            {mode === "login" && "Log in to continue exploring culinary recipes."}
            {mode === "signup" && "Join Crave and start curating your cookbook."}
            {mode === "forgot" && "Enter your email to receive recovery instructions."}
            {mode === "reset" && "Enter your reset token and new password."}
          </p>
        </div>

        {error && (
          <div className="login-error-alert" role="alert">
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="login-success-alert" role="status">
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="modal-name">Full Name</label>
              <input
                id="modal-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          {(mode === "login" || mode === "signup" || mode === "forgot") && (
            <div className="auth-field">
              <label htmlFor="modal-email">Email Address</label>
              <input
                id="modal-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          )}

          {(mode === "login" || mode === "signup") && (
            <div className="auth-field">
              <div className="label-with-action">
                <label htmlFor="modal-password">Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="link-button sub-action"
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
                  id="modal-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
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
              <div className="auth-field">
                <label htmlFor="modal-reset-token">Reset Token</label>
                <input
                  id="modal-reset-token"
                  type="text"
                  placeholder="Enter token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="modal-new-password">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="modal-new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
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
            className="auth-submit-btn"
            disabled={loading || googleLoading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Sign In"
              : mode === "signup"
              ? "Create Account"
              : mode === "forgot"
              ? "Send Recovery Token"
              : "Update Password"}
          </button>

          {(mode === "forgot" || mode === "reset") && (
            <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
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

        {mode === "login" && (
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
          </>
        )}

        <div className="auth-toggle">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setSuccessMsg("");
                }}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccessMsg("");
                }}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
