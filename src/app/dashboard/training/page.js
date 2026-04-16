"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, Inp, SectionLabel, Loading, Empty, ErrorMsg, C, api } from "@/components/ui";

export default function TrainingPage() {
  const [program, setProgram] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("program"); // program | logs | new
  const [openDay, setOpenDay] = useState(0);
  const [logInputs, setLogInputs] = useState({}); // {dayId: {exerciseId: [[reps, weight, rpe], ...]}}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Freeform log state
  const [sessionName, setSessionName] = useState("Session");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState([{ name: "", sets: [{ reps: "", weight: "", rpe: "" }] }]);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const d = await api("/training"); setProgram(d.program); setLogs(d.logs || []); } catch {}
    setLoading(false);
  };

  // ── Per-set logging against assigned program ──
  const updateProgramSet = (dayId, exId, setIdx, field, value) => {
    setLogInputs(prev => {
      const day = prev[dayId] || {};
      const sets = day[exId] ? [...day[exId]] : [];
      while (sets.length <= setIdx) sets.push({ reps: "", weight: "", rpe: "" });
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      return { ...prev, [dayId]: { ...day, [exId]: sets } };
    });
  };

  const logProgramDay = async (day) => {
    const dayInputs = logInputs[day.id] || {};
    const cleaned = (day.exercises || []).map(ex => {
      const sets = (dayInputs[ex.id] || []).filter(s => s.reps || s.weight).map(s => ({
        reps: parseInt(s.reps) || undefined,
        weight: parseFloat(s.weight) || undefined,
        rpe: parseInt(s.rpe) || undefined,
      }));
      return { name: ex.name, sets };
    }).filter(e => e.sets.length > 0);

    if (cleaned.length === 0) { setError("Log at least one set"); return; }
    setBusy(true); setError("");
    try {
      await api("/training", { method: "POST", body: { name: `${day.dayName} — ${day.focus || ""}`.trim(), programDayId: day.id, exercises: cleaned } });
      setLogInputs(prev => ({ ...prev, [day.id]: {} }));
      await load();
      alert("Session logged");
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  // ── Freeform log ──
  const addEx = () => setExercises([...exercises, { name: "", sets: [{ reps: "", weight: "", rpe: "" }] }]);
  const addSet = (ei) => { const e = [...exercises]; e[ei].sets.push({ reps: "", weight: "", rpe: "" }); setExercises(e); };
  const updEx = (ei, f, v) => { const e = [...exercises]; e[ei][f] = v; setExercises(e); };
  const updSet = (ei, si, f, v) => { const e = [...exercises]; e[ei].sets[si][f] = v; setExercises(e); };
  const removeEx = (ei) => setExercises(exercises.filter((_, i) => i !== ei));

  const submitFreeform = async () => {
    const cleaned = exercises.filter(e => e.name.trim()).map(e => ({
      name: e.name,
      sets: e.sets.filter(s => s.reps || s.weight).map(s => ({
        reps: parseInt(s.reps) || undefined,
        weight: parseFloat(s.weight) || undefined,
        rpe: parseInt(s.rpe) || undefined,
      })),
    })).filter(e => e.sets.length > 0);

    if (cleaned.length === 0) { setError("Add at least one exercise with sets"); return; }
    setBusy(true); setError("");
    try {
      await api("/training", { method: "POST", body: { name: sessionName, duration: parseInt(duration) || undefined, notes: notes || undefined, exercises: cleaned } });
      await load();
      setView("logs");
      setExercises([{ name: "", sets: [{ reps: "", weight: "", rpe: "" }] }]);
      setSessionName("Session"); setDuration(""); setNotes("");
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (loading) return <Loading msg="Loading training" />;

  // ── FREEFORM LOG ──
  if (view === "new") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setView("program")} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16 }}>←</button>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Freeform session</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <Inp label="Session name" value={sessionName} onChange={e => setSessionName(e.target.value)} />
        <Inp label="Duration (min)" type="number" placeholder="60" value={duration} onChange={e => setDuration(e.target.value)} />
      </div>

      {exercises.map((ex, ei) => (
        <Card key={ei}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.t3, fontWeight: 600 }}>Exercise {ei + 1}</span>
            {exercises.length > 1 && <button onClick={() => removeEx(ei)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer" }}>Remove</button>}
          </div>
          <Inp placeholder="Exercise name" value={ex.name} onChange={e => updEx(ei, "name", e.target.value)} />
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
              {["Set", "Reps", "kg", "RPE"].map(l => <span key={l} style={{ fontSize: 9, color: C.t4, textTransform: "uppercase", textAlign: "center" }}>{l}</span>)}
            </div>
            {ex.sets.map((s, si) => (
              <div key={si} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", gap: 6, marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.t3, fontWeight: 600 }}>{si + 1}</div>
                <input type="number" placeholder="8" value={s.reps} onChange={e => updSet(ei, si, "reps", e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "8px", borderRadius: 6, fontSize: 13, outline: "none", textAlign: "center" }} />
                <input type="number" step="0.5" placeholder="100" value={s.weight} onChange={e => updSet(ei, si, "weight", e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "8px", borderRadius: 6, fontSize: 13, outline: "none", textAlign: "center" }} />
                <input type="number" min="1" max="10" placeholder="8" value={s.rpe} onChange={e => updSet(ei, si, "rpe", e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "8px", borderRadius: 6, fontSize: 13, outline: "none", textAlign: "center" }} />
              </div>
            ))}
            <button onClick={() => addSet(ei)} style={{ background: "none", border: `1px dashed ${C.border}`, color: C.t3, width: "100%", padding: "8px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'", marginTop: 4 }}>+ Add set</button>
          </div>
        </Card>
      ))}

      <button onClick={addEx} style={{ background: "rgba(168,85,247,0.06)", border: `1px solid rgba(168,85,247,0.15)`, color: C.purple, padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>+ Add exercise</button>

      <Inp label="Session notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did it feel?" />
      <ErrorMsg>{error}</ErrorMsg>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="secondary" onClick={() => setView("program")}>Cancel</Btn>
        <Btn onClick={submitFreeform} disabled={busy}>{busy ? "Saving..." : "Save session"}</Btn>
      </div>
    </div>
  );

  // ── LOGS VIEW ──
  if (view === "logs") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Training history</h2>
        <button onClick={() => setView("program")} style={{ background: "none", border: `1px solid ${C.border}`, color: C.t3, padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'" }}>Program</button>
      </div>

      {logs.length === 0 ? <Empty icon="💪" title="No sessions yet" action="Log first session" onAction={() => setView("new")} /> : logs.map(log => (
        <Card key={log.id}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{log.name}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {log.duration && <span style={{ fontSize: 11, color: C.t3 }}>{log.duration} min</span>}
              <span style={{ fontSize: 11, color: C.t4 }}>{new Date(log.date).toLocaleDateString("en-ZA")}</span>
            </div>
          </div>
          {log.exercises?.map((ex, j) => (
            <div key={j} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: C.t2, fontWeight: 500, marginBottom: 4 }}>{ex.name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ex.sets?.map((s, k) => (
                  <span key={k} style={{ fontSize: 11, color: C.purple, background: "rgba(168,85,247,0.08)", padding: "3px 8px", borderRadius: 4 }}>
                    {s.reps && `${s.reps}r`}{s.weight && ` × ${s.weight}kg`}{s.rpe && ` @${s.rpe}`}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {log.notes && <div style={{ fontSize: 12, color: C.t3, marginTop: 8, fontStyle: "italic" }}>{log.notes}</div>}
        </Card>
      ))}
    </div>
  );

  // ── ASSIGNED PROGRAM VIEW ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>{program ? program.name : "Training"}</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setView("logs")} style={{ background: "none", border: `1px solid ${C.border}`, color: C.t3, padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'" }}>History</button>
          <button onClick={() => setView("new")} style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: C.purple, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>+ Freeform</button>
        </div>
      </div>

      {!program ? (
        <Empty icon="💪" title="No program assigned yet" subtitle="Your coach will assign one, or log a freeform session" action="Log freeform session" onAction={() => setView("new")} />
      ) : program.days.map((day, di) => (
        <Card key={day.id} style={{ overflow: "hidden" }}>
          <button onClick={() => setOpenDay(openDay === di ? -1 : di)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0, background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: day.exercises?.length ? C.purple : C.border }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{day.dayName}</span>
              {day.focus && <span style={{ fontSize: 11, color: C.t3 }}>· {day.focus}</span>}
            </div>
            <span style={{ color: C.t4, fontSize: 14 }}>{openDay === di ? "−" : "+"}</span>
          </button>

          {openDay === di && day.exercises?.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {day.exercises.map(ex => (
                <div key={ex.id} style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: C.t4, marginBottom: 8 }}>Target: {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}kg` : ""}</div>

                  {/* Per-set logging */}
                  <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr 1fr", gap: 4, marginBottom: 4 }}>
                    {["#", "Reps", "kg", "RPE"].map(l => <span key={l} style={{ fontSize: 9, color: C.t4, textTransform: "uppercase", textAlign: "center" }}>{l}</span>)}
                  </div>
                  {[...Array(ex.sets || 3)].map((_, si) => {
                    const val = (logInputs[day.id]?.[ex.id] || [])[si] || {};
                    return (
                      <div key={si} style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr 1fr", gap: 4, marginBottom: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.t3 }}>{si + 1}</div>
                        <input type="number" placeholder={ex.reps?.split("-")[0] || "8"} value={val.reps || ""} onChange={e => updateProgramSet(day.id, ex.id, si, "reps", e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px", borderRadius: 6, fontSize: 13, outline: "none", textAlign: "center" }} />
                        <input type="number" step="0.5" placeholder={ex.weight || ""} value={val.weight || ""} onChange={e => updateProgramSet(day.id, ex.id, si, "weight", e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px", borderRadius: 6, fontSize: 13, outline: "none", textAlign: "center" }} />
                        <input type="number" min="1" max="10" placeholder="RPE" value={val.rpe || ""} onChange={e => updateProgramSet(day.id, ex.id, si, "rpe", e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px", borderRadius: 6, fontSize: 13, outline: "none", textAlign: "center" }} />
                      </div>
                    );
                  })}
                </div>
              ))}
              <ErrorMsg>{error}</ErrorMsg>
              <Btn onClick={() => logProgramDay(day)} disabled={busy}>{busy ? "Saving..." : "Log session"}</Btn>
            </div>
          )}
          {openDay === di && day.exercises?.length === 0 && <p style={{ fontSize: 12, color: C.t4, textAlign: "center", padding: "14px 0" }}>Rest day</p>}
        </Card>
      ))}
    </div>
  );
}
