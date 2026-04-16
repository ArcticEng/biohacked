"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, Inp, Pill, MacroRow, SectionLabel, Loading, ErrorMsg, Empty, C, api } from "@/components/ui";

const CRAVING_EVENTS = [
  { v: "Movie Night", e: "🍿" },
  { v: "Date Night", e: "💑" },
  { v: "Quick Prep", e: "⏱" },
  { v: "Post-Workout", e: "🏋️" },
];

export default function NutritionPage() {
  const { user, isPremium, remaining } = useAuth();
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "generate");
  const [mode, setMode] = useState(null); // null | "macro" | "craving" | "mealplan"
  const [query, setQuery] = useState("");

  // Macro mode
  const [macros, setMacros] = useState({ calories: "", protein: "", carbs: "", fat: "" });

  // Craving mode
  const [event, setEvent] = useState("");
  const [calBudget, setCalBudget] = useState("");
  const [maxPrep, setMaxPrep] = useState("");

  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [recipeTab, setRecipeTab] = useState("ingredients");
  const [error, setError] = useState("");

  useEffect(() => { if (tab === "saved") loadSaved(); }, [tab]);
  const loadSaved = async () => { try { const d = await api("/recipes"); setSavedRecipes(d.recipes); } catch {} };

  const generate = async () => {
    setError(""); setLoading(true);
    try {
      const body = { mode };
      if (mode === "macro") {
        if (!query.trim()) { setError("Describe what you'd like to eat"); setLoading(false); return; }
        body.query = query;
        body.calories = parseInt(macros.calories) || Math.round(user.calories / 4);
        body.protein = parseInt(macros.protein) || Math.round(user.protein / 4);
        body.carbs = parseInt(macros.carbs) || Math.round(user.carbs / 4);
        body.fat = parseInt(macros.fat) || Math.round(user.fat / 4);
      } else if (mode === "craving") {
        if (!event) { setError("Pick a scenario"); setLoading(false); return; }
        body.event = event;
        body.query = event;
        body.calories = parseInt(calBudget) || 450;
        body.protein = Math.round((parseInt(calBudget) || 450) * 0.3 / 4);
        body.carbs = Math.round((parseInt(calBudget) || 450) * 0.4 / 4);
        body.fat = Math.round((parseInt(calBudget) || 450) * 0.3 / 9);
        body.maxPrepTime = parseInt(maxPrep) || 30;
      } else if (mode === "mealplan") {
        body.query = "full day meal plan";
        body.calories = user.calories;
        body.protein = user.protein;
        body.carbs = user.carbs;
        body.fat = user.fat;
      }

      const data = await api("/recipes", { method: "POST", body });
      setRecipe(data.recipe);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const save = async () => {
    if (!recipe) return;
    try { await api("/recipes", { method: "POST", body: { action: "save", recipeId: recipe.id } }); } catch {}
  };

  // ── RESULT VIEW ──
  if (recipe) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>{recipe.name}</h2>
      {recipe.prepTime && <span style={{ fontSize: 12, color: C.t3 }}>Prep: {recipe.prepTime}</span>}
      <MacroRow calories={recipe.calories} protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />

      <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.03)", padding: 3, borderRadius: 10 }}>
        {["ingredients", "method", ...(recipe.tips ? ["tips"] : [])].map(t => (
          <button key={t} onClick={() => setRecipeTab(t)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, textTransform: "uppercase", background: recipeTab === t ? "rgba(168,85,247,0.15)" : "transparent", color: recipeTab === t ? C.purple : C.t3 }}>{t}</button>
        ))}
      </div>

      <Card style={{ minHeight: 180 }}>
        {recipeTab === "ingredients" && (recipe.ingredients || []).map((ing, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i < recipe.ingredients.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ fontSize: 14, color: C.t2 }}>{ing.name || ing.i}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.lavender }}>{ing.amount || ing.a}</span>
          </div>
        ))}
        {recipeTab === "method" && (recipe.method || []).map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: "rgba(168,85,247,0.12)", color: C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
            <p style={{ fontSize: 14, color: C.t2, lineHeight: 1.6 }}>{step}</p>
          </div>
        ))}
        {recipeTab === "tips" && <p style={{ fontSize: 14, color: C.t2, lineHeight: 1.7 }}>{recipe.tips}</p>}
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="secondary" onClick={save}>Save recipe</Btn>
        <Btn onClick={() => { setRecipe(null); setMode(null); }}>New recipe</Btn>
      </div>
    </div>
  );

  if (loading) return <Loading msg="Crafting your recipe" />;

  // ── SAVED ──
  if (tab === "saved") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Saved recipes</h2>
        <button onClick={() => setTab("generate")} style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: C.purple, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>+ New</button>
      </div>
      {savedRecipes.length === 0 ? <Empty icon="🍽️" title="No saved recipes yet" action="Generate your first" onAction={() => setTab("generate")} /> : savedRecipes.map((r, i) => (
        <Card key={i} onClick={() => { setRecipe(r); setRecipeTab("ingredients"); }} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{r.name}</div>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.t3 }}>
            <span style={{ color: C.purple }}>{r.calories} kcal</span>
            <span>P{r.protein}g</span><span>C{r.carbs}g</span><span>F{r.fat}g</span>
          </div>
        </Card>
      ))}
    </div>
  );

  // ── MODE SELECTOR ──
  if (!mode) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>AI Recipe generator</h2>
          <p style={{ fontSize: 13, color: C.t3, marginTop: 4 }}>Choose a generation mode</p>
        </div>
        <button onClick={() => setTab("saved")} style={{ background: "none", border: "1px solid " + C.border, color: C.t3, padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'" }}>Saved ⭐</button>
      </div>

      {[
        { id: "macro", icon: "🎯", title: "Macro-matched", sub: "Hit exact calorie & macro targets" },
        { id: "craving", icon: "😋", title: "Craving mode", sub: "Movie night, date night, quick prep, post-workout" },
        { id: "mealplan", icon: "📋", title: "Full meal plan", sub: "Complete day of eating (Premium)", premium: true },
      ].map(m => (
        <Card key={m.id} onClick={() => (!m.premium || isPremium) && setMode(m.id)} style={{ cursor: (!m.premium || isPremium) ? "pointer" : "not-allowed", opacity: (!m.premium || isPremium) ? 1 : 0.5, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 28 }}>{m.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              {m.title}
              {m.premium && <span style={{ fontSize: 9, background: "rgba(245,158,11,0.1)", color: C.amber, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>PREMIUM</span>}
            </div>
            <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{m.sub}</div>
          </div>
          <div style={{ fontSize: 18, color: C.t4 }}>→</div>
        </Card>
      ))}

      {!isPremium && <p style={{ fontSize: 11, color: C.t4, textAlign: "center" }}>{remaining}/3 free recipes remaining this week</p>}
    </div>
  );

  // ── MACRO MODE ──
  if (mode === "macro") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setMode(null)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16 }}>←</button>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Macro-matched recipe</h2>
      </div>

      <Inp placeholder='"High protein pizza" or "post-workout smoothie"' value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} style={{ fontSize: 15, padding: "16px 18px" }} />

      <Card>
        <SectionLabel>Meal macro targets</SectionLabel>
        <p style={{ fontSize: 11, color: C.t4, marginTop: 4, marginBottom: 14 }}>Leave blank to auto-split daily ÷ 4</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          {[{ k: "calories", l: "Cals", c: C.purple }, { k: "protein", l: "Protein", c: C.pink }, { k: "carbs", l: "Carbs", c: C.violet }, { k: "fat", l: "Fat", c: C.lavender }].map(m => (
            <div key={m.k}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.c, margin: "0 auto 6px" }} />
              <input type="number" placeholder={Math.round(user[m.k] / 4)} value={macros[m.k]} onChange={e => setMacros({ ...macros, [m.k]: e.target.value })} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "10px 8px", borderRadius: 8, fontSize: 15, fontFamily: "'DM Sans'", outline: "none", textAlign: "center", fontWeight: 600 }} />
              <div style={{ fontSize: 9, textAlign: "center", marginTop: 4, color: C.t4, textTransform: "uppercase", letterSpacing: 1 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {["Protein pancakes", "Chicken stir-fry", "Greek yogurt bowl", "Lean burger"].map(i => <Pill key={i} active={query === i} onClick={() => setQuery(i)}>{i}</Pill>)}
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      <Btn onClick={generate} disabled={!isPremium && remaining <= 0}>
        {isPremium || remaining > 0 ? "Generate recipe" : "Upgrade for unlimited"}
      </Btn>
    </div>
  );

  // ── CRAVING MODE ──
  if (mode === "craving") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setMode(null)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16 }}>←</button>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Craving mode</h2>
      </div>

      <Card>
        <SectionLabel>What's the scenario?</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          {CRAVING_EVENTS.map(ev => (
            <button key={ev.v} onClick={() => setEvent(ev.v)} style={{
              padding: "16px 10px", borderRadius: 10, border: `1px solid ${event === ev.v ? "rgba(168,85,247,0.4)" : C.border}`, cursor: "pointer",
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
              background: event === ev.v ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.02)",
              color: event === ev.v ? C.purple : C.t2,
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{ev.e}</div>{ev.v}
            </button>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Calorie budget" type="number" placeholder="450" value={calBudget} onChange={e => setCalBudget(e.target.value)} />
        <Inp label="Max prep (min)" type="number" placeholder="15" value={maxPrep} onChange={e => setMaxPrep(e.target.value)} />
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      <Btn onClick={generate} disabled={!isPremium && remaining <= 0}>
        {isPremium || remaining > 0 ? "Generate recipe" : "Upgrade for unlimited"}
      </Btn>
    </div>
  );

  // ── MEALPLAN (single recipe for full day pattern) ──
  if (mode === "mealplan") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setMode(null)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16 }}>←</button>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Full meal plan</h2>
      </div>
      <Card>
        <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>For a full day of meals matched to your daily targets, use the <strong style={{ color: C.purple }}>Meal Plan</strong> page instead.</p>
        <Btn onClick={() => window.location.href = "/dashboard/meal-plan"} style={{ marginTop: 12 }}>Go to Meal Plan →</Btn>
      </Card>
    </div>
  );

  return null;
}
