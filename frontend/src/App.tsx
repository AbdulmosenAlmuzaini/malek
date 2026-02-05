import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Operations from "./pages/Operations";
import AddOperation from "./pages/AddOperation";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Transfers from "./pages/Transfers";
import Platforms from "./pages/Platforms";
import Reports from "./pages/Reports";
import Layout from "./layout/Layout";

import { useEffect, useState } from "react";
import api from "./lib/api";

function Dashboard() {
  const [stats, setStats] = useState<any>({
    total_in: 0, total_out: 0, total_transfers: 0, balance: 0,
    categories: [], persons: [], recent: []
  });

  useEffect(() => {
    api.get("/stats").then(res => setStats(res.data));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      {/* Top Summaries */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="card" style={{ borderRight: '4px solid #10b981' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', margin: '0 0 10px 0' }}>إجمالي الرصيد</p>
          <h2 className="stat-value" style={{ margin: 0, fontSize: '1.4em' }}>{stats.balance.toLocaleString()} ر.س</h2>
        </div>
        <div className="card" style={{ borderRight: '4px solid var(--primary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', margin: '0 0 10px 0' }}>إجمالي الدخل</p>
          <h2 className="stat-value" style={{ margin: 0, fontSize: '1.4em' }}>{stats.total_in.toLocaleString()} ر.س</h2>
        </div>
        <div className="card" style={{ borderRight: '4px solid var(--danger)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', margin: '0 0 10px 0' }}>إجمالي المصروفات</p>
          <h2 className="stat-value" style={{ margin: 0, fontSize: '1.4em' }}>{stats.total_out.toLocaleString()} ر.س</h2>
        </div>
        <div className="card" style={{ borderRight: '4px solid #8b5cf6' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', margin: '0 0 10px 0' }}>إجمالي التحويلات</p>
          <h2 className="stat-value" style={{ margin: 0, fontSize: '1.4em' }}>{stats.total_transfers.toLocaleString()} ر.س</h2>
        </div>
      </div>

      {/* Breakdown Row */}
      <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="card">
          <h4 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>📊 المصروفات حسب التصنيف</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {stats.categories.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>لا توجد بيانات</p>}
            {stats.categories.map((c: any) => (
              <div key={c.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.95em' }}>
                  <span>{c.category || "غير مصنف"}</span>
                  <span style={{ fontWeight: 600 }}>{c.total.toLocaleString()} ر.س</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: 'var(--danger)',
                    width: `${Math.min((c.total / stats.total_out) * 100, 100) || 0}%`
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h4 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>🔄 التحويلات حسب الأسماء</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {stats.persons.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>لا توجد بيانات</p>}
            {stats.persons.map((p: any) => (
              <div key={p.person_name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.95em' }}>
                  <span>{p.person_name}</span>
                  <span style={{ fontWeight: 600 }}>{p.total.toLocaleString()} ر.س</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: '#8b5cf6',
                    width: `${Math.min((p.total / stats.total_transfers) * 100, 100) || 0}%`
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h4 style={{ margin: 0 }}>📝 آخر العمليات والتحويلات</h4>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>التفاصيل</th>
                <th>المبلغ</th>
                <th>النوع</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.date}</td>
                  <td>{r.details || "-"}</td>
                  <td style={{ fontWeight: 600 }}>{r.amount.toLocaleString()} ر.س</td>
                  <td>
                    <span style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: '0.8em',
                      background: r.origin === 'tra' ? 'rgba(139, 92, 246, 0.1)' : (r.type === 'in' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                      color: r.origin === 'tra' ? '#8b5cf6' : (r.type === 'in' ? '#10b981' : '#ef4444')
                    }}>
                      {r.origin === 'tra' ? 'تحويل' : (r.type === 'in' ? 'دخل' : 'مصروف')}
                    </span>
                  </td>
                </tr>
              ))}
              {stats.recent.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>لا توجد عمليات حالية</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/operations" element={<ProtectedRoute><Layout><Operations /></Layout></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><Layout><AddOperation /></Layout></ProtectedRoute>} />
          <Route path="/transfers" element={<ProtectedRoute><Layout><Transfers /></Layout></ProtectedRoute>} />
          <Route path="/platforms" element={<ProtectedRoute><Layout><Platforms /></Layout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Layout><Users /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
