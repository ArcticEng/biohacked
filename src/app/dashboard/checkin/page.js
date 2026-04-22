"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, Inp, TextArea, RatingSlider, SectionLabel, ErrorMsg, Loading, C, api } from "@/components/ui";

const PHOTO_TYPES = ["front", "side", "back", "training", "posing"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Get the Monday that starts the current check-in week relative to photoDay
function getWeekStart(photoDay) {
  const now = new Date();
  const today = now.getDay(); // 0=Sun
  const pdIdx = DAY_NAMES.indexOf(photoDay || "Monday");
  // Week runs from the day AFTER last check-in day to check-in day
  // e.g. if photoDay = Tuesday, week = Wed→Tue
  let diff = today - pdIdx;
  if (diff < 0) diff += 7;
  // If today IS check-in day, we're still in the current week
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() - diff);
  weekEnd.setHours(0, 0, 0, 0);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6);
  return weekStart;
}

function formatDateShort(d) { return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }); }
function formatWeekLabel(start, goal) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${goal || "Week"} — ${formatDateShort(start)} – ${formatDateShort(end)}`;
}

export default function CheckinPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weekDrafts, setWeekDrafts] = useState([]); // existing daily entries this week
  const [coachSupps, setCoachSupps] = useState([]);
  const [planMacros, setPlanMacros] = useState(null);
  const [todayEntry, setTodayEntry] = useState(null); // already logged today?
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const photoDay = user?.photoDay || "Tuesday";
  const today = DAY_NAMES[new Date().getDay()];
  const isCheckinDay = today === photoDay;
  const weekStart = getWeekStart(photoDay);

  // Photos
  const [photos, setPhotos] = useState({});
  const [uploadingType, setUploadingType] = useState(null);
  const fileInputs = useRef({});

  // Daily form
  const [d, setD] = useState({
    weight: "", calories: "", protein: "", hydration: "", caffeine: "",
    cravings: "", appetite: "", digestionRating: 7,
    steps: "", cardioMinutes: "", trainingStatus: "", trainingRating: 7,
    sleepHours: "", sleepQuality: 7, energyLevel: 7, stressLevel: 5, sorenessLevel: 5,
    supplementLog: [], periodDay: false,
    digestNotes: "", generalNotes: "",
    arms: "", shoulders: "", back: "", waist: "", hips: "", glutes: "", quads: "",
  });

  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const toggleSuppLog = (idx) => setD(s => ({ ...s, supplementLog: s.supplementLog.map((sl, i) => i === idx ? { ...sl, taken: !sl.taken } : sl) }));

  // Load existing week data
  useEffect(() => {
    (async () => {
      try {
        const [chd, sp, mp] = await Promise.all([
          api(`/checkins?week=current`),
          api("/supplements"),
          api("/meal-plans?current=1"),
        ]);
        setWeekDrafts(chd.checkins || []);
        setCoachSupps(sp.supplements || []);
        if (mp.mealPlan) setPlanMacros({ calories: mp.mealPlan.totalCalories, protein: mp.mealPlan.totalProtein });

        // Check if already logged today
        const todayStr = new Date().toISOString().slice(0, 10);
        const existing = (chd.checkins || []).find(c => new Date(c.date).toISOString().slice(0, 10) === todayStr);
        if (existing) setTodayEntry(existing);
      } catch {}
      setLoading(false);
    })();
  }, []);

  // Auto-fill macros from plan
  useEffect(() => {
    if (planMacros && !d.calories && !d.protein) {
      setD(s => ({ ...s, calories: String(planMacros.calories || ""), protein: String(planMacros.protein || "") }));
    }
  }, [planMacros]);

  // Init supplement checkboxes from coach list
  useEffect(() => {
    if (coachSupps.length > 0 && d.supplementLog.length === 0) {
      setD(s => ({ ...s, supplementLog: coachSupps.map(s => ({ name: s.name, dosage: s.dosage || "", taken: false })) }));
    }
  }, [coachSupps]);

  // Photo upload
  const onPhotoPick = async (type, file) => {
    if (!file) return;
    setUploadingType(type); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Upload failed"); }
      const { url } = await res.json();
      setPhotos(p => ({ ...p, [type]: url }));
    } catch (e) { setError(e.message); }
    setUploadingType(null);
  };

  // Save today's daily log (draft — coach can't see it yet)
  const saveDaily = async () => {
    setBusy(true); setError(""); setSaved(false);
    try {
      const body = {
        style: "DETAILED", action: "save_draft",
        weekStart: weekStart.toISOString(),
        weekLabel: formatWeekLabel(weekStart, user?.goal),
        periodDay: d.periodDay,
        weight: parseFloat(d.weight) || undefined,
        calories: parseInt(d.calories) || undefined,
        protein: parseFloat(d.protein) || undefined,
        planCalories: planMacros?.calories || undefined,
        planProtein: planMacros?.protein || undefined,
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
        supplementLog: d.supplementLog,
        supplements: d.supplementLog.filter(s => s.taken).map(s => s.name),
        digestNotes: d.digestNotes || undefined,
        generalNotes: d.generalNotes || undefined,
      };

      // Photos + measurements only on check-in day
      if (isCheckinDay) {
        const photoList = Object.entries(photos).filter(([, url]) => !!url).map(([type, url]) => ({ type, url }));
        if (photoList.length) body.photos = photoList;
        body.measurements = {
          arms: parseFloat(d.arms) || undefined, shoulders: parseFloat(d.shoulders) || undefined,
          back: parseFloat(d.back) || undefined, waist: parseFloat(d.waist) || undefined,
          hips: parseFloat(d.hips) || undefined, glutes: parseFloat(d.glutes) || undefined,
          quads: parseFloat(d.quads) || undefined,
        };
      }

      // If editing today's entry, include its ID
      if (todayEntry?.id) body.existingId = todayEntry.id;

      await api("/checkins", { method: "POST", body });
      setSaved(true);
      // Reload week
      const chd = await api(`/checkins?week=current`);
      setWeekDrafts(chd.checkins || []);
      const todayStr = new Date().toISOString().slice(0, 10);
      setTodayEntry((chd.checkins || []).find(c => new Date(c.date).toISOString().slice(0, 10) === todayStr));
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  // Submit whole week to coach
  const submitWeek = async () => {
    // Validate: must have photos on check-in day
    const hasRequiredPhotos = ["front", "side", "back"].every(t => {
      return weekDrafts.some(c => c.photos?.some(p => p.type === t)) || photos[t];
    });
    if (!hasRequiredPhotos) {
      setError("Please upload front, side, and back photos before submitting your weekly check-in.");
      return;
    }
    if (weekDrafts.length === 0) {
      setError("No daily entries to submit. Log at least one day first.");
      return;
    }

    setBusy(true); setError("");
    try {
      await api("/checkins", { method: "POST", body: { action: "submit_week", weekStart: weekStart.toISOString() } });
      setSubmitted(true);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (loading) return <Loading msg="Loading check-in" />;

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 700, marginBottom: 8, color: C.t1 }}>Weekly check-in submitted</h2>
      <p style={{ color: C.t3, fontSize: 14, marginBottom: 24 }}>Your coach will review your full week shortly.</p>
      <Btn onClick={() => router.push("/dashboard")} style={{ maxWidth: 240, margin: "0 auto" }}>Back to dashboard</Btn>
    </div>
  );

  const draftCount = weekDrafts.filter(c => !c.submitted).length;
  const alreadySubmitted = weekDrafts.length > 0 && weekDrafts.every(c => c.submitted);

  const inputStyle = { background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700, color: C.t1 }}>Daily log</h2>
        <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{formatWeekLabel(weekStart, user?.goal)}</p>
      </div>

      {/* Week overview strip */}
      <Card>
        <SectionLabel>This week ({draftCount}/7 days logged)</SectionLabel>
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            const dayStr = dayDate.toISOString().slice(0, 10);
            const hasEntry = weekDrafts.some(c => new Date(c.date).toISOString().slice(0, 10) === dayStr);
            const isToday = dayStr === new Date().toISOString().slice(0, 10);
            const dayName = DAY_NAMES[dayDate.getDay()].slice(0, 3);
            const isCD = DAY_NAMES[dayDate.getDay()] === photoDay;
            return (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: "6px 2px", borderRadius: 8, background: isToday ? "var(--purple-surface)" : hasEntry ? "var(--green-surface)" : C.subtle, border: `1px solid ${isToday ? "var(--purple-border)" : hasEntry ? "rgba(34,197,94,0.2)" : "transparent"}` }}>
                <div style={{ fontSize: 9, color: isCD ? C.purple : C.t4, fontWeight: isCD ? 700 : 400 }}>{dayName}</div>
                <div style={{ fontSize: 11, color: isToday ? C.purple : C.t2, fontWeight: 600, marginTop: 2 }}>{dayDate.getDate()}</div>
                {hasEntry && <div style={{ fontSize: 8, marginTop: 2 }}>✓</div>}
                {isCD && <div style={{ fontSize: 7, color: C.purple, marginTop: 1 }}>📸</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {alreadySubmitted ? (
        <Card style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.t1 }}>This week is submitted</div>
          <p style={{ color: C.t3, fontSize: 12, marginTop: 6 }}>Waiting for coach feedback. Your next week starts on {photoDay}.</p>
        </Card>
      ) : (<>
        {todayEntry && saved ? (
          <Card style={{ background: "var(--green-surface)", borderColor: "rgba(34,197,94,0.2)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>✓ Today's log saved</div>
            <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>You can edit it by filling in the form again below.</p>
          </Card>
        ) : todayEntry ? (
          <Card style={{ background: "var(--green-surface)", borderColor: "rgba(34,197,94,0.2)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>✓ Already logged today ({todayEntry.weight ? `${todayEntry.weight}kg` : "no weight"})</div>
            <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Fill in the form to update today's entry.</p>
          </Card>
        ) : null}

        {/* Period toggle */}
        {user?.gender === "FEMALE" && (
          <Card style={{ borderColor: d.periodDay ? "var(--purple-border)" : C.border }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>🩸 Period today?</div><div style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>Helps track your cycle</div></div>
              <button onClick={() => set("periodDay", !d.periodDay)} style={{ width: 44, height: 24, borderRadius: 12, background: d.periodDay ? "#ec4899" : "var(--border)", padding: 2, cursor: "pointer", border: "none" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "all 0.2s", transform: d.periodDay ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>
          </Card>
        )}

        {/* Daily metrics */}
        <Card>
          <SectionLabel>🔥 Nutrition</SectionLabel>
          {planMacros && <div style={{ fontSize: 11, color: C.t4, marginTop: 6, padding: "6px 10px", background: C.subtle, borderRadius: 6 }}>Auto-filled from meal plan. Edit if off-plan.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <Inp label="Morning weight (kg)" type="number" step="0.1" value={d.weight} onChange={e => set("weight", e.target.value)} />
            <Inp label="Calories" type="number" value={d.calories} onChange={e => set("calories", e.target.value)} />
            <Inp label="Protein (g)" type="number" value={d.protein} onChange={e => set("protein", e.target.value)} />
            <Inp label="Hydration (L)" type="number" step="0.1" value={d.hydration} onChange={e => set("hydration", e.target.value)} />
            <Inp label="Caffeine (mg)" type="number" value={d.caffeine} onChange={e => set("caffeine", e.target.value)} />
          </div>
        </Card>

        <Card>
          <SectionLabel>⚡ Activity</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <Inp label="Steps" type="number" value={d.steps} onChange={e => set("steps", e.target.value)} />
            <Inp label="Cardio (min)" type="number" value={d.cardioMinutes} onChange={e => set("cardioMinutes", e.target.value)} />
          </div>
          <div style={{ marginTop: 14 }}>
            <SectionLabel>Training performance</SectionLabel>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {[["progress", "📈 Progress"], ["maintain", "➡️ Maintain"], ["regress", "📉 Regress"]].map(([v, l]) => (
                <button key={v} onClick={() => set("trainingStatus", v)} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: `1px solid ${d.trainingStatus === v ? "var(--purple-border)" : C.border}`, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'", fontWeight: 600, background: d.trainingStatus === v ? "var(--purple-surface)" : C.subtle, color: d.trainingStatus === v ? C.purple : C.t3 }}>{l}</button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <SectionLabel>🌙 Recovery</SectionLabel>
          <div style={{ marginTop: 12 }}><Inp label="Sleep (hours)" type="number" step="0.5" value={d.sleepHours} onChange={e => set("sleepHours", e.target.value)} /></div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <RatingSlider label="Energy" value={d.energyLevel} onChange={v => set("energyLevel", v)} />
            <RatingSlider label="Stress" value={d.stressLevel} onChange={v => set("stressLevel", v)} />
            <RatingSlider label="Soreness" value={d.sorenessLevel} onChange={v => set("sorenessLevel", v)} />
          </div>
        </Card>

        {/* Supplements */}
        {d.supplementLog.length > 0 && (
          <Card>
            <SectionLabel>💊 Supplements</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
              {d.supplementLog.map((s, i) => (
                <button key={i} onClick={() => toggleSuppLog(i)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, cursor: "pointer", background: s.taken ? "var(--green-surface)" : C.subtle, border: `1px solid ${s.taken ? "rgba(34,197,94,0.3)" : C.border}`, color: C.t1, fontFamily: "'DM Sans'", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{s.taken ? "✅" : "⬜"}</span>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    {s.dosage && <span style={{ color: C.t3, fontSize: 11 }}>{s.dosage}</span>}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        <TextArea label="Notes for coach" placeholder="Anything unusual, questions..." value={d.generalNotes} onChange={e => set("generalNotes", e.target.value)} />

        {/* SAVE DAILY — always available */}
        <Btn onClick={saveDaily} disabled={busy}>{busy ? "Saving..." : todayEntry ? "Update today's log" : "Save today's log"}</Btn>
        {saved && <div style={{ color: C.green, fontSize: 12, textAlign: "center" }}>✓ Saved</div>}

        {/* CHECK-IN DAY EXTRAS — photos + measurements + submit */}
        {isCheckinDay && (<>
          <div style={{ marginTop: 8, padding: "12px 16px", background: "var(--purple-surface)", border: `1px solid var(--purple-border)`, borderRadius: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>📸 It's check-in day!</div>
            <p style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>Take your measurements and upload front, side, and back photos, then submit your weekly check-in.</p>
          </div>

          <Card>
            <SectionLabel>📏 Body measurements (cm)</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
              {["arms", "shoulders", "back", "waist", "hips", "glutes", "quads"].map(m => (
                <div key={m}>
                  <input type="number" step="0.1" placeholder="—" value={d[m]} onChange={e => set(m, e.target.value)} style={{ width: "100%", background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "10px", borderRadius: 8, fontSize: 14, outline: "none", textAlign: "center", fontFamily: "'DM Sans'", fontWeight: 600 }} />
                  <div style={{ fontSize: 9, textAlign: "center", marginTop: 4, color: C.t4, textTransform: "capitalize", letterSpacing: 1 }}>{m}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel>📸 Progress photos (required)</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10, marginTop: 12 }}>
              {PHOTO_TYPES.map(type => {
                const url = photos[type];
                const isUploading = uploadingType === type;
                const isRequired = ["front", "side", "back"].includes(type);
                return (
                  <div key={type} style={{ position: "relative" }}>
                    <input ref={el => (fileInputs.current[type] = el)} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => onPhotoPick(type, e.target.files?.[0])} />
                    <div onClick={() => !isUploading && fileInputs.current[type]?.click()} style={{ aspectRatio: "1", border: url ? `1px solid ${C.border}` : `2px dashed ${isRequired ? "var(--purple-border)" : C.border}`, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: isUploading ? "wait" : "pointer", background: url ? `url(${url}) center/cover` : C.subtle, overflow: "hidden", position: "relative" }}>
                      {!url && !isUploading && (<><div style={{ fontSize: 22 }}>📷</div><div style={{ color: isRequired ? C.purple : C.t4, fontSize: 10, marginTop: 4, textTransform: "capitalize", fontWeight: isRequired ? 700 : 400 }}>{type}{isRequired ? " *" : ""}</div></>)}
                      {isUploading && <div style={{ fontSize: 11, color: C.t3 }}>Uploading…</div>}
                    </div>
                    {url && <button onClick={() => setPhotos(p => { const n = { ...p }; delete n[type]; return n; })} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>×</button>}
                  </div>
                );
              })}
            </div>
          </Card>

          <ErrorMsg>{error}</ErrorMsg>

          <Btn onClick={submitWeek} disabled={busy} style={{ background: "linear-gradient(135deg,#22c55e,#14b8a6)" }}>
            {busy ? "Submitting..." : `Submit weekly check-in (${draftCount} days)`}
          </Btn>
        </>)}

        {!isCheckinDay && <ErrorMsg>{error}</ErrorMsg>}
        {!isCheckinDay && (
          <div style={{ fontSize: 12, color: C.t4, textAlign: "center", padding: 10 }}>
            Photos and measurements are due on <strong style={{ color: C.purple }}>{photoDay}</strong>. Log your daily data and come back on {photoDay} to submit your weekly check-in.
          </div>
        )}
      </>)}
    </div>
  );
}
