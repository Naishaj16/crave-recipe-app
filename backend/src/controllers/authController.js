const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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

module.exports = {
    signup,
    login,
    logout,
};
