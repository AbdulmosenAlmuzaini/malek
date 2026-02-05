import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

type User = {
    id: number;
    name: string;
    role: "viewer" | "entry" | "admin";
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    showToast: (msg: string, type?: "success" | "error") => void;
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "error" }[]>([]);

    useEffect(() => {
        api.get("/me")
            .then(res => setUser(res.data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const login = async (username: string, password: string) => {
        try {
            const res = await api.post("/login", { username, password });
            setUser(res.data.user);
            return true;
        } catch (err: any) {
            console.error("Login error:", err.response?.data || err.message);
            return false;
        }
    };

    const logout = async () => {
        await api.post("/logout");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, showToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <span>{t.type === 'success' ? '✅' : '⚠️'}</span>
                        <span>{t.msg}</span>
                    </div>
                ))}
            </div>
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
