"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Card, Btn, Inp, Pill, SectionLabel, ErrorMsg, C } from "@/components/ui";

export default function SettingsPage() {
  const { user, logout, updateProfile, isPremium, isCoach, isEducator, isClient } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [goal, setGoal] = useState(user?.goal || "MAINTAIN");
  const [height, setHeight] = useState(user?.height || "");
  const [bodyFat, setBodyFat] = useState(user?.bodyFat || "");
  const [calories, setCalories] = useState(user?.calories || 2200);
  const [protein, setProtein] = useState(user?.protein || 180);
  const [carbs, setCarbs] = useState(user?.carbs || 250);
  const [fat, setFat] = useState(user?.fat || 70);

  const [credentials, setCredentials] = useState(user?.credentials || "");
  const [speciality, setSpeciality] = useState(user?.speciality || "");

  const [cycleLength, setCycleLength] = useState(user?.cycleLength || 28);
  const [lastCycleStart, setLastCycleStart] = useState(
    user?.lastCycleStart ? new Date(user.lastCycleStart).toISOString().slice(0, 10) : ""
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      const payload = {
        name,
        calories: parseInt(calories),
        protein: parseInt(protein),
        carbs: parseInt(carbs),
        fat: parseInt(fat),
      };
      if (age) payload.age = parseInt(age);
      if (gender) payload.gender = gender;
      if (goal) payload.goal = goal;
      if (height) payload.height = parseFloat(height);
      if (bodyFat) payload.bodyFat = parseFloat(bodyFat);
      if (isEducator) {
        if (credentials) payload.credentials = credentials;
        if (speciality) payload.speciality = speciality;
      }
      if (isClient && gender === "FEMALE") {
        if (cycleLength) payload.cycleLength = parseInt(cycleLength);
        if (lastCycleStart) payload.lastCycleStart = lastCycleStart;
      }

      await updateProfile(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Settings</h2>

      {/* Theme selector */}
      <Card>
        <SectionLabel>Appearance</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          {[
            { v: "dark", label: "Dark", emoji: "🌙", desc: "Easy on the eyes at night" },
            { v: "light", label: "Light", emoji: "☀️", desc: "Bright and clean" },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => setTheme(t.v)}
              style={{
                padding: 14,
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "left",
                background: theme === t.v ? "var(--purple-surface)" : C.elevated,
                border: `1px solid ${theme === t.v ? "var(--purple-border)" : C.border}`,
                color: C.t1,
                fontFamily: "'DM Sans'",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</span>
                {theme === t.v && <span style={{ marginLeft: "auto", fontSize: 11, color: C.purple, fontWeight: 600 }}>✓</span>}
              </div>
              <div style={{ fontSize: 11, color: C.t3 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>Profile</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          <Inp label="Name" value={name} onChange={e => setName(e.target.value)} />
          {!isEducator && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Age" type="number" value={age} onChange={e => setAge(e.target.value)} />
              <div>
                <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)}
                  style={{ width: "100%", background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" }}>
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.t3 }}>Email: {user?.email}</div>
        <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Role: {user?.role} · Tier: {user?.tier}</div>
      </Card>

      {isEducator && (
        <Card>
          <SectionLabel>Educator profile</SectionLabel>
          {user?.verified && <div style={{ fontSize: 11, color: C.green, background: "var(--green-surface)", padding: "6px 10px", borderRadius: 6, marginTop: 8, display: "inline-block" }}>✓ Verified educator</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <Inp label="Credentials" value={credentials} onChange={e => setCredentials(e.target.value)} placeholder="e.g. PhD Sports Science, CSCS" />
            <Inp label="Speciality" value={speciality} onChange={e => setSpeciality(e.target.value)} placeholder="e.g. Exercise Physiology" />
          </div>
        </Card>
      )}

      {isClient && (<>
        <Card>
          <SectionLabel>Body stats</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <Inp label="Height (cm)" type="number" value={height} onChange={e => setHeight(e.target.value)} />
            <Inp label="Body fat %" type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} />
          </div>
        </Card>

        <Card>
          <SectionLabel>Goal</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {["BUILD", "CUT", "MAINTAIN", "PERFORMANCE"].map(g => (
              <Pill key={g} active={goal === g} onClick={() => setGoal(g)}>{g.toLowerCase()}</Pill>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>Daily macro targets</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
            <Inp label="Calories (kcal)" type="number" value={calories} onChange={e => setCalories(e.target.value)} />
            <Inp label="Protein (g)" type="number" value={protein} onChange={e => setProtein(e.target.value)} />
            <Inp label="Carbs (g)" type="number" value={carbs} onChange={e => setCarbs(e.target.value)} />
            <Inp label="Fat (g)" type="number" value={fat} onChange={e => setFat(e.target.value)} />
          </div>
        </Card>

        {gender === "FEMALE" && (
          <Card style={{ borderColor: "var(--purple-border)" }}>
            <SectionLabel>🌙 Menstrual cycle tracking</SectionLabel>
            <p style={{ fontSize: 12, color: C.t3, marginTop: 6, marginBottom: 10 }}>Optional — enables phase-specific training guidance on your Progress page.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Cycle length (days)" type="number" value={cycleLength} onChange={e => setCycleLength(e.target.value)} />
              <div>
                <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Last cycle start</label>
                <input type="date" value={lastCycleStart} onChange={e => setLastCycleStart(e.target.value)}
                  style={{ width: "100%", background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" }} />
              </div>
            </div>
          </Card>
        )}
      </>)}

      {isCoach && (
        <Card>
          <SectionLabel>Coach profile</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <Inp label="Speciality" value={speciality} onChange={e => setSpeciality(e.target.value)} placeholder="e.g. Bodybuilding & Nutrition" />
          </div>
        </Card>
      )}

      <ErrorMsg>{error}</ErrorMsg>
      {saved && <div style={{ color: C.green, fontSize: 13, padding: "10px 14px", background: "var(--green-surface)", borderRadius: 10, textAlign: "center" }}>Profile saved ✓</div>}
      <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Btn>

      <Card>
        <SectionLabel>Subscription</SectionLabel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{isPremium ? "Premium" : "Free plan"}</div>
            <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{isPremium ? "Unlimited recipes & meal plans" : "3 recipes per week"}</div>
          </div>
          {!isPremium && <button onClick={() => router.push("/dashboard/upgrade")} style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>Upgrade</button>}
          {isPremium && <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>Active ✓</span>}
        </div>
      </Card>

      <Btn variant="danger" onClick={logout}>Log out</Btn>
    </div>
  );
}
