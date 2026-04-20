"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, MacroRow, SectionLabel, Loading, C, api } from "@/components/ui";

export default function MealPlanPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(null);

  useEffect(() => {
    api("/meal-plans?current=1").then(d => { setPlan(d.mealPlan); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const swapMeal = async (mealId) => {
    setSwapping(mealId);
    try {
      await api("/meal-plans", { method: "POST", body: { action: "swap", mealId } });
      const d = await api("/meal-plans?current=1");
      setPlan(d.mealPlan);
    } catch (e) { alert(e.message); }
    setSwapping(null);
  };

  if (loading) return <Loading msg="Loading meal plan" />;

  if (!plan) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Meal plan</h2>
      <Card style={{ textAlign: "center", padding: "50px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📋</div>
        <p style={{ color: C.t3, fontSize: 14, fontWeight: 500 }}>No meal plan assigned yet</p>
        <p style={{ color: C.t4, fontSize: 12, marginTop: 4 }}>Your coach will create a meal plan for you.</p>
      </Card>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Your meal plan</h2>
        {plan.weekLabel && <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{plan.weekLabel}</div>}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: C.t4 }}>{plan.meals?.length || 0} meals · {plan.totalCalories} kcal</span>
        </div>
      </div>

      <MacroRow calories={plan.totalCalories} protein={plan.totalProtein} carbs={plan.totalCarbs} fat={plan.totalFat} />

      {(plan.meals || []).map((meal) => (
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

          {/* AI Swap — only if coach enabled it */}
          {user?.allowMealSwap && (
            <button onClick={() => swapMeal(meal.id)} disabled={swapping === meal.id} style={{
              width: "100%", marginTop: 10,
              background: "var(--purple-surface)", border: `1px solid var(--purple-border)`, color: C.purple,
              padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              cursor: swapping === meal.id ? "not-allowed" : "pointer", fontFamily: "'DM Sans'",
            }}>
              {swapping === meal.id ? "⚙️ Swapping..." : "🔄 AI Swap"}
            </button>
          )}

          {!user?.allowMealSwap && (
            <div style={{ fontSize: 10, color: C.t4, textAlign: "center", marginTop: 8, padding: "6px", background: C.subtle, borderRadius: 6 }}>
              Meal swaps not enabled — ask your coach
            </div>
          )}

          {meal.swappedAt && <div style={{ fontSize: 10, color: C.green, marginTop: 6, textAlign: "center" }}>✓ Swapped {new Date(meal.swappedAt).toLocaleDateString("en-ZA")}</div>}
        </Card>
      ))}
    </div>
  );
}
