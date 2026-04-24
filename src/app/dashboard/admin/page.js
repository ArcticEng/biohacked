"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, SectionLabel, StatBox, Loading, Empty, C, api } from "@/components/ui";

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pendingEds, setPendingEds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      api("/admin?action=stats"), api("/admin?action=users"), api("/admin?action=pending_educators"),
    ]).then(([s, u, e]) => { setStats(s); setUsers(u.users || []); setPendingEds(e.educators || []); setLoading(false); })
    .catch(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return <Empty icon="🔒" title="Admin access required" />;
  if (loading) return <Loading msg="Loading admin" />;

  const usersByRole = {};
  (stats?.users || []).forEach(g => { usersByRole[g.role] = g._count; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700, color: C.t1 }}>Admin Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatBox label="Clients" value={usersByRole.CLIENT || 0} color={C.purple} />
        <StatBox label="Coaches" value={usersByRole.COACH || 0} color={C.pink} />
        <StatBox label="Educators" value={usersByRole.EDUCATOR || 0} color={C.amber} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <StatBox label="Check-ins" value={stats?.checkins || 0} color={C.teal} />
        <StatBox label="Recipes" value={stats?.recipes || 0} color={C.green} />
        <StatBox label="Posts" value={stats?.posts || 0} color={C.violet} />
        <StatBox label="Subs" value={stats?.activeSubscriptions || 0} color={C.pink} />
      </div>
      {pendingEds.length > 0 && (<Card><SectionLabel>Pending educator verification ({pendingEds.length})</SectionLabel>{pendingEds.map(e => (<div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}><div><div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{e.name}</div><div style={{ fontSize: 12, color: C.t3 }}>{e.credentials || "No credentials"}</div></div><Btn onClick={async () => { await api("/admin", { method: "POST", body: { action: "verify_educator", userId: e.id } }); setPendingEds(ps => ps.filter(p => p.id !== e.id)); }} style={{ width: "auto", padding: "6px 14px" }}>Verify</Btn></div>))}</Card>)}
      <Card><SectionLabel>Recent users</SectionLabel><div style={{ overflowX: "auto", marginTop: 12 }}><table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}><thead><tr style={{ color: C.t4, borderBottom: `1px solid ${C.border}` }}>{["Name","Email","Role","Tier","Joined"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>)}</tr></thead><tbody>{users.slice(0,20).map(u => (<tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: "8px", color: C.t1, fontWeight: 600 }}>{u.name}</td><td style={{ padding: "8px", color: C.t3 }}>{u.email}</td><td style={{ padding: "8px" }}><span style={{ padding: "2px 8px", borderRadius: 4, background: "var(--purple-surface)", color: C.purple, fontWeight: 600, fontSize: 10 }}>{u.role}</span></td><td style={{ padding: "8px", color: C.t2 }}>{u.tier}</td><td style={{ padding: "8px", color: C.t4, fontSize: 11 }}>{new Date(u.createdAt).toLocaleDateString("en-ZA")}</td></tr>))}</tbody></table></div></Card>
    </div>
  );
}
