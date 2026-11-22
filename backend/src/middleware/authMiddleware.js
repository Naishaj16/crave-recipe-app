const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Verify if user is logged in and account is active
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify account exists and is not disabled in database
        const userRes = await pool.query(
            "SELECT id, name, email, role, status FROM users WHERE id = $1",
            [decoded.id]
        );

        if (userRes.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User account no longer exists",
            });
        }

        const dbUser = userRes.rows[0];

        if (dbUser.status === "disabled") {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled by an administrator",
            });
        }

        req.user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            status: dbUser.status,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

// Allow only verified admins
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required. Access denied.",
        });
    }

    next();
};

module.exports = { authenticate, requireAdmin };
