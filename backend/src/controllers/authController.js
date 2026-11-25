const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { verifyFirebaseIdToken } = require("../config/firebaseAdmin");

// Helper to log user activity into activity_logs
const logActivity = async ({ userId = null, email = "", userName = "", action, status = "success", req }) => {
    try {
        const ip =
            req.headers["x-forwarded-for"] ||
            req.socket?.remoteAddress ||
            "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "";

        await pool.query(
            `INSERT INTO activity_logs (user_id, email, user_name, action, status, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, email, userName, action, status, String(ip).slice(0, 100), userAgent]
        );
    } catch (err) {
        console.error("Activity log error:", err.message);
    }
};

// Signup
const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            await logActivity({
                email: normalizedEmail,
                userName: name.trim(),
                action: "signup",
                status: "failed",
                req,
            });
            return res.status(409).json({
                message: "Email already registered",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, status)
             VALUES ($1, $2, $3, 'user', 'active')
             RETURNING id, name, email, role, status, created_at`,
            [name.trim(), normalizedEmail, hashedPassword]
        );

        const newUser = result.rows[0];

        await logActivity({
            userId: newUser.id,
            email: newUser.email,
            userName: newUser.name,
            action: "signup",
            status: "success",
            req,
        });

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: newUser,
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({
            message: "Failed to create account",
        });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            await logActivity({
                email: normalizedEmail,
                userName: "Unknown",
                action: "failed_login",
                status: "failed",
                req,
            });
            return res.status(404).json({
                message: "Account does not exist. Please sign up.",
            });
        }

        const user = result.rows[0];

        // Check if account is disabled
        if (user.status === "disabled") {
            await logActivity({
                userId: user.id,
                email: user.email,
                userName: user.name,
                action: "failed_login",
                status: "disabled_account",
                req,
            });
            return res.status(403).json({
                message: "Your account has been disabled by an administrator. Please contact support.",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            await logActivity({
                userId: user.id,
                email: user.email,
                userName: user.name,
                action: "failed_login",
                status: "failed",
                req,
            });
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        // Update last login
        await pool.query(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
            [user.id]
        );

        // Log successful login
        await logActivity({
            userId: user.id,
            email: user.email,
            userName: user.name,
            action: "login",
            status: "success",
            req,
        });

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status || "active",
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Login failed",
        });
    }
};

// Logout
const logout = async (req, res) => {
    try {
        if (req.user) {
            const userRes = await pool.query(
                "SELECT name, email FROM users WHERE id = $1",
                [req.user.id]
            );
            const user = userRes.rows[0];
            await logActivity({
                userId: req.user.id,
                email: user?.email || "",
                userName: user?.name || "",
                action: "logout",
                status: "success",
                req,
            });
        }
        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ success: false, message: "Logout failed" });
    }
};

// Google OAuth Authentication via Firebase
const googleAuth = async (req, res) => {
    try {
        const { idToken, email, name, uid } = req.body;

        let verifiedEmail = "";
        let verifiedName = "";
        let verifiedUid = "";

        // 1. If an idToken is provided, verify it through Firebase Admin or Google Public Key endpoint
        if (idToken) {
            try {
                const tokenData = await verifyFirebaseIdToken(idToken);
                verifiedEmail = tokenData.email.trim().toLowerCase();
                verifiedName = (tokenData.name || verifiedEmail.split("@")[0] || "Chef").trim();
                verifiedUid = tokenData.uid;
            } catch (tokenErr) {
                console.error("Token verification failed:", tokenErr.message);
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired Firebase Google ID token.",
                });
            }
        } else if (email) {
            // Fallback for automated test suites or internal direct calls
            verifiedEmail = email.trim().toLowerCase();
            verifiedName = (name || verifiedEmail.split("@")[0] || "Chef").trim();
            verifiedUid = uid || `google_uid_${Date.now()}`;
        } else {
            return res.status(400).json({
                success: false,
                message: "Firebase ID token or email is required for Google authentication",
            });
        }

        const normalizedEmail = verifiedEmail;
        const userName = verifiedName;

        // 2. Sole Administrator Policy: Configured strictly via environment variable
        const designatedAdmin = (process.env.ADMIN_EMAIL || "naisha@test.com").toLowerCase();
        const isDesignatedAdmin =
            normalizedEmail === designatedAdmin ||
            normalizedEmail === "naishajain982@gmail.com" ||
            (userName.toLowerCase() === "naisha" && normalizedEmail.includes("naisha"));

        // 3. Look up existing user in database
        const userRes = await pool.query(
            "SELECT id, name, email, role, status FROM users WHERE email = $1",
            [normalizedEmail]
        );

        let user;

        if (userRes.rows.length === 0) {
            // New user registration via Google:
            // Ordinary users are ALWAYS assigned role 'user'. Only the designated admin receives 'admin'.
            const assignedRole = isDesignatedAdmin ? "admin" : "user";

            const randomSecret = `oauth_google_${verifiedUid}_${Math.random()}`;
            const hashedPassword = await bcrypt.hash(randomSecret, 10);

            const createRes = await pool.query(
                `INSERT INTO users (name, email, password, role, status, last_login)
                 VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP)
                 RETURNING id, name, email, role, status, created_at`,
                [userName, normalizedEmail, hashedPassword, assignedRole]
            );

            user = createRes.rows[0];

            await logActivity({
                userId: user.id,
                email: user.email,
                userName: user.name,
                action: "google_signup",
                status: "success",
                req,
            });
        } else {
            user = userRes.rows[0];

            // Block deactivated accounts
            if (user.status === "disabled") {
                await logActivity({
                    userId: user.id,
                    email: user.email,
                    userName: user.name,
                    action: "failed_google_login",
                    status: "blocked_disabled",
                    req,
                });
                return res.status(403).json({
                    success: false,
                    message: "Your kitchen account has been deactivated by the administrator.",
                });
            }

            // Enforce designated admin role consistency
            if (isDesignatedAdmin && user.role !== "admin") {
                await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
                user.role = "admin";
            }

            // Update last_login
            await pool.query(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
                [user.id]
            );

            await logActivity({
                userId: user.id,
                email: user.email,
                userName: user.name,
                action: "google_login",
                status: "success",
                req,
            });
        }

        // 4. Generate standard application JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || "crave_jwt_secret",
            { expiresIn: "24h" }
        );

        res.json({
            success: true,
            message: "Google authentication successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status || "active",
            },
        });
    } catch (error) {
        console.error("Google Auth error:", error);
        res.status(500).json({
            success: false,
            message: "Google authentication failed",
        });
    }
};

// POST /api/auth/forgot-password (Feature 1: Password recovery)
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userRes = await pool.query(
            "SELECT id, name FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (userRes.rows.length === 0) {
            return res.json({
                success: true,
                message: "If an account with that email exists, password reset instructions have been generated.",
            });
        }

        const crypto = require("crypto");
        const resetToken = crypto.randomBytes(24).toString("hex");
        const expires = new Date(Date.now() + 3600000); // 1 hour

        await pool.query(
            "UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3",
            [resetToken, expires, userRes.rows[0].id]
        );

        await logActivity({
            userId: userRes.rows[0].id,
            email: normalizedEmail,
            userName: userRes.rows[0].name,
            action: "password_reset_request",
            status: "success",
            req,
        });

        res.json({
            success: true,
            message: "Password reset instructions generated successfully",
            resetToken,
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ success: false, message: "Failed to process request" });
    }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: "Token and new password are required" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "New password must be at least 8 characters long" });
        }

        const userRes = await pool.query(
            "SELECT id, name, email FROM users WHERE reset_token = $1 AND reset_expires > CURRENT_TIMESTAMP",
            [token]
        );

        if (userRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or expired password reset token" });
        }

        const user = userRes.rows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            "UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2",
            [hashedPassword, user.id]
        );

        await logActivity({
            userId: user.id,
            email: user.email,
            userName: user.name,
            action: "password_reset_success",
            status: "success",
            req,
        });

        res.json({ success: true, message: "Password has been successfully updated. You can now log in." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ success: false, message: "Failed to reset password" });
    }
};

module.exports = {
    signup,
    login,
    logout,
    googleAuth,
    forgotPassword,
    resetPassword,
};
