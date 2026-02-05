import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const loc = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Check screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
            if (window.innerWidth > 768) {
                setSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close sidebar when route changes on mobile
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [loc.pathname, isMobile]);

    const menu = [
        { name: "الرئيسية", path: "/", icon: "🏠" },
        { name: "العمليات", path: "/operations", icon: "📊" },
        { name: "إضافة", path: "/add", icon: "➕", roles: ["admin", "entry"] },
        { name: "التحويلات", path: "/transfers", icon: "🔄" },
        { name: "الإعدادات", path: "/settings", icon: "⚙️", admin: true },
        { name: "المنصات", path: "/platforms", icon: "🌐" },
        { name: "التقارير", path: "/reports", icon: "📈" },
        { name: "الموظفون", path: "/users", icon: "👥", admin: true },
    ];

    const filteredMenu = menu.filter(m => {
        if (m.admin && user?.role !== "admin") return false;
        if (m.roles && !m.roles.includes(user?.role || "")) return false;
        return true;
    });

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
            {/* Sidebar Overlay for Mobile */}
            {isMobile && sidebarOpen && (
                <div
                    className="sidebar-overlay active"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarOpen ? 'open' : ''}`}
                style={{
                    width: isMobile ? (sidebarOpen ? 260 : 0) : 260,
                    background: "#fff",
                    borderLeft: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    position: isMobile ? "fixed" : "relative",
                    top: 0,
                    right: isMobile ? (sidebarOpen ? 0 : -280) : 0,
                    height: isMobile ? "100vh" : "auto",
                    zIndex: 1000,
                    transition: "right 0.3s ease",
                    boxShadow: isMobile && sidebarOpen ? "-5px 0 15px rgba(0, 0, 0, 0.1)" : "none"
                }}
            >
                <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 35, height: 35 }}>
                        <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: "1.1em", fontWeight: 700 }}>محفظتي الذكية</h3>
                </div>

                <nav style={{ padding: "0 16px", flex: 1 }}>
                    {filteredMenu.map(m => {
                        const active = loc.pathname === m.path;
                        return (
                            <Link
                                key={m.path}
                                to={m.path}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "12px 16px",
                                    borderRadius: 12,
                                    marginBottom: 4,
                                    fontWeight: active ? 600 : 400,
                                    color: active ? "var(--primary)" : "var(--text-main)",
                                    background: active ? "rgba(78, 68, 231, 0.08)" : "transparent",
                                    transition: "all 0.2s"
                                }}
                            >
                                <span>{m.icon}</span>
                                <span>{m.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div style={{ padding: 20, borderTop: "1px solid var(--border)" }}>
                    <div style={{
                        background: "#f8fafc", padding: 12, borderRadius: 12,
                        display: "flex", alignItems: "center", gap: 10,
                        marginBottom: 16
                    }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }}></div>
                        <div style={{ fontSize: "0.85em" }}>
                            <div style={{ fontWeight: 600 }}>{user?.name}</div>
                            <div style={{ color: "var(--text-muted)", fontSize: "0.9em" }}>نشط الآن</div>
                        </div>
                    </div>
                    <button
                        className="secondary"
                        onClick={logout}
                        style={{ width: "100%", justifyContent: "center" }}
                    >
                        ↪ تسجيل الخروج
                    </button>
                </div>
            </aside>

            <main className="main-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <header className="main-header" style={{
                    padding: isMobile ? "12px 16px" : "16px 30px",
                    background: "#fff",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Hamburger Menu Button for Mobile */}
                        {isMobile && (
                            <button
                                className="sidebar-toggle"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                style={{
                                    background: "var(--primary)",
                                    color: "#fff",
                                    border: "none",
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    fontSize: "1.2em",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                ☰
                            </button>
                        )}
                        <div>
                            <h2 style={{ margin: 0, fontSize: isMobile ? "1em" : "1.25em" }}>الرئيسية</h2>
                            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: isMobile ? "0.75em" : "0.85em" }}>
                                مرحباً بك، {
                                    user?.role === 'admin' ? 'المدير العام' :
                                        user?.role === 'entry' ? 'مدخل البيانات' : 'مشاهد النظام'
                                }
                            </p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button className="secondary" style={{ padding: 8 }}>🔔</button>
                    </div>
                </header>
                <section className="main-section" style={{ padding: isMobile ? 16 : 30, flex: 1, overflowY: "auto" }}>
                    {children}
                </section>
            </main>

            {/* Bottom Navigation for Mobile */}
            {isMobile && (
                <div className="bottom-nav">
                    <div className="bottom-nav-inner">
                        {filteredMenu.slice(0, 5).map((m, idx) => {
                            const active = loc.pathname === m.path;
                            const isCenter = idx === 2; // Center item for a 5-item grid
                            return (
                                <Link
                                    key={m.path}
                                    to={m.path}
                                    className={`bottom-nav-item ${active ? 'active' : ''} ${isCenter ? 'center-btn' : ''}`}
                                >
                                    <div className="bottom-nav-icon-wrapper">
                                        <span className="bottom-nav-icon">{m.icon}</span>
                                    </div>
                                    <span className="bottom-nav-label">{m.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
