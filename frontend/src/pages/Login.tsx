import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Login() {
    const { login, showToast } = useAuth();
    const nav = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ok = await login(username, password);
        if (!ok) {
            showToast("اسم المستخدم أو كلمة المرور غير صحيحة", "error");
            return;
        }
        showToast("مرحباً بك مجدداً!", "success");
        nav("/");
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f5f7fb 0%, #e8ecf3 100%)",
            padding: 20
        }}>
            <div className="card" style={{
                maxWidth: 400,
                width: "100%",
                textAlign: "center",
                padding: "40px 30px",
                borderTop: "6px solid var(--primary)"
            }}>
                <div style={{
                    width: 70, height: 70,
                    margin: "0 auto 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 15px -3px rgba(78, 68, 231, 0.2)"
                }}>
                    <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>

                <h2 style={{ margin: "0 0 8px 0", fontWeight: 700 }}>محفظتي الذكية</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9em", margin: "0 0 30px 0" }}>إدارة مالية بسيطة وذكية</p>

                <form onSubmit={submit} style={{ textAlign: "right" }}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", marginBottom: 8, fontSize: "0.9em", fontWeight: 600 }}>اسم المستخدم</label>
                        <div style={{ position: "relative" }}>
                            <input
                                placeholder="أدخل اسم المستخدم"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#cbd5e0" }}>👤</span>
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", marginBottom: 8, fontSize: "0.9em", fontWeight: 600 }}>كلمة المرور</label>
                        <div style={{ position: "relative" }}>
                            <input
                                type="password"
                                placeholder="أدخل كلمة المرور"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#cbd5e0" }}>🔒</span>
                        </div>
                    </div>

                    {/* Global toast will handle errors now */}

                    <button style={{ width: "100%", padding: 14 }}>
                        تسجيل الدخول
                        <span>➜</span>
                    </button>
                </form>

                <p style={{ marginTop: 40, color: "var(--text-muted)", fontSize: "0.75em" }}>
                    © 2026 جميع الحقوق محفوظة لمنصة محفظتي الذكية
                </p>
            </div>
        </div>
    );
}
