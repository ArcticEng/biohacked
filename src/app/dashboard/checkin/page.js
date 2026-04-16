"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, Inp, TextArea, Pill, RatingSlider, SectionLabel, ErrorMsg, C, api } from "@/components/ui";

const SUPPLEMENTS = ["Creatine", "Whey Protein", "Vitamin D", "Omega 3", "Magnesium", "Pre-Workout", "BCAA", "Zinc", "Multivitamin", "Ashwagandha"];
const PHOTO_TYPES = ["front", "side", "back", "training", "posing"];

export default function CheckinPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [style, setStyle] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // { front: "/uploads/xxx.jpg", side: null, ... }
  const [photos, setPhotos] = useState({});
  const [uploadingType, setUploadingType] = useState(null);
  const fileInputs = useRef({});

  const [d, setD] = useState({
    weight: "", calories: "", protein: "", hydration: "", caffeine: "",
    cravings: "", appetite: "", digestionRating: 7,
    steps: "", cardioMinutes: "", trainingStatus: "", trainingRating: 7,
    sleepHours: "", sleepQuality: 7, energyLevel: 7, stressLevel: 5, sorenessLevel: 5,
    supplements: [],
    lifestyleTraining: "", lifestyleRecovery: "", lifestyleDiet: "", lifestyleSteps: "",
    lifestyleHydration: "", lifestyleEvents: "", lifestyleWin: "", lifestyleFromCoach: "",
    digestNotes: "", generalNotes: "",
    arms: "", shoulders: "", back: "", waist: "", hips: "", glutes: "", quads: "",
  });

  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const toggleSupp = (s) => setD(x => ({ ...x, supplements: x.supplements.includes(s) ? x.supplements.filter(i => i !== s) : [...x.supplements, s] }));

  const onPhotoPick = async (type, file) => {
    if (!file) return;
    setUploadingType(type); setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      const { url } = await res.json();
      setPhotos(p => ({ ...p, [type]: url }));
    } catch (e) { setError(e.message); }
    setUploadingType(null);
  };

  const removePhoto = (type) => setPhotos(p => { const n = { ...p }; delete n[type]; return n; });

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const body = { style };
      if (style === "DETAILED") {
        Object.assign(body, {
          weight: parseFloat(d.weight) || undefined,
          calories: parseInt(d.calories) || undefined,
          protein: parseFloat(d.protein) || undefined,
          hydration: parseFloat(d.hydration) || undefined,
          caffeine: parseInt(d.caffeine) || undefined,
          cravings: d.cravings || undefined,
          appetite: d.appetite || undefined,
          digestionRating: d.digestionRating,
          steps: parseInt(d.steps) || undefined,
          cardioMinutes: parseInt(d.cardioMinutes) || undefined,
          trainingStatus: d.trainingStatus || undefined,
          trainingRating: d.trainingRating,
          sleepHours: parseFloat(d.sleepHours) || undefined,
          sleepQuality: d.sleepQuality,
          energyLevel: d.energyLevel,
          stressLevel: d.stressLevel,
          sorenessLevel: d.sorenessLevel,
          supplements: d.supplements,
          digestNotes: d.digestNotes || undefined,
          generalNotes: d.generalNotes || undefined,
        });
        const photoList = Object.entries(photos).filter(([, url]) => !!url).map(([type, url]) => ({ type, url }));
        if (photoList.length) body.photos = photoList;
      } else {
        Object.assign(body, {
          lifestyleTraining: d.lifestyleTraining || undefined,
          lifestyleRecovery: d.lifestyleRecovery || undefined,
          lifestyleDiet: d.lifestyleDiet || undefined,
          lifestyleSteps: d.lifestyleSteps || undefined,
          lifestyleHydration: d.lifestyleHydration || undefined,
          lifestyleEvents: d.lifestyleEvents || undefined,
          lifestyleWin: d.lifestyleWin || undefined,
          lifestyleFromCoach: d.lifestyleFromCoach || undefined,
        });
      }
      body.measurements = {
        arms: parseFloat(d.arms) || undefined,
        shoulders: parseFloat(d.shoulders) || undefined,
        back: parseFloat(d.back) || undefined,
        waist: parseFloat(d.waist) || undefined,
        hips: parseFloat(d.hips) || undefined,
        glutes: parseFloat(d.glutes) || undefined,
        quads: parseFloat(d.quads) || undefined,
      };

      await api("/checkins", { method: "POST", body });
      setSuccess(true);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (success) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Check-in submitted</h2>
      <p style={{ color: C.t3, fontSize: 14, marginBottom: 24 }}>Your coach will review it shortly.</p>
      <Btn onClick={() => router.push("/dashboard")} style={{ maxWidth: 240, margin: "0 auto" }}>Back to dashboard</Btn>
    </div>
  );

  // ── STYLE SELECTOR ──
  if (!style) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div><h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Daily check-in</h2><p style={{ fontSize: 13, color: C.t3, marginTop: 4 }}>Choose your check-in style</p></div>

      <Card onClick={() => setStyle("DETAILED")} style={{ cursor: "pointer", borderColor: "rgba(168,85,247,0.25)" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Detailed check-in</div>
        <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.5 }}>Full daily metrics for prep phases — weight, nutrition, hydration, steps, recovery, supplements, measurements.</div>
      </Card>

      <Card onClick={() => setStyle("LIFESTYLE")} style={{ cursor: "pointer", borderColor: "rgba(245,158,11,0.25)" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Lifestyle check-in</div>
        <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.5 }}>Weekly summary for off-season — 8 open-ended prompts covering training, recovery, diet, events and wins.</div>
      </Card>
    </div>
  );

  // ── LIFESTYLE ──
  if (style === "LIFESTYLE") {
    const prompts = [
      { emoji: "💪", label: "Training", key: "lifestyleTraining", hint: "How was training? Progress/regress? Miss any sessions?" },
      { emoji: "😴", label: "Recovery", key: "lifestyleRecovery", hint: "How has recovery been? Sleep and soreness?" },
      { emoji: "🥗", label: "Diet", key: "lifestyleDiet", hint: "Stay on plan? Off-plan meals? Meals you don't like?" },
      { emoji: "🚶", label: "Steps & cardio", key: "lifestyleSteps", hint: "Hit your daily step/cardio goal?" },
      { emoji: "💧", label: "Hydration", key: "lifestyleHydration", hint: "Water and electrolytes?" },
      { emoji: "📅", label: "Events", key: "lifestyleEvents", hint: "Any upcoming events that'll affect the plan?" },
      { emoji: "🏆", label: "Biggest win", key: "lifestyleWin", hint: "What's your biggest win this week?" },
      { emoji: "🙋", label: "From your coach", key: "lifestyleFromCoach", hint: "Anything you need from me?" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setStyle(null)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16 }}>←</button>
          <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Weekly lifestyle check-in</h2>
        </div>
        {prompts.map(p => (
          <div key={p.key}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><span>{p.emoji}</span>{p.label}</div>
            <textarea value={d[p.key]} onChange={e => set(p.key, e.target.value)} placeholder={p.hint} rows={3}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none", resize: "vertical" }} />
          </div>
        ))}
        <ErrorMsg>{error}</ErrorMsg>
        <Btn onClick={submit} disabled={busy}>{busy ? "Submitting..." : "Submit check-in ✓"}</Btn>
      </div>
    );
  }

  // ── DETAILED ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setStyle(null)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16 }}>←</button>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Detailed check-in</h2>
      </div>

      {/* Nutrition */}
      <Card>
        <SectionLabel>🔥 Nutrition</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <Inp label="Morning weight (kg)" type="number" step="0.1" placeholder="85.2" value={d.weight} onChange={e => set("weight", e.target.value)} />
          <Inp label="Calories" type="number" placeholder="2200" value={d.calories} onChange={e => set("calories", e.target.value)} />
          <Inp label="Protein (g)" type="number" placeholder="180" value={d.protein} onChange={e => set("protein", e.target.value)} />
          <Inp label="Hydration (L)" type="number" step="0.1" placeholder="2.5" value={d.hydration} onChange={e => set("hydration", e.target.value)} />
          <Inp label="Caffeine (mg)" type="number" placeholder="200" value={d.caffeine} onChange={e => set("caffeine", e.target.value)} />
          <div>
            <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Cravings</label>
            <select value={d.cravings} onChange={e => set("cravings", e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" }}>
              <option value="">—</option><option value="low">Low</option><option value="average">Average</option><option value="high">High</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Appetite</label>
            <select value={d.appetite} onChange={e => set("appetite", e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" }}>
              <option value="">—</option><option value="low">Low</option><option value="average">Average</option><option value="high">High</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14 }}><RatingSlider label="Digestion" value={d.digestionRating} onChange={v => set("digestionRating", v)} /></div>
        <Inp label="Digestion notes" placeholder="Foods that affected digestion..." value={d.digestNotes} onChange={e => set("digestNotes", e.target.value)} style={{ marginTop: 10 }} />
      </Card>

      {/* Expenditure */}
      <Card>
        <SectionLabel>⚡ Expenditure</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <Inp label="Daily steps" type="number" placeholder="8000" value={d.steps} onChange={e => set("steps", e.target.value)} />
          <Inp label="Cardio (min)" type="number" placeholder="30" value={d.cardioMinutes} onChange={e => set("cardioMinutes", e.target.value)} />
        </div>
        <div style={{ marginTop: 14 }}>
          <SectionLabel>Training performance</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {[["progress", "📈 Progress", C.green], ["maintain", "➡️ Maintain", C.amber], ["regress", "📉 Regress", C.red]].map(([v, l, col]) => (
              <button key={v} onClick={() => set("trainingStatus", v)} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: `1px solid ${d.trainingStatus === v ? col + "60" : C.border}`, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'", fontWeight: 600, background: d.trainingStatus === v ? `${col}18` : "rgba(255,255,255,0.02)", color: d.trainingStatus === v ? col : C.t3 }}>{l}</button>
            ))}
          </div>
          <div style={{ marginTop: 12 }}><RatingSlider label="Training rating" value={d.trainingRating} onChange={v => set("trainingRating", v)} /></div>
        </div>
      </Card>

      {/* Recovery */}
      <Card>
        <SectionLabel>🌙 Recovery</SectionLabel>
        <div style={{ marginTop: 12 }}>
          <Inp label="Sleep (hours)" type="number" step="0.5" placeholder="7.5" value={d.sleepHours} onChange={e => set("sleepHours", e.target.value)} />
        </div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <RatingSlider label="Sleep quality" value={d.sleepQuality} onChange={v => set("sleepQuality", v)} />
          <RatingSlider label="Energy" value={d.energyLevel} onChange={v => set("energyLevel", v)} />
          <RatingSlider label="Stress (10 = highest)" value={d.stressLevel} onChange={v => set("stressLevel", v)} />
          <RatingSlider label="Muscle soreness (10 = most)" value={d.sorenessLevel} onChange={v => set("sorenessLevel", v)} />
        </div>
      </Card>

      {/* Supplements */}
      <Card>
        <SectionLabel>💊 Supplements taken</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {SUPPLEMENTS.map(s => <Pill key={s} active={d.supplements.includes(s)} onClick={() => toggleSupp(s)}>{d.supplements.includes(s) ? "✓ " : ""}{s}</Pill>)}
        </div>
      </Card>

      {/* Photos — real upload */}
      <Card>
        <SectionLabel>📸 Progress photos</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10, marginTop: 12 }}>
          {PHOTO_TYPES.map(type => {
            const url = photos[type];
            const isUploading = uploadingType === type;
            return (
              <div key={type} style={{ position: "relative" }}>
                <input
                  ref={el => (fileInputs.current[type] = el)}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => onPhotoPick(type, e.target.files?.[0])}
                />
                <div
                  onClick={() => !isUploading && fileInputs.current[type]?.click()}
                  style={{
                    aspectRatio: "1",
                    border: url ? `1px solid ${C.border}` : `2px dashed ${C.border}`,
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isUploading ? "wait" : "pointer",
                    background: url ? `url(${url}) center/cover` : "rgba(255,255,255,0.02)",
                    opacity: isUploading ? 0.5 : 1,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {!url && !isUploading && (<><div style={{ fontSize: 22 }}>📷</div><div style={{ color: C.t4, fontSize: 10, marginTop: 4, textTransform: "capitalize" }}>{type}</div></>)}
                  {isUploading && <div style={{ fontSize: 11, color: C.t3 }}>Uploading…</div>}
                  {url && !isUploading && (
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent 40%)", display: "flex", alignItems: "flex-end", padding: 6 }}>
                      <span style={{ color: "#fff", fontSize: 10, fontWeight: 600, textTransform: "capitalize" }}>{type}</span>
                    </div>
                  )}
                </div>
                {url && (
                  <button
                    onClick={() => removePhoto(type)}
                    style={{
                      position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%",
                      background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: 11,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    }}
                  >×</button>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: C.t4, marginTop: 8, textAlign: "center" }}>Tap a tile to upload. Max 8MB, PNG/JPG/WEBP.</p>
      </Card>

      {/* Measurements */}
      <Card>
        <SectionLabel>📏 Body measurements (cm)</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
          {["arms", "shoulders", "back", "waist", "hips", "glutes", "quads"].map(m => (
            <div key={m}>
              <input type="number" step="0.1" placeholder="—" value={d[m]} onChange={e => set(m, e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "10px", borderRadius: 8, fontSize: 14, outline: "none", textAlign: "center", fontFamily: "'DM Sans'", fontWeight: 600 }} />
              <div style={{ fontSize: 9, textAlign: "center", marginTop: 4, color: C.t4, textTransform: "capitalize", letterSpacing: 1 }}>{m}</div>
            </div>
          ))}
        </div>
      </Card>

      <TextArea label="Notes for coach" placeholder="Anything unusual, questions, schedule changes..." value={d.generalNotes} onChange={e => set("generalNotes", e.target.value)} />

      <ErrorMsg>{error}</ErrorMsg>
      <Btn onClick={submit} disabled={busy}>{busy ? "Submitting..." : "Submit check-in ✓"}</Btn>
    </div>
  );
}
