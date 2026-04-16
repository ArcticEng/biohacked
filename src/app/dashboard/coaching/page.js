"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, Btn, TextArea, TabBar, MacroRow, Avatar, SectionLabel, Loading, Empty, C, api } from "@/components/ui";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const emptyExercise = () => ({ name: "", sets: 3, reps: "8-10", weight: "", notes: "" });
const blankProgramDays = () => DAYS_OF_WEEK.map(dayOfWeek => ({ dayOfWeek, focus: "", exercises: [] }));

export default function CoachingPage() {
  const { user, isCoach } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const clientId = params.get("clientId");
  const [tab, setTab] = useState(params.get("tab") || "overview");

  const [client, setClient] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [notes, setNotes] = useState([]);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackId, setFeedbackId] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);

  // ── Program builder state ──
  const [builderOpen, setBuilderOpen] = useState(false);
  const [programName, setProgramName] = useState("");
  const [programDays, setProgramDays] = useState(blankProgramDays());

  useEffect(() => {
    if (!clientId) { router.push("/dashboard"); return; }
    loadAll();
  }, [clientId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cd, chd, nd, td] = await Promise.all([
        api(`/clients?id=${clientId}`),
        api(`/checkins?clientId=${clientId}`),
        api(`/notes?clientId=${clientId}`),
        api(`/training?clientId=${clientId}`),
      ]);
      setClient(cd.client);
      setCheckins(chd.checkins || []);
      setMeasurements(chd.measurements || []);
      setNotes(nd.notes || []);
      setProgram(td.program || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || !feedbackId) return;
    setBusy(true);
    try {
      await api("/checkins", { method: "POST", body: { action: "feedback", checkinId: feedbackId, feedback: feedbackText } });
      const d = await api(`/checkins?clientId=${clientId}`);
      setCheckins(d.checkins || []);
      setFeedbackText(""); setFeedbackId(null);
    } catch {}
    setBusy(false);
  };

  const toggleMealSwap = async () => {
    try {
      await api("/clients", { method: "POST", body: { action: "update_permissions", clientId, allowMealSwap: !client.allowMealSwap } });
      setClient({ ...client, allowMealSwap: !client.allowMealSwap });
    } catch (e) { alert(e.message); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setBusy(true);
    try {
      await api("/notes", { method: "POST", body: { clientId, content: newNote } });
      setNewNote("");
      const d = await api(`/notes?clientId=${clientId}`);
      setNotes(d.notes || []);
    } catch {}
    setBusy(false);
  };

  const deleteNote = async (id) => {
    if (!confirm("Delete this note?")) return;
    try {
      await api(`/notes?id=${id}`, { method: "DELETE" });
      setNotes(notes.filter(n => n.id !== id));
    } catch {}
  };

  const genMealPlan = async () => {
    setBusy(true);
    try {
      await api("/meal-plans", { method: "POST", body: { calories: client.calories, protein: client.protein, carbs: client.carbs, fat: client.fat, goal: client.goal || "MAINTAIN", clientId } });
      alert("Meal plan generated for " + client.name);
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  // ── Program builder ──
  const openBuilder = (existing) => {
    if (existing) {
      setProgramName(existing.name || "");
      // API returns days with dayName (matches schema). Hydrate a full Mon-Sun grid.
      const stored = Object.fromEntries((existing.days || []).map(d => [d.dayName, d]));
      setProgramDays(DAYS_OF_WEEK.map(dayOfWeek => {
        const d = stored[dayOfWeek];
        if (!d) return { dayOfWeek, focus: "", exercises: [] };
        return {
          dayOfWeek,
          focus: d.focus || "",
          exercises: (d.exercises || []).map(ex => ({
            name: ex.name || "",
            sets: ex.sets || 3,
            reps: ex.reps || "8-10",
            weight: ex.weight ?? "",
            notes: ex.notes || "",
          })),
        };
      }));
    } else {
      setProgramName("");
      setProgramDays(blankProgramDays());
    }
    setBuilderOpen(true);
  };

  const cancelBuilder = () => { setBuilderOpen(false); };

  const setDayFocus = (dayIdx, focus) =>
    setProgramDays(days => days.map((d, i) => i === dayIdx ? { ...d, focus } : d));

  const addExercise = (dayIdx) =>
    setProgramDays(days => days.map((d, i) => i === dayIdx ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d));

  const updateExercise = (dayIdx, exIdx, field, value) =>
    setProgramDays(days => days.map((d, i) => i !== dayIdx ? d : {
      ...d,
      exercises: d.exercises.map((ex, j) => j !== exIdx ? ex : { ...ex, [field]: value }),
    }));

  const removeExercise = (dayIdx, exIdx) =>
    setProgramDays(days => days.map((d, i) => i !== dayIdx ? d : {
      ...d, exercises: d.exercises.filter((_, j) => j !== exIdx),
    }));

  const saveProgram = async () => {
    if (!programName.trim()) { alert("Program needs a name"); return; }
    const daysPayload = programDays
      .filter(d => d.exercises.length > 0 || d.focus.trim())
      .map(d => ({
        dayOfWeek: d.dayOfWeek, // API converts to dayName
        focus: d.focus.trim() || undefined,
        exercises: d.exercises
          .filter(ex => ex.name.trim())
          .map(ex => ({
            name: ex.name.trim(),
            sets: parseInt(ex.sets) || 3,
            reps: String(ex.reps || "8-10"),
            weight: ex.weight === "" ? undefined : parseFloat(ex.weight),
            notes: ex.notes?.trim() || undefined,
          })),
      }));

    if (daysPayload.length === 0) { alert("Add at least one exercise or focus"); return; }

    setBusy(true);
    try {
      const body = {
        clientId,
        name: programName.trim(),
        days: daysPayload,
      };
      if (program?.id) body.id = program.id;
      const res = await api("/training?action=program", { method: "POST", body });
      setProgram(res.program);
      setBuilderOpen(false);
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const deactivateProgram = async () => {
    if (!program?.id) return;
    if (!confirm("Deactivate this program? The client will see no assigned program.")) return;
    setBusy(true);
    try {
      await api(`/training?programId=${program.id}`, { method: "DELETE" });
      setProgram(null);
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  if (!isCoach) { router.push("/dashboard"); return null; }
  if (loading) return <Loading msg="Loading client" />;
  if (!client) return <Empty icon="❓" title="Client not found" />;

  const weightData = [...checkins].reverse().filter(c => c.weight).map(c => ({
    day: new Date(c.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
    weight: c.weight,
  }));
  const latest = measurements[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={client.name} size={44} color={client.goal === "BUILD" ? C.purple : client.goal === "CUT" ? C.pink : C.teal} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Syne'" }}>{client.name}</div>
          <div style={{ fontSize: 11, color: C.t3 }}>{client.goal} · {client.gender?.toLowerCase()} · {client.calories}kcal</div>
        </div>
      </div>

      <TabBar tabs={["overview", "check-ins", "program", "meal plan", "notes"]} active={tab} onChange={setTab} />

      {tab === "overview" && (<>
        <MacroRow calories={client.calories} protein={client.protein} carbs={client.carbs} fat={client.fat} />

        {weightData.length > 1 && (
          <Card>
            <SectionLabel>Weight trend</SectionLabel>
            <div style={{ marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={weightData}>
                  <defs><linearGradient id="cwg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.purple} stopOpacity={0.3} /><stop offset="100%" stopColor={C.purple} stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="day" tick={{ fill: C.t4, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={["dataMin-1", "dataMax+1"]} tick={{ fill: C.t4, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="weight" stroke={C.purple} fill="url(#cwg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {latest && (
          <Card>
            <SectionLabel>Body measurements</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              {["arms", "shoulders", "back", "waist", "hips", "glutes", "quads"].map(k => (
                <div key={k} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.teal }}>{latest[k] || "—"}<span style={{ fontSize: 10, color: C.t3 }}> cm</span></div>
                  <div style={{ fontSize: 10, color: C.t3, textTransform: "capitalize", marginTop: 2 }}>{k}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <SectionLabel>Permissions</SectionLabel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Allow AI meal swaps</div>
              <div style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>Client can swap individual meals in their plan</div>
            </div>
            <button onClick={toggleMealSwap} style={{
              width: 44, height: 24, borderRadius: 12, background: client.allowMealSwap ? C.purple : C.border,
              padding: 2, cursor: "pointer", border: "none", transition: "all 0.2s",
            }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "all 0.2s", transform: client.allowMealSwap ? "translateX(20px)" : "translateX(0)" }} />
            </button>
          </div>
        </Card>
      </>)}

      {/* ── CHECK-INS ── */}
      {tab === "check-ins" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {checkins.length === 0 ? <Empty icon="📋" title="No check-ins yet" /> : (
            <>
              <Card style={{ padding: 10, overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: C.t4, borderBottom: `1px solid ${C.border}` }}>
                      {["Date", "Weight", "Cals", "Energy", "Sleep", "Stress", "Perf"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {checkins.slice(0, 7).map(c => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px", color: C.t2 }}>{new Date(c.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</td>
                        <td style={{ padding: "8px", color: C.purple, fontWeight: 600 }}>{c.weight ?? "—"}</td>
                        <td style={{ padding: "8px", color: C.t2 }}>{c.calories ?? "—"}</td>
                        <td style={{ padding: "8px" }}><span style={{ background: (c.energyLevel ?? 0) >= 7 ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)", color: (c.energyLevel ?? 0) >= 7 ? C.green : C.amber, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{c.energyLevel ?? "—"}/10</span></td>
                        <td style={{ padding: "8px", color: C.t2 }}>{c.sleepHours ? `${c.sleepHours}h` : "—"}</td>
                        <td style={{ padding: "8px" }}><span style={{ background: (c.stressLevel ?? 0) >= 7 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: (c.stressLevel ?? 0) >= 7 ? C.red : C.green, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{c.stressLevel ?? "—"}/10</span></td>
                        <td style={{ padding: "8px" }}>{c.trainingStatus === "progress" ? <span style={{ color: C.green, fontSize: 10, fontWeight: 600 }}>📈</span> : c.trainingStatus === "maintain" ? <span style={{ color: C.amber, fontSize: 10 }}>➡️</span> : c.trainingStatus === "regress" ? <span style={{ color: C.red, fontSize: 10 }}>📉</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {checkins.map(ci => (
                <Card key={ci.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: C.t3 }}>{new Date(ci.date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: ci.status === "PENDING" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: ci.status === "PENDING" ? C.amber : C.green, fontWeight: 600 }}>{ci.status}</span>
                  </div>

                  {ci.style === "LIFESTYLE" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[["💪 Training", ci.lifestyleTraining], ["😴 Recovery", ci.lifestyleRecovery], ["🥗 Diet", ci.lifestyleDiet], ["🏆 Win", ci.lifestyleWin], ["🙋 From Coach", ci.lifestyleFromCoach]].filter(([_, v]) => v).map(([l, v]) => (
                        <div key={l}><div style={{ fontSize: 11, color: C.t3, fontWeight: 600, marginBottom: 4 }}>{l}</div><div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{v}</div></div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                        {ci.weight && <div><span style={{ color: C.t4 }}>Weight: </span><span style={{ color: C.purple, fontWeight: 600 }}>{ci.weight}kg</span></div>}
                        {ci.calories && <div><span style={{ color: C.t4 }}>Cals: </span><span style={{ color: C.t2 }}>{ci.calories}</span></div>}
                        {ci.protein && <div><span style={{ color: C.t4 }}>Protein: </span><span style={{ color: C.t2 }}>{ci.protein}g</span></div>}
                        {ci.steps && <div><span style={{ color: C.t4 }}>Steps: </span><span style={{ color: C.t2 }}>{ci.steps.toLocaleString()}</span></div>}
                        {ci.hydration && <div><span style={{ color: C.t4 }}>Water: </span><span style={{ color: C.t2 }}>{ci.hydration}L</span></div>}
                        {ci.caffeine && <div><span style={{ color: C.t4 }}>Caffeine: </span><span style={{ color: C.t2 }}>{ci.caffeine}mg</span></div>}
                      </div>
                      {ci.supplements?.length > 0 && <div style={{ fontSize: 11, color: C.t4, marginTop: 8 }}>Supps: <span style={{ color: C.t2 }}>{ci.supplements.join(", ")}</span></div>}
                      {ci.photos?.length > 0 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                          {ci.photos.map(p => (
                            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                              <div style={{ width: 52, height: 52, borderRadius: 6, background: `url(${p.url}) center/cover`, border: `1px solid ${C.border}` }} />
                              <div style={{ fontSize: 9, color: C.t4, textAlign: "center", marginTop: 2, textTransform: "capitalize" }}>{p.type}</div>
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {ci.generalNotes && <div style={{ fontSize: 12, color: C.t2, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginTop: 10, lineHeight: 1.5 }}>{ci.generalNotes}</div>}
                  {ci.coachFeedback && <div style={{ fontSize: 12, color: C.green, padding: "10px 12px", background: "rgba(34,197,94,0.04)", borderRadius: 8, marginTop: 8, lineHeight: 1.5 }}>Your feedback: {ci.coachFeedback}</div>}

                  {ci.status === "PENDING" && (
                    feedbackId === ci.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                        <textarea placeholder="Write feedback..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} style={{ width: "100%", minHeight: 70, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "10px", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans'", outline: "none", resize: "vertical" }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn variant="secondary" onClick={() => { setFeedbackId(null); setFeedbackText(""); }} style={{ flex: 1 }}>Cancel</Btn>
                          <Btn onClick={submitFeedback} disabled={busy} style={{ flex: 1 }}>Send</Btn>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setFeedbackId(ci.id)} style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: C.green, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'", width: "100%", marginTop: 8 }}>Write feedback</button>
                    )
                  )}
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── PROGRAM BUILDER ── */}
      {tab === "program" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!builderOpen && (
            <>
              {program ? (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Syne'" }}>{program.name}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.1)", color: C.green, fontWeight: 600 }}>ACTIVE</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Btn onClick={() => openBuilder(program)} style={{ flex: 1 }}>Edit program</Btn>
                    <Btn variant="danger" onClick={deactivateProgram} disabled={busy}>Deactivate</Btn>
                  </div>
                </Card>
              ) : (
                <Empty icon="💪" title="No program assigned" sub="Build a weekly training program for this client" />
              )}

              {program && (program.days || []).map(d => (
                <Card key={d.id} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{d.dayName}</span>
                      {d.focus && <span style={{ fontSize: 12, color: C.t3, marginLeft: 8 }}>· {d.focus}</span>}
                    </div>
                    {!d.exercises?.length && <span style={{ fontSize: 10, color: C.t4, textTransform: "uppercase", letterSpacing: 1 }}>Rest</span>}
                  </div>
                  {(d.exercises || []).map(ex => (
                    <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
                      <div style={{ color: C.t2 }}>{ex.name}</div>
                      <div style={{ color: C.t3 }}>{ex.sets} × {ex.reps}{ex.weight ? ` @ ${ex.weight}kg` : ""}</div>
                    </div>
                  ))}
                </Card>
              ))}

              {!program && <Btn onClick={() => openBuilder(null)}>+ Create training program</Btn>}
            </>
          )}

          {builderOpen && (
            <>
              <Card>
                <SectionLabel>Program details</SectionLabel>
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Name</label>
                  <input value={programName} onChange={e => setProgramName(e.target.value)} placeholder="e.g. Physique Shred — Phase 2"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" }} />
                </div>
              </Card>

              {programDays.map((d, di) => (
                <Card key={d.dayOfWeek} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{d.dayOfWeek}</div>
                    <input value={d.focus} onChange={e => setDayFocus(di, e.target.value)} placeholder="Focus e.g. Chest & Triceps or Rest"
                      style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 12, fontFamily: "'DM Sans'", outline: "none" }} />
                  </div>

                  {d.exercises.map((ex, ei) => (
                    <div key={ei} style={{ padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <input value={ex.name} onChange={e => updateExercise(di, ei, "name", e.target.value)} placeholder="Exercise name"
                          style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "8px 10px", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans'", outline: "none" }} />
                        <button onClick={() => removeExercise(di, ei)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.t4, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans'" }}>×</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                        <div>
                          <div style={{ fontSize: 9, color: C.t4, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>Sets</div>
                          <input type="number" min="1" max="20" value={ex.sets} onChange={e => updateExercise(di, ei, "sets", e.target.value)}
                            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px 8px", borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "'DM Sans'" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: C.t4, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>Reps</div>
                          <input value={ex.reps} onChange={e => updateExercise(di, ei, "reps", e.target.value)} placeholder="8-10"
                            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px 8px", borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "'DM Sans'" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: C.t4, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>Weight kg</div>
                          <input type="number" step="0.5" value={ex.weight} onChange={e => updateExercise(di, ei, "weight", e.target.value)} placeholder="—"
                            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px 8px", borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "'DM Sans'" }} />
                        </div>
                      </div>
                      <input value={ex.notes || ""} onChange={e => updateExercise(di, ei, "notes", e.target.value)} placeholder="Notes (optional)"
                        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px 10px", borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "'DM Sans'", marginTop: 6 }} />
                    </div>
                  ))}

                  <button onClick={() => addExercise(di)} style={{ width: "100%", background: "rgba(168,85,247,0.08)", border: "1px dashed rgba(168,85,247,0.3)", color: C.purple, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>+ Add exercise</button>
                </Card>
              ))}

              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="secondary" onClick={cancelBuilder} style={{ flex: 1 }}>Cancel</Btn>
                <Btn onClick={saveProgram} disabled={busy} style={{ flex: 2 }}>{busy ? "Saving..." : (program ? "Update program" : "Save program")}</Btn>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MEAL PLAN ── */}
      {tab === "meal plan" && (
        <Card>
          <MacroRow calories={client.calories} protein={client.protein} carbs={client.carbs} fat={client.fat} />
          <Btn onClick={genMealPlan} disabled={busy} style={{ marginTop: 14 }}>{busy ? "Generating..." : `Generate AI meal plan for ${client.name.split(" ")[0]}`}</Btn>
        </Card>
      )}

      {/* ── NOTES ── */}
      {tab === "notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <TextArea label="Add coaching note" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder={`Private note about ${client.name}...`} style={{ minHeight: 80 }} />
            <Btn onClick={addNote} disabled={busy || !newNote.trim()} style={{ marginTop: 10 }}>{busy ? "Saving..." : "Add note"}</Btn>
          </Card>

          <SectionLabel>Timeline ({notes.length})</SectionLabel>
          {notes.length === 0 ? <Empty icon="📝" title="No notes yet" /> : notes.map(n => (
            <Card key={n.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: C.t4 }}>{new Date(n.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span>
                <button onClick={() => deleteNote(n.id)} style={{ background: "none", border: "none", color: C.t4, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'" }}>Delete</button>
              </div>
              <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.5 }}>{n.content}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
