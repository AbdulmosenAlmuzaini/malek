import { useEffect, useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Reports() {
    const nav = useNavigate();
    const [stats, setStats] = useState<any>({ categories: [], properties: [], persons: [], total_out: 0, total_in: 0 });

    useEffect(() => {
        api.get("/stats").then(res => setStats(res.data));
    }, []);

    const drillDown = (type: "category" | "property_type", value: string) => {
        nav(`/operations?filterType=${type}&filterValue=${encodeURIComponent(value)}`);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <div>
                <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>🏠 التقارير حسب نوع العقار</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                    {stats.properties.map((p: any) => (
                        <div
                            key={p.property_type}
                            onClick={() => drillDown("property_type", p.property_type)}
                            className="card"
                            style={{
                                cursor: 'pointer', transition: 'transform 0.2s', borderRight: '4px solid var(--primary)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', margin: '0 0 5px 0' }}>{p.property_type}</p>
                                <h3 style={{ margin: 0 }}>{p.total.toLocaleString()} ر.س</h3>
                            </div>
                            <span style={{ fontSize: '1.2em' }}>🔍</span>
                        </div>
                    ))}
                    {stats.properties.length === 0 && <p style={{ color: 'var(--text-muted)' }}>لا توجد بيانات للعقارات حالياً</p>}
                </div>
            </div>

            <div>
                <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>📊 التقارير حسب التصنيف</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                    {stats.categories.map((c: any) => (
                        <div
                            key={c.category}
                            onClick={() => drillDown("category", c.category)}
                            className="card"
                            style={{
                                cursor: 'pointer', transition: 'transform 0.2s', borderRight: '4px solid var(--danger)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', margin: '0 0 5px 0' }}>{c.category}</p>
                                <h3 style={{ margin: 0 }}>{c.total.toLocaleString()} ر.س</h3>
                            </div>
                            <span style={{ fontSize: '1.2em' }}>🔍</span>
                        </div>
                    ))}
                    {stats.categories.length === 0 && <p style={{ color: 'var(--text-muted)' }}>لا توجد بيانات للتصنيفات حالياً</p>}
                </div>
            </div>
            <div>
                <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>🔄 التقارير حسب أسماء المحول لهم</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                    {stats.persons.map((p: any) => (
                        <div
                            key={p.person_name}
                            onClick={() => nav(`/transfers?person_name=${encodeURIComponent(p.person_name)}`)}
                            className="card"
                            style={{
                                cursor: 'pointer', transition: 'transform 0.2s', borderRight: '4px solid #8b5cf6',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', margin: '0 0 5px 0' }}>{p.person_name}</p>
                                <h3 style={{ margin: 0 }}>{p.total.toLocaleString()} ر.س</h3>
                            </div>
                            <span style={{ fontSize: '1.2em' }}>🔍</span>
                        </div>
                    ))}
                    {stats.persons.length === 0 && <p style={{ color: 'var(--text-muted)' }}>لا توجد بيانات للتحويلات حالياً</p>}
                </div>
            </div>
        </div>
    );
}
