import { useEffect, useState, useRef } from "react";
import api from "../lib/api";

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Setting = { id: number; name: string; type: "property_type" | "category" | "person" };

export default function Settings() {
    const { user, showToast } = useAuth();
    if (user?.role !== "admin") return <Navigate to="/" />;
    const [settings, setSettings] = useState<Setting[]>([]);
    const [name, setName] = useState("");
    const [type, setType] = useState<Setting["type"]>("property_type");
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const load = () => api.get("/settings").then(res => setSettings(res.data));

    useEffect(() => {
        load();
    }, []);

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        try {
            await api.post("/settings", { name, type });
            setName("");
            load();
            inputRef.current?.focus();
        } catch (err: any) {
            showToast("خطأ: " + (err.response?.data?.message || err.message), "error");
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await api.delete("/settings/" + deleteId);
        setDeleteId(null);
        load();
    };

    return (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
            {/* Custom Delete Modal */}
            {deleteId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: "center", maxWidth: 400 }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1.8em" }}>⚠️</div>
                        <h3 style={{ marginBottom: 10 }}>تأكيد الحذف</h3>
                        <p style={{ color: "var(--text-muted)", marginBottom: 30 }}>هل أنت متأكد من رغبتك في حذف هذا الخيار من القوائم؟</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <button style={{ background: "var(--danger)" }} onClick={confirmDelete}>نعم، احذف</button>
                            <button className="secondary" onClick={() => setDeleteId(null)}>تراجع</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="card" style={{ marginBottom: 30 }}>
                <h4>إضافة خيار جديد للقوائم المنسدلة</h4>
                <form onSubmit={add} style={{ display: "flex", gap: 10 }}>
                    <input
                        ref={inputRef}
                        placeholder="الاسم (مثال: تجاري، صيانة...)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <select value={type} onChange={e => setType(e.target.value as any)} style={{ width: 200 }}>
                        <option value="property_type">نوع العقار</option>
                        <option value="category">تصنيف العمليات</option>
                        <option value="person">قائمة الأسماء (التحويلات)</option>
                    </select>
                    <button type="submit">إضافة</button>
                </form>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 30 }}>
                <div className="card">
                    <h5 style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: 10, marginBottom: 15 }}>أنواع العقارات</h5>
                    {settings.filter(s => s.type === "property_type").map(s => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <span>{s.name}</span>
                            <button onClick={() => setDeleteId(s.id)} style={{ padding: 4, background: "none", color: "var(--danger)" }}>🗑️</button>
                        </div>
                    ))}
                </div>
                <div className="card">
                    <h5 style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: 10, marginBottom: 15 }}>تصنيفات العمليات</h5>
                    {settings.filter(s => s.type === "category").map(s => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <span>{s.name}</span>
                            <button onClick={() => setDeleteId(s.id)} style={{ padding: 4, background: "none", color: "var(--danger)" }}>🗑️</button>
                        </div>
                    ))}
                </div>
                <div className="card">
                    <h5 style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: 10, marginBottom: 15 }}>قائمة الأسماء</h5>
                    {settings.filter(s => s.type === "person").map(s => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <span>{s.name}</span>
                            <button onClick={() => setDeleteId(s.id)} style={{ padding: 4, background: "none", color: "var(--danger)" }}>🗑️</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card" style={{ border: "2px solid var(--primary-light)", background: "rgba(78, 68, 231, 0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h4 style={{ margin: "0 0 5px 0" }}>🛡️ نظام النسخ الاحتياطي التلقائي</h4>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9em", margin: 0 }}>يتم إرسال نسخة من قاعدة البيانات يومياً الساعة 3:00 صباحاً إلى بريدك.</p>
                    </div>
                    <button
                        className="secondary"
                        onClick={async () => {
                            const btn = document.getElementById('backup-btn');
                            if (btn) btn.innerText = "⏳ جاري الإرسال...";
                            try {
                                const res = await api.post("/admin/backup-now");
                                showToast(res.data.message, "success");
                            } catch (err: any) {
                                showToast("فشل الإرسال: " + (err.response?.data?.message || err.message), "error");
                            } finally {
                                if (btn) btn.innerText = "📧 أرسل نسخة للبريد الآن";
                            }
                        }}
                        id="backup-btn"
                        style={{ whiteSpace: "nowrap" }}
                    >
                        📧 أرسل نسخة للبريد الآن
                    </button>
                </div>
            </div>
        </div>
    );
}
