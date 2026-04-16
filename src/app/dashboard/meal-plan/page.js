"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, MacroRow, Pill, SectionLabel, Loading, ErrorMsg, C, api } from "@/components/ui";

const emptyFood = () => ({ name: "", amount: "", calories: 0, protein: 0, carbs: 0, fat: 0 });

export default function MealPlanPage() {
  const { user, isPremium, isCoach } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(user?.goal || "MAINTAIN");
  const [meals, setMeals] = useState(4);
  const [mode, setMode] = useState("ai"); // ai | hybrid | manual
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [swapping, setSwapping] = useState(null);

  // Inline meal editor
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    api("/meal-plans?current=1").then(d => { setPlan(d.mealPlan); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const generate = async () => {
    setGenerating(true); setError("");
    try {
      const data = await api("/meal-plans", { method: "POST", body: { calories: user.calories, protein: user.protein, carbs: user.carbs, fat: user.fat, goal, meals, mode } });
      setPlan(data.mealPlan);
    } catch (e) { setError(e.message); }
    setGenerating(false);
  };

  const swapMeal = async (mealId) => {
    setSwapping(mealId);
    try {
      await api("/meal-plans", { method: "POST", body: { action: "swap", mealId } });
      const d = await api("/meal-plans?current=1");
      setPlan(d.mealPlan);
    } catch (e) { alert(e.message); }
    setSwapping(null);
  };

  // ── Inline edit ──
  const startEdit = (meal) => {
    setEditingId(meal.id);
    setDraft({
      name: meal.name || "",
      time: meal.time || "",
      calories: meal.calories || 0,
      protein: meal.protein || 0,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      foods: (meal.foods || []).map(f => ({
        name: f.name || f.item || "",
        amount: f.amount || "",
        calories: f.calories || f.cal || 0,
        protein: f.protein || f.p || 0,
        carbs: f.carbs || f.c || 0,
        fat: f.fat || f.f || 0,
      })),
      instructions: meal.instructions || "",
    });
  };

  const cancelEdit = () => { setEditingId(null); setDraft(null); };

  const updateDraft = (field, value) => setDraft(d => ({ ...d, [field]: value }));
  const updateDraftFood = (idx, field, value) => setDraft(d => ({ ...d, foods: d.foods.map((f, i) => i === idx ? { ...f, [field]: value } : f) }));
  const addDraftFood = () => setDraft(d => ({ ...d, foods: [...d.foods, emptyFood()] }));
  const removeDraftFood = (idx) => setDraft(d => ({ ...d, foods: d.foods.filter((_, i) => i !== idx) }));

  const recomputeDraftTotals = () => {
    const totals = draft.foods.reduce((t, f) => ({
      calories: t.calories + (parseInt(f.calories) || 0),
      protein: t.protein + (parseInt(f.protein) || 0),
      carbs: t.carbs + (parseInt(f.carbs) || 0),
      fat: t.fat + (parseInt(f.fat) || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    setDraft(d => ({ ...d, ...totals }));
  };

  const saveEdit = async () => {
    if (!editingId || !draft) return;
    setSavingEdit(true);
    try {
      const body = {
        action: "update_meal",
        mealId: editingId,
        name: draft.name.trim() || "Meal",
        time: draft.time || null,
        calories: parseInt(draft.calories) || 0,
        protein: parseInt(draft.protein) || 0,
        carbs: parseInt(draft.carbs) || 0,
        fat: parseInt(draft.fat) || 0,
        foods: draft.foods.filter(f => f.name.trim()).map(f => ({
          name: f.name.trim(),
          amount: f.amount || "",
          calories: parseInt(f.calories) || 0,
          protein: parseInt(f.protein) || 0,
          carbs: parseInt(f.carbs) || 0,
          fat: parseInt(f.fat) || 0,
        })),
        instructions: draft.instructions || null,
      };
      await api("/meal-plans", { method: "POST", body });
      const d = await api("/meal-plans?current=1");
      setPlan(d.mealPlan);
      cancelEdit();
    } catch (e) { alert(e.message); }
    setSavingEdit(false);
  };

  if (loading) return <Loading msg="Loading meal plan" />;
  if (generating) return <Loading msg={mode === "manual" ? "Creating blank plan" : "Building your meal plan"} />;

  // ── EXISTING PLAN VIEW ──
  if (plan) {
    const canEdit = user?.role === "CLIENT" ? !!user?.allowMealSwap : true; // coaches can always edit their clients' plans, owners can edit own
    const modeBadge = plan.mode === "hybrid" ? "HYBRID" : plan.mode === "manual" ? "MANUAL" : "AI";
    const modeColor = plan.mode === "hybrid" ? C.amber : plan.mode === "manual" ? C.teal : C.purple;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Your meal plan</h2>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${modeColor}18`, color: modeColor, fontWeight: 700, letterSpacing: 1 }}>{modeBadge}</span>
              <span style={{ fontSize: 11, color: C.t4 }}>{plan.meals?.length || 0} meals</span>
            </div>
          </div>
          <button onClick={() => setPlan(null)} style={{ background: "none", border: "1px solid " + C.border, color: C.t3, padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'" }}>New plan</button>
        </div>
        <MacroRow calories={plan.totalCalories} protein={plan.totalProtein} carbs={plan.totalCarbs} fat={plan.totalFat} />

        {(plan.meals || []).map((meal) => {
          const isEditing = editingId === meal.id;
          if (isEditing && draft) {
            return (
              <Card key={meal.id} style={{ borderColor: `${C.amber}40` }}>
                <SectionLabel>Editing meal</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginTop: 12 }}>
                  <input value={draft.name} onChange={e => updateDraft("name", e.target.value)} placeholder="Meal name"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "8px 12px", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "'DM Sans'" }} />
                  <input value={draft.time} onChange={e => updateDraft("time", e.target.value)} placeholder="e.g. 12:30 PM"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "8px 12px", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "'DM Sans'" }} />
                </div>

                <div style={{ marginTop: 14 }}>
                  <SectionLabel>Foods</SectionLabel>
                  {draft.foods.map((f, i) => (
                    <div key={i} style={{ padding: 8, background: "rgba(255,255,255,0.02)", borderRadius: 6, marginTop: 6 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                        <input value={f.name} onChange={e => updateDraftFood(i, "name", e.target.value)} placeholder="Food name"
                          style={{ flex: 2, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px 10px", borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "'DM Sans'" }} />
                        <input value={f.amount} onChange={e => updateDraftFood(i, "amount", e.target.value)} placeholder="150g"
                          style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px 10px", borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "'DM Sans'" }} />
                        <button onClick={() => removeDraftFood(i)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.t4, padding: "2px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans'" }}>×</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
                        {["calories", "protein", "carbs", "fat"].map(k => (
                          <div key={k}>
                            <div style={{ fontSize: 8, color: C.t4, marginBottom: 1, textTransform: "uppercase", letterSpacing: 1 }}>{k === "calories" ? "kcal" : k.slice(0, 1) + "g"}</div>
                            <input type="number" value={f[k]} onChange={e => updateDraftFood(i, k, e.target.value)}
                              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "4px 6px", borderRadius: 4, fontSize: 11, outline: "none", fontFamily: "'DM Sans'", textAlign: "center" }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={addDraftFood} style={{ width: "100%", marginTop: 6, background: "rgba(168,85,247,0.08)", border: "1px dashed rgba(168,85,247,0.3)", color: C.purple, padding: "6px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>+ Add food</button>
                  <button onClick={recomputeDraftTotals} style={{ width: "100%", marginTop: 6, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: C.amber, padding: "6px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>↻ Recompute meal totals from foods</button>
                </div>

                <div style={{ marginTop: 14 }}>
                  <SectionLabel>Meal totals</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 8 }}>
                    {[["calories", "kcal"], ["protein", "P g"], ["carbs", "C g"], ["fat", "F g"]].map(([k, l]) => (
                      <div key={k}>
                        <div style={{ fontSize: 9, color: C.t4, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                        <input type="number" value={draft[k]} onChange={e => updateDraft(k, e.target.value)}
                          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "6px 8px", borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "'DM Sans'", textAlign: "center", fontWeight: 600 }} />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <SectionLabel>Instructions (optional)</SectionLabel>
                  <textarea value={draft.instructions} onChange={e => updateDraft("instructions", e.target.value)} rows={2} placeholder="Prep/cook notes..."
                    style={{ width: "100%", marginTop: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "8px 10px", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "'DM Sans'", resize: "vertical" }} />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Btn variant="secondary" onClick={cancelEdit} style={{ flex: 1 }}>Cancel</Btn>
                  <Btn onClick={saveEdit} disabled={savingEdit} style={{ flex: 2 }}>{savingEdit ? "Saving..." : "Save meal"}</Btn>
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
                  <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>P{meal.protein} C{meal.carbs} F{meal.fat}</div>
                </div>
              </div>
              {(meal.foods || []).map((f, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: j < meal.foods.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontSize: 13, color: C.t2 }}>{f.name || f.item}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.lavender }}>{f.amount}</span>
                </div>
              ))}
              {meal.instructions && <div style={{ fontSize: 12, color: C.t3, marginTop: 10, padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, lineHeight: 1.5 }}>{meal.instructions}</div>}

              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {/* Edit button — owner or coach */}
                {canEdit && (
                  <button onClick={() => startEdit(meal)} style={{
                    flex: 1, background: "rgba(245,158,11,0.08)", border: `1px solid rgba(245,158,11,0.2)`, color: C.amber,
                    padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'",
                  }}>✏️ Edit meal</button>
                )}
                {/* Swap button — clients w/ permission only */}
                {user?.allowMealSwap && user?.role === "CLIENT" && (
                  <button onClick={() => swapMeal(meal.id)} disabled={swapping === meal.id} style={{
                    flex: 1, background: "rgba(168,85,247,0.08)", border: `1px solid rgba(168,85,247,0.2)`, color: C.purple,
                    padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: swapping === meal.id ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans'",
                  }}>
                    {swapping === meal.id ? "⚙️ Swapping..." : "🔄 AI Swap"}
                  </button>
                )}
              </div>

              {user?.role === "CLIENT" && !user?.allowMealSwap && (
                <div style={{ fontSize: 11, color: C.t4, textAlign: "center", marginTop: 8, padding: "6px", background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
                  Meal swap not enabled — ask your coach
                </div>
              )}
              {meal.swappedAt && <div style={{ fontSize: 10, color: C.green, marginTop: 6, textAlign: "center" }}>✓ Swapped {new Date(meal.swappedAt).toLocaleDateString("en-ZA")}</div>}
            </Card>
          );
        })}
      </div>
    );
  }

  // ── GENERATOR ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div><h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Meal plan generator</h2><p style={{ fontSize: 13, color: C.t3, marginTop: 4 }}>AI creates a full day matched to your goals — or start from scratch.</p></div>

      {!isPremium && (
        <Card style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>👑</span>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>Premium feature</div><div style={{ fontSize: 12, color: C.t3 }}>Upgrade to unlock meal plans</div></div>
          </div>
        </Card>
      )}

      <Card>
        <SectionLabel>Mode</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          {[
            { v: "ai", label: "🤖 AI", desc: "Fully AI-generated" },
            { v: "hybrid", label: "⚡ Hybrid", desc: "AI + manual edits" },
            { v: "manual", label: "✏️ Manual", desc: "Start blank" },
          ].map(m => (
            <button key={m.v} onClick={() => setMode(m.v)} style={{
              background: mode === m.v ? `linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2))` : "rgba(255,255,255,0.02)",
              border: `1px solid ${mode === m.v ? C.purple + "60" : C.border}`,
              padding: "12px 8px", borderRadius: 10, cursor: "pointer",
              fontFamily: "'DM Sans'", color: mode === m.v ? "#fff" : C.t3,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: C.t4, marginTop: 2 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>Your daily targets</SectionLabel>
        <div style={{ marginTop: 12 }}><MacroRow calories={user.calories} protein={user.protein} carbs={user.carbs} fat={user.fat} /></div>
      </Card>

      <Card>
        <SectionLabel>Goal</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {["BUILD", "CUT", "MAINTAIN", "PERFORMANCE"].map(g => <Pill key={g} active={goal === g} onClick={() => setGoal(g)}>{g.toLowerCase()}</Pill>)}
        </div>
      </Card>

      <Card>
        <SectionLabel>Number of meals</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[3, 4, 5, 6].map(n => <Pill key={n} active={meals === n} onClick={() => setMeals(n)}>{n} meals</Pill>)}
        </div>
      </Card>

      <div style={{ fontSize: 11, color: C.t4, padding: "0 4px", lineHeight: 1.5 }}>
        {mode === "ai" && "AI generates all meals. You can swap individual meals later if your coach allows it."}
        {mode === "hybrid" && "AI generates a starting plan. You can then edit any meal's foods, macros, and instructions."}
        {mode === "manual" && "Creates a blank plan template you can fill in by editing each meal."}
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      <Btn onClick={generate} disabled={!isPremium}>{isPremium ? (mode === "manual" ? "Create blank plan" : "Generate meal plan") : "Upgrade to unlock"}</Btn>
    </div>
  );
}
