"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, MacroRing, SectionLabel, Loading, Avatar, C, api } from "@/components/ui";

export default function DashboardHome() {
  const { user, isCoach, isEducator, isPremium, remaining } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [coachTab, setCoachTab] = useState("clients");
  const [addEmail, setAddEmail] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (isEducator) { router.replace("/dashboard/educator"); return; }
    if (isCoach) api("/clients").then(d => setClients(d.clients || [])).catch(() => {});
  }, [isCoach, isEducator]);

  // Educator: show nothing while redirect is in progress
  if (isEducator) return <Loading msg="Loading educator portal" />;

  // ── COACH HOME ──
  if (isCoach) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div><div style={{ fontSize: 13, color: C.t3 }}>Coach dashboard</div><div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Syne'", color: C.t1 }}>{user.name}</div></div>

      <div style={{ display: "flex", gap: 2, background: C.subtle, padding: 3, borderRadius: 10 }}>
        {["clients", "inbox"].map(t => <button key={t} onClick={() => setCoachTab(t)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, textTransform: "uppercase", background: coachTab === t ? "var(--purple-surface)" : "transparent", color: coachTab === t ? C.purple : C.t3 }}>{t}</button>)}
      </div>

      {coachTab === "clients" && (<>
        <SectionLabel>{clients.length} active clients</SectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Add client by email" value={addEmail} onChange={e => setAddEmail(e.target.value)} style={{ flex: 1, background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans'", outline: "none" }} />
          <button onClick={async () => { try { await api("/clients", { method: "POST", body: { email: addEmail } }); setAddEmail(""); const d = await api("/clients"); setClients(d.clients); setAddError(""); } catch (e) { setAddError(e.message); } }} style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", border: "none", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>Add</button>
        </div>
        {addError && <div style={{ color: C.red, fontSize: 12 }}>{addError}</div>}

        {clients.map(c => (
          <Card key={c.id} onClick={() => router.push(`/dashboard/coaching?clientId=${c.id}`)} style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <Avatar name={c.name} color={c.goal === "BUILD" ? C.purple : c.goal === "CUT" ? C.pink : C.teal} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{c.goal} · {c.gender?.toLowerCase()} · {c.calories} kcal</div>
            </div>
            {c.hasPendingCheckin && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />}
          </Card>
        ))}
      </>)}

      {coachTab === "inbox" && (<>
        <SectionLabel>Pending check-ins</SectionLabel>
        {clients.filter(c => c.hasPendingCheckin).length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.t3 }}>All caught up</div>}
        {clients.filter(c => c.hasPendingCheckin).map(c => (
          <Card key={c.id} onClick={() => router.push(`/dashboard/coaching?clientId=${c.id}&tab=checkins`)} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={c.name} size={36} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{c.name}</div><div style={{ fontSize: 12, color: C.t3 }}>{c.latestCheckin?.weight} kg</div></div>
              <div style={{ background: "var(--purple-surface)", padding: "4px 10px", borderRadius: 6, fontSize: 11, color: C.purple, fontWeight: 600 }}>Review</div>
            </div>
          </Card>
        ))}
      </>)}
    </div>
  );

  // ── CLIENT HOME ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontSize: 13, color: C.t3 }}>Welcome back</div><div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Syne'", color: C.t1 }}>{user.name}</div></div>
        {remaining !== null && <div style={{ padding: "5px 10px", borderRadius: 6, background: remaining > 0 ? "var(--purple-surface)" : "var(--red-surface)", border: `1px solid ${remaining > 0 ? "var(--purple-border)" : "rgba(239,68,68,0.2)"}`, fontSize: 10, fontWeight: 600, color: remaining > 0 ? C.purple : C.red }}>{remaining}/3 free</div>}
      </div>

      <Card>
        <SectionLabel>Daily targets</SectionLabel>
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 14 }}>
          <MacroRing value={user.calories} max={user.calories} label="Cals" color={C.purple} unit="kcal" />
          <MacroRing value={user.protein} max={user.protein} label="Protein" color={C.pink} />
          <MacroRing value={user.carbs} max={user.carbs} label="Carbs" color={C.violet} />
          <MacroRing value={user.fat} max={user.fat} label="Fat" color={C.lavender} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { icon: "✅", label: "Daily check-in", sub: "Log today's data", path: "/dashboard/checkin" },
          { icon: "📋", label: "Meal plan", sub: "Your daily plan", path: "/dashboard/meal-plan" },
          { icon: "🔍", label: "Recipe AI", sub: "3 generation modes", path: "/dashboard/nutrition" },
          { icon: "💪", label: "Training", sub: "Log your lifts", path: "/dashboard/training" },
          { icon: "📊", label: "Progress", sub: "Track your journey", path: "/dashboard/progress" },
          { icon: "📍", label: "Book", sub: "Massage, posing", path: "/dashboard/booking" },
        ].map(a => (
          <button key={a.label} onClick={() => router.push(a.path)} style={{ background: "var(--purple-surface)", border: `1px solid var(--purple-border)`, borderRadius: 14, padding: "20px 14px", cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ color: C.t1, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans'" }}>{a.label}</div>
            <div style={{ color: C.t3, fontSize: 11, fontFamily: "'DM Sans'", marginTop: 2 }}>{a.sub}</div>
          </button>
        ))}
      </div>

      {!isPremium && (
        <Card onClick={() => router.push("/dashboard/upgrade")} style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.06),rgba(236,72,153,0.04))", borderColor: "var(--purple-border)", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
          <div style={{ fontSize: 28 }}>👑</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>Go Premium</div><div style={{ fontSize: 12, color: C.t3 }}>Unlimited recipes, meal plans & more</div></div>
          <div style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", color: "#fff", padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>Upgrade</div>
        </Card>
      )}
    </div>
  );
}
