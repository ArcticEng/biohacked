"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, Btn, Inp, TextArea, TabBar, MacroRow, Avatar, StatBox, SectionLabel, Loading, Empty, C, api } from "@/components/ui";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const emptyExercise = () => ({ name: "", sets: 3, reps: "8-10", weight: "", notes: "" });
const blankProgramDays = () => DAYS_OF_WEEK.map(dayOfWeek => ({ dayOfWeek, focus: "", exercises: [] }));
const emptyFood = () => ({ name: "", amount: "", calories: 0, protein: 0, carbs: 0, fat: 0 });

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
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackId, setFeedbackId] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Program builder
  const [builderOpen, setBuilderOpen] = useState(false);
  const [programName, setProgramName] = useState("");
  const [programDays, setProgramDays] = useState(blankProgramDays());

  // Meal plan
  const [editingMealId, setEditingMealId] = useState(null);
  const [mealDraft, setMealDraft] = useState(null);
  const [genCalories, setGenCalories] = useState(0);
  const [genProtein, setGenProtein] = useState(0);
  const [genCarbs, setGenCarbs] = useState(0);
  const [genFat, setGenFat] = useState(0);
  const [genMeals, setGenMeals] = useState(5);

  useEffect(() => {
    if (!clientId) { router.push("/dashboard"); return; }
    loadAll();
  }, [clientId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cd, chd, nd, td, mp] = await Promise.all([
        api(`/clients?id=${clientId}`),
        api(`/checkins?clientId=${clientId}`),
        api(`/notes?clientId=${clientId}`),
        api(`/training?clientId=${clientId}`),
        api(`/meal-plans?clientId=${clientId}&current=1`),
      ]);
      setClient(cd.client);
      setCheckins(chd.checkins || []);
      setMeasurements(chd.measurements || []);
      setNotes(nd.notes || []);
      setProgram(td.program || null);
      setMealPlan(mp.mealPlan || null);
      // Init generator macros from client
      setGenCalories(cd.client.calories); setGenProtein(cd.client.protein);
      setGenCarbs(cd.client.carbs); setGenFat(cd.client.fat);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // ── Coach actions ──
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
    try { await api(`/notes?id=${id}`, { method: "DELETE" }); setNotes(notes.filter(n => n.id !== id)); } catch {}
  };

  // ── Meal plan generation ──
  const generateMealPlan = async () => {
    setBusy(true);
    try {
      const data = await api("/meal-plans", { method: "POST", body: { calories: genCalories, protein: genProtein, carbs: genCarbs, fat: genFat, goal: client.goal || "MAINTAIN", meals: genMeals, mode: "ai", clientId } });
      setMealPlan(data.mealPlan);
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  // ── Meal editing ──
  const startMealEdit = (meal) => {
    setEditingMealId(meal.id);
    setMealDraft({
      name: meal.name || "", time: meal.time || "",
      calories: meal.calories || 0, protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0,
      foods: (meal.foods || []).map(f => ({ name: f.name || f.item || "", amount: f.amount || "", calories: f.calories || 0, protein: f.protein || 0, carbs: f.carbs || 0, fat: f.fat || 0 })),
      instructions: meal.instructions || "",
    });
  };

  const saveMealEdit = async () => {
    if (!editingMealId || !mealDraft) return;
    setBusy(true);
    try {
      await api("/meal-plans", { method: "POST", body: {
        action: "update_meal", mealId: editingMealId,
        name: mealDraft.name.trim() || "Meal", time: mealDraft.time || null,
        calories: parseInt(mealDraft.calories) || 0, protein: parseInt(mealDraft.protein) || 0,
        carbs: parseInt(mealDraft.carbs) || 0, fat: parseInt(mealDraft.fat) || 0,
        foods: mealDraft.foods.filter(f => f.name.trim()).map(f => ({
          name: f.name.trim(), amount: f.amount || "",
          calories: parseInt(f.calories) || 0, protein: parseInt(f.protein) || 0,
          carbs: parseInt(f.carbs) || 0, fat: parseInt(f.fat) || 0,
        })),
        instructions: mealDraft.instructions || null,
      }});
      const d = await api(`/meal-plans?clientId=${clientId}&current=1`);
      setMealPlan(d.mealPlan);
      setEditingMealId(null); setMealDraft(null);
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const updateDraft = (field, value) => setMealDraft(d => ({ ...d, [field]: value }));
  const updateDraftFood = (idx, field, value) => setMealDraft(d => ({ ...d, foods: d.foods.map((f, i) => i === idx ? { ...f, [field]: value } : f) }));
  const addDraftFood = () => setMealDraft(d => ({ ...d, foods: [...d.foods, emptyFood()] }));
  const removeDraftFood = (idx) => setMealDraft(d => ({ ...d, foods: d.foods.filter((_, i) => i !== idx) }));
  const recomputeTotals = () => {
    const t = mealDraft.foods.reduce((s, f) => ({ calories: s.calories + (parseInt(f.calories) || 0), protein: s.protein + (parseInt(f.protein) || 0), carbs: s.carbs + (parseInt(f.carbs) || 0), fat: s.fat + (parseInt(f.fat) || 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    setMealDraft(d => ({ ...d, ...t }));
  };

  // ── Program builder actions ──
  const openBuilder = (existing) => {
    if (existing) {
      setProgramName(existing.name || "");
      const stored = Object.fromEntries((existing.days || []).map(d => [d.dayName, d]));
      setProgramDays(DAYS_OF_WEEK.map(dayOfWeek => {
        const d = stored[dayOfWeek];
        if (!d) return { dayOfWeek, focus: "", exercises: [] };
        return { dayOfWeek, focus: d.focus || "", exercises: (d.exercises || []).map(ex => ({ name: ex.name || "", sets: ex.sets || 3, reps: ex.reps || "8-10", weight: ex.weight ?? "", notes: ex.notes || "" })) };
      }));
    } else { setProgramName(""); setProgramDays(blankProgramDays()); }
    setBuilderOpen(true);
  };
  const setDayFocus = (di, focus) => setProgramDays(days => days.map((d, i) => i === di ? { ...d, focus } : d));
  const addExercise = (di) => setProgramDays(days => days.map((d, i) => i === di ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d));
  const updateExercise = (di, ei, field, value) => setProgramDays(days => days.map((d, i) => i !== di ? d : { ...d, exercises: d.exercises.map((ex, j) => j !== ei ? ex : { ...ex, [field]: value }) }));
  const removeExercise = (di, ei) => setProgramDays(days => days.map((d, i) => i !== di ? d : { ...d, exercises: d.exercises.filter((_, j) => j !== ei) }));

  const saveProgram = async () => {
    if (!programName.trim()) { alert("Program needs a name"); return; }
    const daysPayload = programDays.filter(d => d.exercises.length > 0 || d.focus.trim()).map(d => ({
      dayOfWeek: d.dayOfWeek, focus: d.focus.trim() || undefined,
      exercises: d.exercises.filter(ex => ex.name.trim()).map(ex => ({ name: ex.name.trim(), sets: parseInt(ex.sets) || 3, reps: String(ex.reps || "8-10"), weight: ex.weight === "" ? undefined : parseFloat(ex.weight), notes: ex.notes?.trim() || undefined })),
    }));
    if (daysPayload.length === 0) { alert("Add at least one exercise or focus"); return; }
    setBusy(true);
    try {
      const body = { clientId, name: programName.trim(), days: daysPayload };
      if (program?.id) body.id = program.id;
      const res = await api("/training?action=program", { method: "POST", body });
      setProgram(res.program);
      setBuilderOpen(false);
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const deactivateProgram = async () => {
    if (!program?.id || !confirm("Deactivate this program?")) return;
    setBusy(true);
    try { await api(`/training?programId=${program.id}`, { method: "DELETE" }); setProgram(null); } catch (e) { alert(e.message); }
    setBusy(false);
  };

  if (!isCoach) { router.push("/dashboard"); return null; }
  if (loading) return <Loading msg="Loading client" />;
  if (!client) return <Empty icon="❓" title="Client not found" />;

  // ── Computed data for overview + progress ──
  const weightData = [...checkins].reverse().filter(c => c.weight).map(c => ({
    day: new Date(c.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }), weight: c.weight,
  }));
  const perfData = [...checkins].reverse().slice(-14).filter(c => c.energyLevel || c.sleepQuality).map(c => ({
    day: new Date(c.date).toLocaleDateString("en-ZA", { day: "numeric" }),
    energy: c.energyLevel || 0, sleep: c.sleepQuality || 0, stress: c.stressLevel || 0,
  }));
  const latest = measurements[0];
  const prev = measurements[1];
  const delta = (k) => { if (!latest || !prev || !latest[k] || !prev[k]) return null; const d = (latest[k] - prev[k]).toFixed(1); return d > 0 ? `+${d}` : d; };

  const inputStyle = { background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "8px 12px", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "'DM Sans'" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={client.name} size={44} color={client.goal === "BUILD" ? C.purple : client.goal === "CUT" ? C.pink : C.teal} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Syne'" }}>{client.name}</div>
          <div style={{ fontSize: 11, color: C.t3 }}>{client.goal} · {client.gender?.toLowerCase()} · {client.calories}kcal</div>
        </div>
      </div>

      <TabBar tabs={["overview", "check-ins", "program", "meal plan", "progress", "notes"]} active={tab} onChange={setTab} />

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (<>
        <MacroRow calories={client.calories} protein={client.protein} carbs={client.carbs} fat={client.fat} />

        {weightData.length > 1 && (
          <Card>
            <SectionLabel>Weight trend</SectionLabel>
            <div style={{ marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={weightData}>
                  <defs><linearGradient id="cwg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="100%" stopColor="#a855f7" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="day" tick={{ fill: "var(--text-4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={["dataMin-1", "dataMax+1"]} tick={{ fill: "var(--text-4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: `1px solid var(--border)`, borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="weight" stroke="#a855f7" fill="url(#cwg)" strokeWidth={2} />
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
            <button onClick={toggleMealSwap} style={{ width: 44, height: 24, borderRadius: 12, background: client.allowMealSwap ? "#a855f7" : "var(--border)", padding: 2, cursor: "pointer", border: "none", transition: "all 0.2s" }}>
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
                      {["Date", "Weight", "Cals", "Energy", "Sleep", "Stress", "Perf"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {checkins.slice(0, 7).map(c => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px", color: C.t2 }}>{new Date(c.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</td>
                        <td style={{ padding: "8px", color: C.purple, fontWeight: 600 }}>{c.weight ?? "—"}</td>
                        <td style={{ padding: "8px", color: C.t2 }}>{c.calories ?? "—"}</td>
                        <td style={{ padding: "8px" }}><span style={{ background: (c.energyLevel ?? 0) >= 7 ? "var(--green-surface)" : "var(--amber-surface)", color: (c.energyLevel ?? 0) >= 7 ? C.green : C.amber, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{c.energyLevel ?? "—"}/10</span></td>
                        <td style={{ padding: "8px", color: C.t2 }}>{c.sleepHours ? `${c.sleepHours}h` : "—"}</td>
                        <td style={{ padding: "8px" }}><span style={{ background: (c.stressLevel ?? 0) >= 7 ? "var(--red-surface)" : "var(--green-surface)", color: (c.stressLevel ?? 0) >= 7 ? C.red : C.green, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{c.stressLevel ?? "—"}/10</span></td>
                        <td style={{ padding: "8px" }}>{c.trainingStatus === "progress" ? "📈" : c.trainingStatus === "maintain" ? "➡️" : c.trainingStatus === "regress" ? "📉" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {checkins.map(ci => (
                <Card key={ci.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: C.t3 }}>{new Date(ci.date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: ci.status === "PENDING" ? "var(--amber-surface)" : "var(--green-surface)", color: ci.status === "PENDING" ? C.amber : C.green, fontWeight: 600 }}>{ci.status}</span>
                  </div>

                  {ci.style === "LIFESTYLE" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[["💪 Training", ci.lifestyleTraining], ["😴 Recovery", ci.lifestyleRecovery], ["🥗 Diet", ci.lifestyleDiet], ["🏆 Win", ci.lifestyleWin], ["🙋 From Coach", ci.lifestyleFromCoach]].filter(([_, v]) => v).map(([l, v]) => (
                        <div key={l}><div style={{ fontSize: 11, color: C.t3, fontWeight: 600, marginBottom: 4 }}>{l}</div><div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{v}</div></div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                      {ci.weight && <div><span style={{ color: C.t4 }}>Weight: </span><span style={{ color: C.purple, fontWeight: 600 }}>{ci.weight}kg</span></div>}
                      {ci.calories && <div><span style={{ color: C.t4 }}>Cals: </span><span style={{ color: C.t2 }}>{ci.calories}</span></div>}
                      {ci.protein && <div><span style={{ color: C.t4 }}>Protein: </span><span style={{ color: C.t2 }}>{ci.protein}g</span></div>}
                      {ci.steps && <div><span style={{ color: C.t4 }}>Steps: </span><span style={{ color: C.t2 }}>{ci.steps.toLocaleString()}</span></div>}
                      {ci.hydration && <div><span style={{ color: C.t4 }}>Water: </span><span style={{ color: C.t2 }}>{ci.hydration}L</span></div>}
                      {ci.caffeine && <div><span style={{ color: C.t4 }}>Caffeine: </span><span style={{ color: C.t2 }}>{ci.caffeine}mg</span></div>}
                    </div>
                  )}

                  {ci.generalNotes && <div style={{ fontSize: 12, color: C.t2, padding: "10px 12px", background: C.subtle, borderRadius: 8, marginTop: 10, lineHeight: 1.5 }}>{ci.generalNotes}</div>}
                  {ci.coachFeedback && <div style={{ fontSize: 12, color: C.green, padding: "10px 12px", background: "var(--green-surface)", borderRadius: 8, marginTop: 8, lineHeight: 1.5 }}>Your feedback: {ci.coachFeedback}</div>}

                  {ci.status === "PENDING" && (
                    feedbackId === ci.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                        <textarea placeholder="Write feedback..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} style={{ width: "100%", minHeight: 70, ...inputStyle, resize: "vertical" }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn variant="secondary" onClick={() => { setFeedbackId(null); setFeedbackText(""); }} style={{ flex: 1 }}>Cancel</Btn>
                          <Btn onClick={submitFeedback} disabled={busy} style={{ flex: 1 }}>Send</Btn>
                        </div>
                      </div>
                    ) : (
                      <Btn variant="secondary" onClick={() => setFeedbackId(ci.id)} style={{ marginTop: 8 }}>Write feedback</Btn>
                    )
                  )}
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── PROGRAM ── */}
      {tab === "program" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!builderOpen && (
            <>
              {program ? (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Syne'" }}>{program.name}</div>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "var(--green-surface)", color: C.green, fontWeight: 600 }}>ACTIVE</span>
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
                  <input value={programName} onChange={e => setProgramName(e.target.value)} placeholder="e.g. Physique Shred — Phase 2" style={{ width: "100%", ...inputStyle, padding: "10px 14px", borderRadius: 10, fontSize: 14 }} />
                </div>
              </Card>

              {programDays.map((d, di) => (
                <Card key={d.dayOfWeek} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{d.dayOfWeek}</div>
                    <input value={d.focus} onChange={e => setDayFocus(di, e.target.value)} placeholder="Focus e.g. Chest & Triceps" style={{ flex: 1, ...inputStyle, padding: "6px 10px", fontSize: 12 }} />
                  </div>
                  {d.exercises.map((ex, ei) => (
                    <div key={ei} style={{ padding: 10, background: C.subtle, borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <input value={ex.name} onChange={e => updateExercise(di, ei, "name", e.target.value)} placeholder="Exercise name" style={{ flex: 1, ...inputStyle, padding: "8px 10px", fontSize: 12 }} />
                        <button onClick={() => removeExercise(di, ei)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.t4, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>×</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                        {[["Sets", "sets", "number"], ["Reps", "reps", "text"], ["Weight kg", "weight", "number"]].map(([l, k, t]) => (
                          <div key={k}>
                            <div style={{ fontSize: 9, color: C.t4, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                            <input type={t} value={ex[k]} onChange={e => updateExercise(di, ei, k, e.target.value)} placeholder={k === "reps" ? "8-10" : "—"} style={{ width: "100%", ...inputStyle, padding: "6px 8px", fontSize: 12 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addExercise(di)} style={{ width: "100%", background: "var(--purple-surface)", border: "1px dashed var(--purple-border)", color: C.purple, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>+ Add exercise</button>
                </Card>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="secondary" onClick={() => setBuilderOpen(false)} style={{ flex: 1 }}>Cancel</Btn>
                <Btn onClick={saveProgram} disabled={busy} style={{ flex: 2 }}>{busy ? "Saving..." : (program ? "Update" : "Save program")}</Btn>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MEAL PLAN (full view + edit + generate) ── */}
      {tab === "meal plan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mealPlan ? (
            <>
              <MacroRow calories={mealPlan.totalCalories} protein={mealPlan.totalProtein} carbs={mealPlan.totalCarbs} fat={mealPlan.totalFat} />

              {(mealPlan.meals || []).map(meal => {
                if (editingMealId === meal.id && mealDraft) {
                  return (
                    <Card key={meal.id} style={{ borderColor: "var(--purple-border)" }}>
                      <SectionLabel>Editing: {meal.name}</SectionLabel>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginTop: 12 }}>
                        <input value={mealDraft.name} onChange={e => updateDraft("name", e.target.value)} placeholder="Meal name" style={{ ...inputStyle }} />
                        <input value={mealDraft.time} onChange={e => updateDraft("time", e.target.value)} placeholder="7:00 AM" style={{ ...inputStyle }} />
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <SectionLabel>Foods</SectionLabel>
                        {mealDraft.foods.map((f, i) => (
                          <div key={i} style={{ padding: 8, background: C.subtle, borderRadius: 6, marginTop: 6 }}>
                            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                              <input value={f.name} onChange={e => updateDraftFood(i, "name", e.target.value)} placeholder="Food" style={{ flex: 2, ...inputStyle, padding: "6px 10px", fontSize: 12 }} />
                              <input value={f.amount} onChange={e => updateDraftFood(i, "amount", e.target.value)} placeholder="150g" style={{ flex: 1, ...inputStyle, padding: "6px 10px", fontSize: 12 }} />
                              <button onClick={() => removeDraftFood(i)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.t4, padding: "2px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>×</button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
                              {["calories", "protein", "carbs", "fat"].map(k => (
                                <div key={k}>
                                  <div style={{ fontSize: 8, color: C.t4, marginBottom: 1, textTransform: "uppercase" }}>{k === "calories" ? "kcal" : k[0]}</div>
                                  <input type="number" value={f[k]} onChange={e => updateDraftFood(i, k, e.target.value)} style={{ width: "100%", ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "center" }} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button onClick={addDraftFood} style={{ width: "100%", marginTop: 6, background: "var(--purple-surface)", border: "1px dashed var(--purple-border)", color: C.purple, padding: "6px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>+ Add food</button>
                        <button onClick={recomputeTotals} style={{ width: "100%", marginTop: 6, background: "var(--amber-surface)", border: "1px solid rgba(245,158,11,0.2)", color: C.amber, padding: "6px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>↻ Recompute totals</button>
                      </div>
                      <textarea value={mealDraft.instructions} onChange={e => updateDraft("instructions", e.target.value)} rows={2} placeholder="Prep notes..." style={{ width: "100%", marginTop: 12, ...inputStyle, resize: "vertical" }} />
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <Btn variant="secondary" onClick={() => { setEditingMealId(null); setMealDraft(null); }} style={{ flex: 1 }}>Cancel</Btn>
                        <Btn onClick={saveMealEdit} disabled={busy} style={{ flex: 2 }}>{busy ? "Saving..." : "Save meal"}</Btn>
                      </div>
                    </Card>
                  );
                }
                return (
                  <Card key={meal.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{meal.name}</div>
                        {meal.time && <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{meal.time}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.purple }}>{meal.calories} kcal</span>
                        <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>P{meal.protein} · C{meal.carbs} · F{meal.fat}</div>
                      </div>
                    </div>
                    {(meal.foods || []).map((f, j) => (
                      <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: j < meal.foods.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <span style={{ fontSize: 13, color: C.t2 }}>{f.name || f.item}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.lavender }}>{f.amount}</span>
                      </div>
                    ))}
                    {meal.instructions && <div style={{ fontSize: 12, color: C.t3, marginTop: 10, padding: "8px 10px", background: C.subtle, borderRadius: 6, lineHeight: 1.5 }}>{meal.instructions}</div>}
                    <Btn variant="secondary" onClick={() => startMealEdit(meal)} style={{ marginTop: 10 }}>✏️ Edit meal</Btn>
                  </Card>
                );
              })}

              <Btn variant="secondary" onClick={() => setMealPlan(null)}>+ Generate new plan</Btn>
            </>
          ) : (
            <>
              <Card>
                <SectionLabel>Set macros for {client.name.split(" ")[0]}</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                  <Inp label="Calories" type="number" value={genCalories} onChange={e => setGenCalories(parseInt(e.target.value) || 0)} />
                  <Inp label="Protein (g)" type="number" value={genProtein} onChange={e => setGenProtein(parseInt(e.target.value) || 0)} />
                  <Inp label="Carbs (g)" type="number" value={genCarbs} onChange={e => setGenCarbs(parseInt(e.target.value) || 0)} />
                  <Inp label="Fat (g)" type="number" value={genFat} onChange={e => setGenFat(parseInt(e.target.value) || 0)} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <SectionLabel>Number of meals</SectionLabel>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {[3, 4, 5, 6].map(n => (
                      <button key={n} onClick={() => setGenMeals(n)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${genMeals === n ? "var(--purple-border)" : C.border}`, background: genMeals === n ? "var(--purple-surface)" : "transparent", color: genMeals === n ? C.purple : C.t3, cursor: "pointer", fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600 }}>{n}</button>
                    ))}
                  </div>
                </div>
              </Card>
              <Btn onClick={generateMealPlan} disabled={busy}>{busy ? "Generating..." : `Generate AI meal plan for ${client.name.split(" ")[0]}`}</Btn>
            </>
          )}
        </div>
      )}

      {/* ── PROGRESS (same as client Progress page, read-only) ── */}
      {tab === "progress" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {weightData.length > 1 && (
            <Card>
              <SectionLabel>Weight trend</SectionLabel>
              <div style={{ marginTop: 12 }}>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={weightData}>
                    <defs><linearGradient id="pwg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="100%" stopColor="#a855f7" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="day" tick={{ fill: "var(--text-4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={["dataMin-1", "dataMax+1"]} tick={{ fill: "var(--text-4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: `1px solid var(--border)`, borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="weight" stroke="#a855f7" fill="url(#pwg)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {perfData.length > 1 && (
            <Card>
              <SectionLabel>Energy, sleep & stress</SectionLabel>
              <div style={{ marginTop: 12 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={perfData}>
                    <XAxis dataKey="day" tick={{ fill: "var(--text-4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fill: "var(--text-4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: `1px solid var(--border)`, borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="energy" fill="#a855f7" radius={[3, 3, 0, 0]} barSize={6} />
                    <Bar dataKey="sleep" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={6} />
                    <Bar dataKey="stress" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, fontSize: 11, color: C.t3 }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#a855f7", marginRight: 4 }} />Energy</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#f59e0b", marginRight: 4 }} />Sleep</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#ef4444", marginRight: 4 }} />Stress</span>
              </div>
            </Card>
          )}

          {latest && (
            <Card>
              <SectionLabel>Body measurements</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                {["arms", "shoulders", "back", "waist", "hips", "glutes", "quads"].map(k => (
                  <div key={k} style={{ textAlign: "center", padding: "8px 0" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.teal }}>{latest[k] || "—"}<span style={{ fontSize: 10, color: C.t3 }}> cm</span></div>
                    <div style={{ fontSize: 10, color: C.t3, textTransform: "capitalize", marginTop: 2 }}>{k}</div>
                    {delta(k) && <div style={{ fontSize: 10, color: parseFloat(delta(k)) < 0 ? (k === "waist" ? C.green : C.pink) : (k === "waist" ? C.pink : C.green), marginTop: 2, fontWeight: 600 }}>{delta(k)}</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {checkins.length === 0 && !latest && <Empty icon="📊" title="No progress data yet" sub="Check-ins and measurements will appear here" />}
        </div>
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
