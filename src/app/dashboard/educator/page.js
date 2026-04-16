"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, Inp, TextArea, Pill, StatBox, SectionLabel, Loading, Empty, ErrorMsg, C, api } from "@/components/ui";

export default function EducatorPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({ title: "", description: "", videoUrl: "", category: "Training", duration: "" });

  const categories = ["Training", "Nutrition", "Supplementation", "Recovery", "Peptides", "Female Health", "Mindset"];

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const d = await api("/education?mine=1"); setVideos(d.videos || []); } catch {}
    setLoading(false);
  };

  const submit = async () => {
    if (!form.title || !form.videoUrl) { setError("Title and video URL are required"); return; }
    setBusy(true); setError("");
    try {
      await api("/education", { method: "POST", body: {
        action: "upload_video", title: form.title, description: form.description,
        videoUrl: form.videoUrl, category: form.category,
        duration: form.duration ? parseInt(form.duration) : undefined,
      }});
      setForm({ title: "", description: "", videoUrl: "", category: "Training", duration: "" });
      setUploadOpen(false); setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const remove = async (id) => {
    if (!confirm("Delete this video?")) return;
    try { await api(`/education?id=${id}`, { method: "DELETE" }); load(); } catch (e) { alert(e.message); }
  };

  if (loading) return <Loading msg="Loading your videos" />;

  const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
  const approvedCount = videos.filter(v => v.approved).length;

  // ── UPLOAD MODAL ──
  if (uploadOpen) return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button onClick={() => setUploadOpen(false)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 13, textAlign: "left" }}>← Back</button>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Upload video</h2>

      <Inp label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Progressive Overload Explained" />
      <TextArea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What will viewers learn?" style={{ minHeight: 100 }} />
      <Inp label="Video URL" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
      <Inp label="Duration (seconds)" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="600" />

      <div>
        <SectionLabel>Category</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {categories.map(c => <Pill key={c} active={form.category === c} onClick={() => setForm({ ...form, category: c })}>{c}</Pill>)}
        </div>
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      <Btn onClick={submit} disabled={busy}>{busy ? "Uploading..." : user?.verified ? "Publish video" : "Submit for review"}</Btn>
      {!user?.verified && <p style={{ fontSize: 11, color: C.t4, textAlign: "center" }}>Not yet verified — your videos will be reviewed before going live.</p>}
    </div>
  );

  // ── DASHBOARD ──
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Educator Dashboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          {user?.verified && <span style={{ fontSize: 10, background: "rgba(34,197,94,0.1)", color: C.green, padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>✓ Verified</span>}
          {user?.credentials && <span style={{ fontSize: 12, color: C.t3 }}>{user.credentials}</span>}
        </div>
      </div>

      {success && <div style={{ color: C.green, fontSize: 13, padding: "10px 14px", background: "rgba(34,197,94,0.08)", borderRadius: 10, textAlign: "center" }}>Video submitted ✓</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <StatBox label="videos" value={videos.length} color={C.purple} />
        <StatBox label="approved" value={approvedCount} color={C.green} />
        <StatBox label="total views" value={totalViews.toLocaleString()} color={C.amber} />
      </div>

      <Btn onClick={() => setUploadOpen(true)}>+ Upload new video</Btn>

      <SectionLabel>My videos</SectionLabel>
      {videos.length === 0 ? <Empty icon="🎥" title="No videos uploaded yet" subtitle="Share your expertise with the community" action="Upload first video" onAction={() => setUploadOpen(true)} /> : videos.map(v => (
        <Card key={v.id}>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 80, height: 54, borderRadius: 8, background: "rgba(168,85,247,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>▶</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{v.title}</div>
              <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.t4, flexWrap: "wrap" }}>
                <span style={{ background: "rgba(168,85,247,0.08)", padding: "1px 6px", borderRadius: 4, color: C.purple }}>{v.category}</span>
                <span>👁 {v.views?.toLocaleString() || 0}</span>
                {v.duration && <span>{Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, "0")}</span>}
                <span style={{ color: v.approved ? C.green : C.amber }}>{v.approved ? "✓ Live" : "⏳ Pending review"}</span>
              </div>
            </div>
            <button onClick={() => remove(v.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'" }}>Delete</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
