import { useState } from "react";
import {
  loginUser,
  signupUser,
  googleLoginUser,
  forgotPassword,
  resetPassword,
  verify2FA,
  resend2FA,
} from "../services/authService";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { login } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset" | "2fa">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [demo2FACode, setDemo2FACode] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

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
        if (data.requires2FA) {
          setTwoFactorToken(data.tempToken);
          setDemo2FACode(data.demoCode || "");
          if (data.demoCode) {
            setTwoFactorCode(data.demoCode);
          }
          setSuccessMsg(
            data.demoCode
              ? `Two-Factor Authentication is active. Security code: ${data.demoCode}`
              : "Two-Factor Authentication is active. Enter your 6-digit verification code."
          );
          setMode("2fa");
        } else {
          login(data.user, data.token);
          onClose();
        }
      } else if (mode === "2fa") {
        const data = await verify2FA(twoFactorToken, twoFactorCode);
        login(data.user, data.token);
        onClose();
      } else if (mode === "forgot") {
        const res = await forgotPassword(email);
        if (res.resetToken) setResetToken(res.resetToken);
        setSuccessMsg(
          res.resetToken
            ? `Password recovery code generated: ${res.resetToken}. Enter your code and choose a new password.`
            : res.message || "Reset token generated. Enter token to create new password."
        );
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

  const handleResend2FA = async () => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await resend2FA(twoFactorToken);
      setDemo2FACode(res.demoCode || "");
      if (res.demoCode) setTwoFactorCode(res.demoCode);
      setSuccessMsg(`Fresh verification code: ${res.demoCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  const handleGoogleSignIn = () => {
    setError("");
    setSuccessMsg("");
    setShowGoogleChooser(true);
  };

  const handleSelectGoogleAccount = async (account: { email: string; name: string }) => {
    setGoogleLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const data = await googleLoginUser(account);
      if (data.requires2FA) {
        setTwoFactorToken(data.tempToken);
        setDemo2FACode(data.demoCode || "");
        if (data.demoCode) {
          setTwoFactorCode(data.demoCode);
        }
        setSuccessMsg(
          data.demoCode
            ? `Two-Factor Authentication is active. Security code: ${data.demoCode}`
            : "Two-Factor Authentication is active. Enter the 6-digit verification code."
        );
        setMode("2fa");
        setShowGoogleChooser(false);
      } else {
        login(data.user, data.token);
        setShowGoogleChooser(false);
        onClose();
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Google authentication failed");
      setShowGoogleChooser(false);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) return;
    const nameToUse = customGoogleName.trim() || customGoogleEmail.split("@")[0] || "Chef";
    handleSelectGoogleAccount({
      email: customGoogleEmail.trim().toLowerCase(),
      name: nameToUse,
    });
  };

  return (
    <>
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
              {mode === "2fa" && "Two-Factor Verification"}
            </h2>
            <p>
              {mode === "login" && "Log in to continue exploring culinary recipes."}
              {mode === "signup" && "Join Crave and start curating your cookbook."}
              {mode === "forgot" && "Enter your email to receive your 6-digit recovery code."}
              {mode === "reset" && "Enter your 6-digit recovery code and new password."}
              {mode === "2fa" && "Two-Factor Authentication is active. Enter your 6-digit code."}
            </p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-success" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* 2FA Pin Callout */}
          {mode === "2fa" && demo2FACode && (
            <div className="security-code-banner">
              <div className="security-code-row">
                <span>Security Code:</span>
                <span className="security-code-chip">{demo2FACode}</span>
              </div>
              <span style={{ fontSize: "11px", color: "#2d6a4f" }}>Pre-filled below (valid for 10 minutes).</span>
            </div>
          )}

          {/* Reset Code Callout */}
          {mode === "reset" && resetToken && (
            <div className="security-code-banner">
              <div className="security-code-row">
                <span>Recovery Code:</span>
                <span className="security-code-chip">{resetToken}</span>
              </div>
              <span style={{ fontSize: "11px", color: "#2d6a4f" }}>Pre-filled below for easy verification.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "signup" && (
              <div className="auth-field">
                <label htmlFor="auth-modal-name">Full Name</label>
                <input
                  id="auth-modal-name"
                  type="text"
                  placeholder="Alex Chef"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            {(mode === "login" || mode === "signup" || mode === "forgot") && (
              <div className="auth-field">
                <label htmlFor="auth-modal-email">Email Address</label>
                <input
                  id="auth-modal-email"
                  type="email"
                  placeholder="chef@craverecipes.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            )}

            {(mode === "login" || mode === "signup") && (
              <div className="auth-field">
                <div className="field-header">
                  <label htmlFor="auth-modal-password">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="forgot-link"
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
                <div className="password-wrapper">
                  <input
                    id="auth-modal-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
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

            {mode === "2fa" && (
              <div className="auth-field">
                <label htmlFor="auth-modal-2fa">6-Digit Verification Code</label>
                <input
                  id="auth-modal-2fa"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="two-factor-code-input"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  required
                />
                <div className="resend-row">
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={handleResend2FA}
                  >
                    Resend new code
                  </button>
                </div>
              </div>
            )}

            {mode === "reset" && (
              <>
                <div className="auth-field">
                  <label htmlFor="auth-modal-token">6-Digit Recovery Code</label>
                  <input
                    id="auth-modal-token"
                    type="text"
                    placeholder="Enter code"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="auth-modal-new-password">New Password</label>
                  <div className="password-wrapper">
                    <input
                      id="auth-modal-new-password"
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
              className="auth-submit"
              disabled={loading || googleLoading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : mode === "signup"
                    ? "Create Account"
                    : mode === "forgot"
                      ? "Send Reset Code"
                      : mode === "reset"
                        ? "Save New Password"
                        : "Verify & Enter Studio"}
            </button>

            {(mode === "forgot" || mode === "reset" || mode === "2fa") && (
              <div className="auth-back">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setSuccessMsg("");
                  }}
                >
                  ← Back to sign in
                </button>
              </div>
            )}
          </form>

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

      {/* Google Account Chooser Modal */}
      {showGoogleChooser && (
        <div className="google-chooser-overlay" onClick={() => setShowGoogleChooser(false)}>
          <div className="google-chooser-modal" onClick={(e) => e.stopPropagation()}>
            <div className="google-chooser-header">
              <button
                type="button"
                className="google-chooser-close"
                onClick={() => setShowGoogleChooser(false)}
                aria-label="Close"
              >
                ✕
              </button>
              <div className="google-modal-logo">
                <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
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
              </div>
              <h3>Choose an account</h3>
              <p>to continue to Crave Recipe Studio</p>
            </div>

            <div className="google-accounts-list">
              {/* Account 1: Naisha Jain (Sole Administrator) */}
              <button
                type="button"
                className="google-account-option"
                onClick={() =>
                  handleSelectGoogleAccount({
                    name: "Naisha Jain",
                    email: "naishajain982@gmail.com",
                  })
                }
              >
                <div className="google-avatar avatar-naisha">N</div>
                <div className="google-account-info">
                  <div className="account-name">
                    Naisha Jain
                    <span className="account-badge badge-admin">Admin</span>
                  </div>
                  <div className="account-email">naishajain982@gmail.com</div>
                </div>
              </button>

              {/* Account 2: Alex Chef (Community Member) */}
              <button
                type="button"
                className="google-account-option"
                onClick={() =>
                  handleSelectGoogleAccount({
                    name: "Alex Chef",
                    email: "chef.craverecipes@gmail.com",
                  })
                }
              >
                <div className="google-avatar avatar-chef">A</div>
                <div className="google-account-info">
                  <div className="account-name">
                    Alex Chef
                    <span className="account-badge">Chef</span>
                  </div>
                  <div className="account-email">chef.craverecipes@gmail.com</div>
                </div>
              </button>

              {/* Account 3: Use Another Account Toggle */}
              <button
                type="button"
                className="google-account-option"
                onClick={() => setShowCustomGoogleInput(!showCustomGoogleInput)}
              >
                <div className="google-avatar avatar-custom">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="16" y1="11" x2="22" y2="11" />
                  </svg>
                </div>
                <div className="google-account-info">
                  <div className="account-name">Use another account</div>
                  <div className="account-email">Sign in with any custom Google account</div>
                </div>
              </button>
            </div>

            {/* Custom Account Input Accordion */}
            {showCustomGoogleInput && (
              <form onSubmit={handleCustomGoogleSubmit} className="google-custom-account-box">
                <input
                  type="text"
                  placeholder="Full name (e.g. Maya Lin)"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  autoFocus
                />
                <input
                  type="email"
                  placeholder="Google email (e.g. maya@gmail.com)"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  required
                />
                <button type="submit" className="google-custom-submit-btn">
                  Continue with this account
                </button>
              </form>
            )}

            <div className="google-chooser-footer">
              To continue, Google will share your name, email address, and profile picture with Crave Recipe Studio.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
