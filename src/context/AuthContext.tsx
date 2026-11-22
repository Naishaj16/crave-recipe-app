import { createContext, useContext, useState } from "react";

interface User {
    id: number;
    name: string;
    email: string;
    role: "user" | "admin";
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (user: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem("crave-user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem("crave-token");
    });

    const login = (user: User, token: string) => {
        setUser(user);
        setToken(token);
        localStorage.setItem("crave-user", JSON.stringify(user));
        localStorage.setItem("crave-token", token);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("crave-user");
        localStorage.removeItem("crave-token");
    };

    return (
        <AuthContext.Provider value= {{ user, token, login, logout }
}>
    { children }
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
};