const API_URL = import.meta.env.VITE_API_URL;

export const signupUser = async (
    name: string,
    email: string,
    password: string
) => {
    const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Signup failed");
    }

    return data;
};

export const loginUser = async (
    email: string,
    password: string
) => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Login failed");
    }

    return data;
};

export const googleLoginUser = async (googleUser: {
    email: string;
    name?: string | null;
    uid?: string;
    idToken?: string;
}) => {
    const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(googleUser),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Google authentication failed");
    }

    return data;
};

export const forgotPassword = async (email: string) => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Failed to process forgot password request");
    }
    return data;
};

export const resetPassword = async (token: string, newPassword: string) => {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
    }
    return data;
};

export const verify2FA = async (tempToken: string, code: string) => {
    const response = await fetch(`${API_URL}/auth/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Two-factor verification failed");
    }
    return data;
};

export const resend2FA = async (tempToken: string) => {
    const response = await fetch(`${API_URL}/auth/resend-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Failed to resend two-factor code");
    }
    return data;
};

export const toggle2FA = async (enable: boolean) => {
    const token = localStorage.getItem("crave-token");
    const response = await fetch(`${API_URL}/auth/toggle-2fa`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ enable }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Failed to update 2FA configuration");
    }
    return data;
};
