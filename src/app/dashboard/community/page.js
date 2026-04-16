"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, Inp, TextArea, Pill, Avatar, SectionLabel, Loading, Empty, ErrorMsg, C, api } from "@/components/ui";

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | detail | new
  const [selectedPost, setSelectedPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTags, setNewTags] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPosts = async () => {
    try {
      const d = await api(`/forum${filter !== "all" ? `?tag=${filter}` : ""}`);
      setPosts(d.posts || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, [filter]);

  const openPost = async (post) => {
    setView("detail");
    try {
      const d = await api(`/forum?id=${post.id}`);
      setSelectedPost(d.post);
      setReplies(d.post.replies || []);
    } catch {}
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setBusy(true); setError("");
    try {
      const d = await api("/forum", { method: "POST", body: { action: "reply", postId: selectedPost.id, body: replyText } });
      setReplies([...replies, d.reply]);
      setReplyText("");
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const toggleLike = async (postId) => {
    try {
      const d = await api("/forum", { method: "POST", body: { action: "like", postId } });
      // Refresh post
      if (selectedPost?.id === postId) {
        const pd = await api(`/forum?id=${postId}`);
        setSelectedPost(pd.post);
      }
      loadPosts();
    } catch {}
  };

  const createPost = async () => {
    if (!newTitle.trim() || !newBody.trim()) { setError("Title and body are required"); return; }
    setBusy(true); setError("");
    try {
      await api("/forum", { method: "POST", body: { title: newTitle, body: newBody, tags: newTags } });
      setNewTitle(""); setNewBody(""); setNewTags([]);
      setView("list");
      loadPosts();
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (loading) return <Loading msg="Loading forum" />;

  // ── NEW POST ──
  if (view === "new") return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>New post</h2>
      <Inp label="Title" placeholder="What's your question?" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
      <TextArea label="Body" placeholder="Share details, context, and what you've tried..." value={newBody} onChange={e => setNewBody(e.target.value)} style={{ minHeight: 120 }} />
      <div>
        <SectionLabel>Tags</SectionLabel>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {["nutrition", "training", "supplementation", "peds", "mindset"].map(t => (
            <Pill key={t} active={newTags.includes(t)} onClick={() => setNewTags(newTags.includes(t) ? newTags.filter(x => x !== t) : [...newTags, t])}>{t}</Pill>
          ))}
        </div>
      </div>
      <ErrorMsg>{error}</ErrorMsg>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="secondary" onClick={() => setView("list")}>Cancel</Btn>
        <Btn onClick={createPost} disabled={busy}>{busy ? "Posting..." : "Post"}</Btn>
      </div>
    </div>
  );

  // ── POST DETAIL ──
  if (view === "detail" && selectedPost) return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={() => { setView("list"); setSelectedPost(null); }} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans'", textAlign: "left" }}>← Back to forum</button>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar name={selectedPost.author?.name} size={32} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedPost.author?.name}</div>
            <div style={{ fontSize: 11, color: C.t4 }}>{selectedPost.author?.role === "COACH" ? "Coach" : "Member"} · {new Date(selectedPost.createdAt).toLocaleDateString("en-ZA")}</div>
          </div>
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{selectedPost.title}</h3>
        <p style={{ fontSize: 14, color: C.t2, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selectedPost.body}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <button onClick={() => toggleLike(selectedPost.id)} style={{ background: "none", border: `1px solid ${C.border}`, color: selectedPost.userLiked ? C.pink : C.t3, padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans'", display: "flex", alignItems: "center", gap: 4 }}>
            {selectedPost.userLiked ? "❤️" : "🤍"} {selectedPost._count?.likes || 0}
          </button>
          <span style={{ fontSize: 12, color: C.t3, display: "flex", alignItems: "center" }}>{replies.length} replies</span>
          {(selectedPost.tags || []).map(t => <span key={t} style={{ background: "rgba(168,85,247,0.08)", padding: "4px 10px", borderRadius: 6, fontSize: 10, color: C.purple }}>{t}</span>)}
        </div>
      </Card>

      {/* Replies */}
      <SectionLabel>Replies</SectionLabel>
      {replies.map(r => (
        <Card key={r.id} style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Avatar name={r.author?.name} size={24} color={r.author?.role === "COACH" ? C.pink : C.violet} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{r.author?.name}</span>
            {r.author?.role === "COACH" && <span style={{ fontSize: 9, background: "rgba(236,72,153,0.1)", color: C.pink, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>Coach</span>}
            <span style={{ fontSize: 11, color: C.t4, marginLeft: "auto" }}>{new Date(r.createdAt).toLocaleDateString("en-ZA")}</span>
          </div>
          <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>{r.body}</p>
        </Card>
      ))}

      {/* Reply input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReply()}
          style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" }} />
        <button onClick={sendReply} disabled={busy} style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: 10, cursor: "pointer", fontSize: 16 }}>↑</button>
      </div>
      <ErrorMsg>{error}</ErrorMsg>
    </div>
  );

  // ── LIST VIEW ──
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Community</h2>
        <button onClick={() => setView("new")} style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: C.purple, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>+ Post</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["all", "nutrition", "training", "supplementation", "peds", "mindset"].map(f => (
          <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>
        ))}
      </div>

      {posts.length === 0 ? <Empty icon="💬" title="No posts yet" action="Start a conversation" onAction={() => setView("new")} /> : posts.map(p => (
        <Card key={p.id} onClick={() => openPost(p)} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Avatar name={p.author?.name} size={28} color={p.author?.role === "COACH" ? C.pink : C.violet} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{p.author?.name}</span>
            {p.author?.role === "COACH" && <span style={{ fontSize: 9, background: "rgba(236,72,153,0.1)", color: C.pink, padding: "1px 5px", borderRadius: 3 }}>Coach</span>}
            <span style={{ fontSize: 11, color: C.t4, marginLeft: "auto" }}>{new Date(p.createdAt).toLocaleDateString("en-ZA")}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
          <p style={{ fontSize: 13, color: C.t3, lineHeight: 1.5 }}>{p.body?.length > 120 ? p.body.slice(0, 120) + "..." : p.body}</p>
          <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: C.t4 }}>
            <span>❤️ {p._count?.likes || 0}</span>
            <span>💬 {p._count?.replies || 0}</span>
            {(p.tags || []).map(t => <span key={t} style={{ background: "rgba(168,85,247,0.08)", padding: "2px 8px", borderRadius: 4, color: C.purple }}>{t}</span>)}
          </div>
        </Card>
      ))}
    </div>
  );
}
