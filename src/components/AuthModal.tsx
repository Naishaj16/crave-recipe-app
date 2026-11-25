import { useState } from "react";
import { loginUser, signupUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
    onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
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
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close" onClick={onClose}>
                    ×
                </button>

                <div className="auth-header">
                    <span className="auth-brand">crave.</span>
                    <h2>{mode === "login" ? "Welcome back!" : "Create your account"}</h2>
                    <p>
                        {mode === "login"
                            ? "Log in to continue exploring delicious recipes."
                            : "Join Crave and discover your next favorite meal."}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {mode === "signup" && (
                        <div className="auth-field">
                            <label>Full Name</label>
                            <input
                                type="text"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="auth-field">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={8}
                            required
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading
                            ? "Please wait..."
                            : mode === "login"
                                ? "Log In"
                                : "Create Account"}
                    </button>
                </form>

                <div className="auth-switch">
                    {mode === "login" ? (
                        <>
                            Don't have an account?{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("signup");
                                    setError("");
                                }}
                            >
                                Sign up
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("login");
                                    setError("");
                                }}
                            >
                                Log in
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}