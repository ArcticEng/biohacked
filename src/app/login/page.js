"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle, C } from "@/components/ui";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("CLIENT");
  const [gender, setGender] = useState("");
  const [goal, setGoal] = useState("MAINTAIN");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        const payload = { email, password, name, role };
        if (role === "CLIENT") {
          if (gender) payload.gender = gender;
          payload.goal = goal;
        }
        await register(payload);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  const demoLogin = async (demoEmail) => {
    setLoading(true); setError("");
    try {
      await login(demoEmail, "password123");
    } catch (err) {
      setError(err.message || "Demo login failed");
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (!name || !email || !password) { setError("Fill in all fields"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (role !== "CLIENT") { handleSubmit(); return; }
    setError("");
    setStep(2);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-gradient)", position: "relative" }}>
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
        <ThemeToggle size={36} />
      </div>

      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Syne'", fontSize: 40, fontWeight: 800, background: "linear-gradient(135deg, #a855f7, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1, marginBottom: 8 }}>BIO—HACKED</h1>
          <p style={{ color: C.t3, fontSize: 14 }}>Nutrition. Coaching. Performance.</p>
        </div>

        <div style={{ display: "flex", gap: 2, background: C.subtle, padding: 3, borderRadius: 10, marginBottom: 20 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setStep(1); setError(""); }} style={{
              flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
              background: mode === m ? "var(--purple-surface)" : "transparent",
              color: mode === m ? C.purple : C.t3,
            }}>{m}</button>
          ))}
        </div>

        {mode === "register" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[1, 2].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? C.purple : C.border }} />)}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(mode === "login" || step === 1) && (<>
            {mode === "register" && (
              <div>
                <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Name</label>
                <input type="text" required={mode === "register"} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
                  style={{ width: "100%", background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "14px 16px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" }} />
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                style={{ width: "100%", background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "14px 16px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" }} />
            </div>

            <div>
              <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" minLength={8}
                style={{ width: "100%", background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "14px 16px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none" }} />
            </div>

            {mode === "register" && (
              <div>
                <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>I am a...</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { v: "CLIENT", l: "Client", i: "💪" },
                    { v: "COACH", l: "Coach", i: "👑" },
                    { v: "EDUCATOR", l: "Educator", i: "🎓" },
                  ].map(r => (
                    <button key={r.v} type="button" onClick={() => setRole(r.v)} style={{
                      padding: "14px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center", border: "1px solid",
                      background: role === r.v ? "var(--purple-surface)" : C.elevated,
                      borderColor: role === r.v ? "var(--purple-border)" : C.border,
                      color: C.t1,
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{r.i}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans'" }}>{r.l}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>)}

          {mode === "register" && step === 2 && (<>
            <div>
              <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Gender</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["MALE", "Male"], ["FEMALE", "Female"], ["OTHER", "Other"]].map(([v, l]) => (
                  <button type="button" key={v} onClick={() => setGender(v)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid", cursor: "pointer", background: gender === v ? "var(--purple-surface)" : C.elevated, borderColor: gender === v ? "var(--purple-border)" : C.border, color: gender === v ? C.purple : C.t3, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600 }}>{l}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Goal</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[["CUT", "Cut"], ["BUILD", "Build"], ["MAINTAIN", "Maintain"], ["PERFORMANCE", "Performance"]].map(([v, l]) => (
                  <button type="button" key={v} onClick={() => setGoal(v)} style={{ padding: "10px", borderRadius: 10, border: "1px solid", cursor: "pointer", background: goal === v ? "var(--amber-surface)" : C.elevated, borderColor: goal === v ? "rgba(245,158,11,0.3)" : C.border, color: goal === v ? C.amber : C.t3, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600 }}>{l}</button>
                ))}
              </div>
            </div>
          </>)}

          {error && <div style={{ color: C.red, fontSize: 13, padding: "10px 14px", background: "var(--red-surface)", borderRadius: 10 }}>{error}</div>}

          {mode === "register" && step === 1 && role === "CLIENT" ? (
            <button type="button" onClick={nextStep} disabled={loading} style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", border: "none", color: "#fff", padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", fontFamily: "'DM Sans'", marginTop: 4 }}>Continue →</button>
          ) : (
            <button type="submit" disabled={loading} style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", border: "none", color: "#fff", padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer", width: "100%", fontFamily: "'DM Sans'", opacity: loading ? 0.6 : 1, marginTop: 4 }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Complete registration ✓"}
            </button>
          )}

          {mode === "login" && <div style={{ textAlign: "center", marginTop: 8 }}><a href="/forgot-password" style={{ color: C.t3, fontSize: 12, textDecoration: "none" }}>Forgot password?</a></div>}
          {mode === "register" && step === 2 && <button type="button" onClick={() => setStep(1)} style={{ color: C.t3, fontSize: 13, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans'" }}>← Back</button>}
        </form>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.t4 }}><a href="/terms" style={{ color: C.t4, textDecoration: "none" }}>Terms</a> · <a href="/privacy" style={{ color: C.t4, textDecoration: "none" }}>Privacy</a></div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 11, color: C.t4, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 10, textAlign: "center" }}>Demo accounts</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { email: "coach@biohacked.co.za", name: "Coach Alex", role: "Coach", c: C.pink, bg: "var(--pink-surface)" },
              { email: "educator@biohacked.co.za", name: "Dr. Lauren", role: "Educator", c: C.amber, bg: "var(--amber-surface)" },
              { email: "sarah@example.com", name: "Sarah Mitchell", role: "Client · Cut", c: C.purple, bg: "var(--purple-surface)" },
              { email: "james@example.com", name: "James Carter", role: "Client · Build", c: C.purple, bg: "var(--purple-surface)" },
            ].map(d => (
              <button key={d.email} onClick={() => demoLogin(d.email)} disabled={loading} style={{ background: d.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", opacity: loading ? 0.5 : 1 }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: C.t1, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans'" }}>{d.name}</div>
                  <div style={{ color: C.t4, fontSize: 10, fontFamily: "'DM Sans'" }}>{d.email}</div>
                </div>
                <span style={{ color: d.c, fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans'" }}>{d.role} →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
