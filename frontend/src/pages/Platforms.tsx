import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Service = {
    id: number;
    platform_id: number;
    name: string;
    start_date: string;
    end_date: string;
    attachment_path: string;
};

type Platform = {
    id: number;
    name: string;
    category: string;
    services: Service[];
};

export default function Platforms() {
    const { user } = useAuth();
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [showAddPlatform, setShowAddPlatform] = useState(false);
    const [showAddService, setShowAddService] = useState<{ platformId: number } | null>(null);
    const [viewerPath, setViewerPath] = useState<string | null>(null);

    // Form States
    const [newPlatform, setNewPlatform] = useState({ name: "", category: "" });
    const [newService, setNewService] = useState({ name: "", start_date: "", end_date: "" });
    const [file, setFile] = useState<File | null>(null);

    const load = async () => {
        const res = await api.get("/platforms");
        setPlatforms(res.data);
    };

    useEffect(() => {
        load();
    }, []);

    const handleAddPlatform = async (e: React.FormEvent) => {
        e.preventDefault();
        await api.post("/platforms", newPlatform);
        setNewPlatform({ name: "", category: "" });
        setShowAddPlatform(false);
        load();
    };

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showAddService) return;

        const formData = new FormData();
        formData.append("platform_id", showAddService.platformId.toString());
        formData.append("name", newService.name);
        formData.append("start_date", newService.start_date);
        formData.append("end_date", newService.end_date);
        if (file) formData.append("attachment", file);

        await api.post("/services", formData);
        setNewService({ name: "", start_date: "", end_date: "" });
        setFile(null);
        setShowAddService(null);
        load();
    };

    const handleDeletePlatform = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذه المنصة وجميع خدماتها؟")) return;
        await api.delete("/platforms/" + id);
        load();
    };

    const handleDeleteService = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
        await api.delete("/services/" + id);
        load();
    };

    const checkExpiration = (endDate: string) => {
        if (!endDate) return null;
        const today = new Date();
        const exp = new Date(endDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: "منتهية", color: "#ef4444", bg: "#fee2e2" };
        if (diffDays <= 30) return { label: `تنتهي خلال ${diffDays} يوم`, color: "#f59e0b", bg: "#fef3c7" };
        return { label: "نشطة", color: "#10b981", bg: "#d1fae5" };
    };

    return (
        <div style={{ direction: "rtl" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <h3 style={{ margin: 0 }}>المنصات والاشتراكات المفعلة</h3>
                <button onClick={() => setShowAddPlatform(true)} style={{ background: '#065f46' }}>
                    + إضافة منصة جديدة
                </button>
            </div>

            {/* Platform Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {platforms.map(p => (
                    <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                <div style={{ width: 40, height: 40, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2em', border: '1px solid var(--border)' }}>🏢</div>
                                <div>
                                    <h4 style={{ margin: 0 }}>{p.name}</h4>
                                    <small style={{ color: 'var(--text-muted)' }}>{p.category || "تصنيف"}</small>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setShowAddService({ platformId: p.id })} style={{ padding: '6px 15px', fontSize: '0.85em', background: '#065f46' }}>+ إضافة خدمة</button>
                                {user?.role === 'admin' && (
                                    <button onClick={() => handleDeletePlatform(p.id)} style={{ padding: 8, background: 'none', color: 'var(--danger)' }}>🗑️</button>
                                )}
                            </div>
                        </div>

                        <div style={{ padding: 0 }}>
                            {p.services.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9em' }}>لا توجد خدمات مضافة لهذه المنصة</div>
                            ) : (
                                <table style={{ boxShadow: 'none', borderRadius: 0 }}>
                                    <tbody>
                                        {p.services.map(s => {
                                            const status = checkExpiration(s.end_date);
                                            return (
                                                <tr key={s.id}>
                                                    <td style={{ width: '30%' }}>{s.name}</td>
                                                    <td style={{ width: '20%' }}>
                                                        <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>التاريخ</div>
                                                        <div style={{ fontSize: '0.9em' }}>{s.end_date || "-"}</div>
                                                    </td>
                                                    <td style={{ width: '20%' }}>
                                                        {status && (
                                                            <span style={{
                                                                padding: '4px 12px',
                                                                borderRadius: 20,
                                                                fontSize: '0.75em',
                                                                fontWeight: 600,
                                                                color: status.color,
                                                                background: status.bg,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 5
                                                            }}>
                                                                {status.label === "منتهية" && "🚫"} {status.label}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'left' }}>
                                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                                            {s.attachment_path && (
                                                                <button
                                                                    onClick={() => setViewerPath(s.attachment_path)}
                                                                    className="secondary"
                                                                    style={{ padding: '6px 12px', fontSize: '0.8em' }}
                                                                >عرض المستند</button>
                                                            )}
                                                            {user?.role === 'admin' && (
                                                                <button onClick={() => handleDeleteService(s.id)} style={{ padding: 6, background: 'none', color: 'var(--danger)' }}>🗑️</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Platform Modal */}
            {showAddPlatform && (
                <div className="modal-overlay">
                    <form className="modal-content" onSubmit={handleAddPlatform}>
                        <h3 style={{ marginTop: 0 }}>إضافة منصة جديدة</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9em' }}>اسم المنصة</label>
                                <input required value={newPlatform.name} onChange={e => setNewPlatform({ ...newPlatform, name: e.target.value })} placeholder="مثال: منصة قوى" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9em' }}>التصنيف</label>
                                <input value={newPlatform.category} onChange={e => setNewPlatform({ ...newPlatform, category: e.target.value })} placeholder="مثال: خدمات حكومية" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 10 }}>
                                <button type="submit">حفظ</button>
                                <button type="button" className="secondary" onClick={() => setShowAddPlatform(false)}>إلغاء</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Add Service Modal */}
            {showAddService && (
                <div className="modal-overlay">
                    <form className="modal-content" onSubmit={handleAddService} style={{ maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0 }}>إضافة خدمة</h3>
                            <button type="button" onClick={() => setShowAddService(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5em', padding: 0 }}>×</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {/* Upload Area */}
                            <div style={{
                                border: '2px dashed var(--border)',
                                borderRadius: 12,
                                padding: 30,
                                textAlign: 'center',
                                background: 'rgba(78, 68, 231, 0.02)',
                                cursor: 'pointer',
                                position: 'relative'
                            }} onClick={() => document.getElementById('service-file')?.click()}>
                                <input type="file" id="service-file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} accept="image/*,.pdf" />
                                <div style={{ fontSize: '2em', marginBottom: 10 }}>✨</div>
                                <div style={{ color: 'var(--primary)', fontWeight: 600 }}>{file ? file.name : "اضغط لرفع مستند"}</div>
                                <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', marginTop: 5 }}>PDF, PNG, JPG</div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85em' }}>اسم الخدمة / المستند</label>
                                <input required value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85em' }}>تاريخ البداية</label>
                                    <input type="date" value={newService.start_date} onChange={e => setNewService({ ...newService, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85em' }}>تاريخ النهاية</label>
                                    <input type="date" value={newService.end_date} onChange={e => setNewService({ ...newService, end_date: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 10 }}>
                                <button type="submit" style={{ background: '#065f46' }}>حفظ</button>
                                <button type="button" className="secondary" onClick={() => setShowAddService(null)}>إلغاء</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* document Viewer Modal */}
            {viewerPath && (
                <div className="modal-overlay" onClick={() => setViewerPath(null)}>
                    <div className="modal-content" style={{ maxWidth: '90%', maxHeight: '90%', padding: 10, position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setViewerPath(null)}
                            style={{ position: 'absolute', top: -15, right: -15, width: 35, height: 35, borderRadius: '50%', background: 'var(--danger)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', zIndex: 10 }}
                        >✕</button>

                        {viewerPath.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                                src={viewerPath}
                                style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: 8 }}
                                title="Document Preview"
                            />
                        ) : (
                            <img
                                src={viewerPath}
                                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, display: 'block', margin: '0 auto' }}
                                alt="Attachment Preview"
                            />
                        )}

                        <div style={{ marginTop: 15, textAlign: 'center' }}>
                            <a href={viewerPath} download className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '10px 20px', background: 'var(--primary)', color: 'white', borderRadius: 10 }}>⬇️ تحميل المستند</a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
