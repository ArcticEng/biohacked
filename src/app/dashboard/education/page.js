"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, Inp, Pill, TabBar, SectionLabel, Loading, C, api } from "@/components/ui";

export default function EducationPage() {
  const { isPremium } = useAuth();
  const [tab, setTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [papers, setPapers] = useState([]);
  const [videoFilter, setVideoFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // AI research analysis
  const [analyseQ, setAnalyseQ] = useState("");
  const [analyseLoading, setAnalyseLoading] = useState(false);
  const [analyseResult, setAnalyseResult] = useState(null);

  const [summaryLoading, setSummaryLoading] = useState(null);
  const [summaries, setSummaries] = useState({});

  useEffect(() => {
    Promise.all([
      api("/education").then(d => setVideos(d.videos || [])),
      api("/education?type=papers").then(d => setPapers(d.papers || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const analyseTopic = async () => {
    if (!analyseQ) return;
    setAnalyseLoading(true);
    try {
      const d = await api("/education", { method: "POST", body: { action: "analyse", topic: analyseQ } });
      setAnalyseResult(d.summary);
    } catch (e) { alert(e.message); }
    setAnalyseLoading(false);
  };

  const summarize = async (paperId) => {
    if (summaries[paperId]) return;
    setSummaryLoading(paperId);
    try {
      const d = await api("/education", { method: "POST", body: { action: "summarize", paperId } });
      setSummaries(s => ({ ...s, [paperId]: d.summary }));
    } catch (e) { alert(e.message); }
    setSummaryLoading(null);
  };

  if (loading) return <Loading msg="Loading education" />;

  const categories = ["all", ...new Set(videos.map(v => v.category))];
  const filtered = videoFilter === "all" ? videos : videos.filter(v => v.category === videoFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Education library</h2>
      <TabBar tabs={["videos", "research"]} active={tab} onChange={setTab} />

      {tab === "videos" && (<>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {categories.map(c => <Pill key={c} active={videoFilter === c} onClick={() => setVideoFilter(c)}>{c}</Pill>)}
        </div>
        {filtered.map(v => (
          <Card key={v.id} style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 80, height: 54, borderRadius: 8, background: "rgba(168,85,247,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>▶</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{v.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.t3 }}>
                <span>{v.author?.name || v.authorName}</span>
                {v.author?.verified && <span title="Verified educator" style={{ color: C.green, fontSize: 10 }}>✓</span>}
              </div>
              {v.author?.credentials && <div style={{ fontSize: 10, color: C.t4, marginTop: 2 }}>{v.author.credentials}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: C.t4 }}>
                {v.duration && <span>{Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, "0")}</span>}
                <span>{v.views?.toLocaleString()} views</span>
                <span style={{ background: "rgba(168,85,247,0.08)", padding: "1px 6px", borderRadius: 4, color: C.purple }}>{v.category}</span>
              </div>
            </div>
          </Card>
        ))}
      </>)}

      {tab === "research" && (<>
        {/* AI topic analyser */}
        <Card style={{ borderColor: "rgba(245,158,11,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <SectionLabel>AI research breakdown</SectionLabel>
            <span style={{ fontSize: 9, background: "rgba(245,158,11,0.1)", color: C.amber, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>PREMIUM</span>
          </div>
          <p style={{ fontSize: 12, color: C.t3, marginBottom: 10 }}>Enter a topic for an AI-powered evidence summary.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="e.g. creatine and strength, BPC-157..." value={analyseQ} onChange={e => setAnalyseQ(e.target.value)}
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "10px 12px", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans'", outline: "none" }} />
            <button onClick={analyseTopic} disabled={analyseLoading || !analyseQ || !isPremium} style={{ background: isPremium ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.04)", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: isPremium ? "pointer" : "not-allowed", fontFamily: "'DM Sans'", opacity: isPremium ? 1 : 0.5 }}>
              {analyseLoading ? "⚙️" : "⚡"} Analyse
            </button>
          </div>
          {analyseResult && (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
              <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.7, marginBottom: 10 }}>{analyseResult.bottomLine}</p>
              {analyseResult.keyFindings && (<>
                <div style={{ fontSize: 11, color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Key findings</div>
                {analyseResult.keyFindings.map((f, i) => <div key={i} style={{ fontSize: 12, color: C.t2, marginBottom: 4, paddingLeft: 10, borderLeft: `2px solid rgba(168,85,247,0.2)` }}>{f}</div>)}
              </>)}
            </div>
          )}
        </Card>

        {papers.map(p => (
          <Card key={p.id}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: C.t3 }}>{p.authors?.join(", ")} · {p.journal} · {p.year}</div>
            <div style={{ fontSize: 11, color: C.t4, marginTop: 2, textTransform: "capitalize" }}>{p.category}</div>

            {!summaries[p.id] && (
              <button onClick={() => summarize(p.id)} disabled={summaryLoading === p.id || !isPremium} style={{
                marginTop: 10, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)",
                color: isPremium ? C.purple : C.t4, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: isPremium ? "pointer" : "not-allowed", fontFamily: "'DM Sans'",
              }}>{summaryLoading === p.id ? "Generating..." : isPremium ? "AI summary" : "Premium — AI summary"}</button>
            )}

            {summaries[p.id] && (
              <div style={{ marginTop: 12, padding: 12, background: "rgba(168,85,247,0.04)", borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.7, marginBottom: 8 }}>{summaries[p.id].bottomLine}</p>
                {summaries[p.id].keyFindings?.map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.t2, marginBottom: 4, paddingLeft: 10, borderLeft: `2px solid rgba(168,85,247,0.2)` }}>{f}</div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </>)}
    </div>
  );
}
