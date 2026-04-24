"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, Inp, Pill, SectionLabel, C } from "@/components/ui";

const RESTRICTIONS = ["Gluten-free", "Dairy-free", "Vegan", "Vegetarian", "Halal", "Kosher", "Nut allergy", "Soy-free", "Egg-free", "Shellfish allergy", "Low FODMAP", "Keto"];

export default function OnboardingPage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [calories, setCalories] = useState(user?.calories || 2200);
  const [protein, setProtein] = useState(user?.protein || 180);
  const [carbs, setCarbs] = useState(user?.carbs || 250);
  const [fat, setFat] = useState(user?.fat || 70);
  const [height, setHeight] = useState(user?.height || "");
  const [bodyFat, setBodyFat] = useState(user?.bodyFat || "");
  const [restrictions, setRestrictions] = useState(user?.dietaryRestrictions || []);

  const toggleRestriction = (r) => setRestrictions(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]);

  const finish = async () => {
    setBusy(true);
    try {
      await updateProfile({ calories: parseInt(calories), protein: parseInt(protein), carbs: parseInt(carbs), fat: parseInt(fat), height: height ? parseFloat(height) : undefined, bodyFat: bodyFat ? parseFloat(bodyFat) : undefined, dietaryRestrictions: restrictions, onboarded: true });
      router.push("/dashboard");
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-gradient)" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Syne'", fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>Welcome, {user.name.split(" ")[0]}</h1>
          <p style={{ color: C.t3, fontSize: 13 }}>Let's set up your profile</p>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>{[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? C.purple : C.border }} />)}</div>

        {step === 1 && (<Card><SectionLabel>Body stats</SectionLabel><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}><Inp label="Height (cm)" type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="165" /><Inp label="Body fat %" type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="22" /></div><Btn onClick={() => setStep(2)} style={{ marginTop: 20 }}>Next</Btn></Card>)}

        {step === 2 && (<Card><SectionLabel>Daily macro targets</SectionLabel><p style={{ color: C.t3, fontSize: 12, marginTop: 4, marginBottom: 14 }}>Your coach can adjust these later.</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Inp label="Calories" type="number" value={calories} onChange={e => setCalories(e.target.value)} /><Inp label="Protein (g)" type="number" value={protein} onChange={e => setProtein(e.target.value)} /><Inp label="Carbs (g)" type="number" value={carbs} onChange={e => setCarbs(e.target.value)} /><Inp label="Fat (g)" type="number" value={fat} onChange={e => setFat(e.target.value)} /></div><div style={{ display: "flex", gap: 8, marginTop: 20 }}><Btn variant="secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</Btn><Btn onClick={() => setStep(3)} style={{ flex: 2 }}>Next</Btn></div></Card>)}

        {step === 3 && (<Card><SectionLabel>Dietary restrictions</SectionLabel><p style={{ color: C.t3, fontSize: 12, marginTop: 4, marginBottom: 14 }}>Helps the AI generate safe recipes for you.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{RESTRICTIONS.map(r => <Pill key={r} active={restrictions.includes(r)} onClick={() => toggleRestriction(r)}>{r}</Pill>)}</div><div style={{ display: "flex", gap: 8, marginTop: 20 }}><Btn variant="secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>Back</Btn><Btn onClick={finish} disabled={busy} style={{ flex: 2 }}>{busy ? "Saving..." : "Complete setup"}</Btn></div></Card>)}

        <button onClick={() => { updateProfile({ onboarded: true }); router.push("/dashboard"); }} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: C.t4, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans'" }}>Skip for now</button>
      </div>
    </div>
  );
}
