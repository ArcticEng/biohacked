"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, TabBar, SectionLabel, Loading, Avatar, C, api } from "@/components/ui";

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [educators, setEducators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { router.push("/dashboard"); return; }
    loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    try {
      const d = await api("/admin");
      setUsers(d.users || []);
      setStats(d.stats || {});
      setPosts(d.flaggedPosts || []);
      setEducators(d.pendingEducators || []);
    } catch {}
    setLoading(false);
  };

  const verifyEducator = async (id) => {
    try { await api("/admin", { method: "POST", body: { action: "verify_educator", userId: id } }); loadAll(); } catch {}
  };
  const deletePost = async (id) => {
    if (!confirm("Delete this post?")) return;
    try { await api("/admin", { method: "POST", body: { action: "delete_post", postId: id } }); loadAll(); } catch {}
  };
  const deleteUser = async (id) => {
    if (!confirm("Permanently delete this user and all their data?")) return;
    try { await api("/admin", { method: "POST", body: { action: "delete_user", userId: id } }); loadAll(); } catch {}
  };

  if (!isAdmin) return null;
  if (loading) return <Loading msg="Loading admin" />;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 24px" }}>
      <h1 style={{ fontFamily: "'Syne'", fontSize: 24, fontWeight: 800, color: C.t1, marginBottom: 20 }}>Admin</h1>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[["Users", stats.totalUsers], ["Clients", stats.clients], ["Coaches", stats.coaches], ["Educators", stats.educators]].map(([l, v]) => (
            <Card key={l} style={{ textAlign: "center", padding: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.purple }}>{v || 0}</div>
              <div style={{ fontSize: 10, color: C.t4, textTransform: "uppercase", marginTop: 2 }}>{l}</div>
            </Card>
          ))}
        </div>
      )}

      <TabBar tabs={["users", "educators", "forum", "reports"]} active={tab} onChange={setTab} />

      {tab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {users.map(u => (
            <Card key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
              <Avatar name={u.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: C.t3 }}>{u.email} · {u.role} · {u.tier}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {!u.emailVerified && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "var(--amber-surface)", color: C.amber }}>unverified</span>}
                <button onClick={() => deleteUser(u.id)} style={{ background: "none", border: "none", color: C.t4, cursor: "pointer", fontSize: 12 }}>🗑</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "educators" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          <SectionLabel>Pending verification</SectionLabel>
          {educators.length === 0 ? <p style={{ color: C.t3, padding: 20, textAlign: "center" }}>No pending educators</p> : educators.map(u => (
            <Card key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
              <Avatar name={u.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: C.t3 }}>{u.credentials || "No credentials provided"}</div>
              </div>
              <Btn onClick={() => verifyEducator(u.id)} style={{ width: "auto", padding: "6px 14px" }}>Verify</Btn>
            </Card>
          ))}
        </div>
      )}

      {tab === "forum" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          <SectionLabel>Recent forum posts</SectionLabel>
          {posts.map(p => (
            <Card key={p.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{p.title}</span>
                <button onClick={() => deletePost(p.id)} style={{ background: "var(--red-surface)", border: "none", color: C.red, padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Delete</button>
              </div>
              <div style={{ fontSize: 12, color: C.t3 }}>{p.author?.name} · {new Date(p.createdAt).toLocaleDateString("en-ZA")}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
