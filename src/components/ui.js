"use client";

import { useTheme } from "@/lib/theme-context";

// Brand colours stay fixed across themes.
// Surfaces/text pull from CSS vars so they adapt to dark/light.
export const C = {
  // Brand accents (identical in both themes)
  purple: "var(--brand-purple)",
  pink: "var(--brand-pink)",
  violet: "var(--brand-violet)",
  lavender: "var(--brand-lavender)",
  green: "var(--brand-green)",
  red: "var(--brand-red)",
  amber: "var(--brand-amber)",
  teal: "var(--brand-teal)",
  blue: "var(--brand-blue)",

  // Theme-reactive
  t1: "var(--text-1)",
  t2: "var(--text-2)",
  t3: "var(--text-3)",
  t4: "var(--text-4)",
  border: "var(--border)",
  card: "var(--bg-card)",
  elevated: "var(--bg-elevated)",
  subtle: "var(--bg-subtle)",
  input: "var(--bg-input)",
};

export function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, cursor: onClick ? "pointer" : "default", transition: "all 0.15s", ...style }}>{children}</div>;
}

export function Btn({ children, variant = "primary", disabled, ...props }) {
  const base = { padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", width: "100%", fontFamily: "'DM Sans'", transition: "all 0.15s", opacity: disabled ? 0.5 : 1 };
  const s = variant === "primary" ? { ...base, background: "linear-gradient(135deg,#a855f7,#7c3aed)", border: "none", color: "#fff" }
    : variant === "danger" ? { ...base, background: "var(--red-surface)", border: "1px solid rgba(239,68,68,0.25)", color: C.red }
    : { ...base, background: "var(--bg-elevated)", border: `1px solid ${C.border}`, color: C.t1 };
  return <button disabled={disabled} {...props} style={{ ...s, ...props.style }}>{children}</button>;
}

export function Inp({ label, ...props }) {
  return (<div style={{ width: "100%" }}>
    {label && <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>}
    <input {...props} style={{ width: "100%", background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none", ...props.style }} />
  </div>);
}

export function TextArea({ label, ...props }) {
  return (<div style={{ width: "100%" }}>
    {label && <label style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>}
    <textarea {...props} style={{ width: "100%", minHeight: 80, background: C.input, border: `1px solid ${C.border}`, color: C.t1, padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none", resize: "vertical", ...props.style }} />
  </div>);
}

export function MacroRing({ value, max, label, color, unit = "g" }) {
  const r = 28, circ = 2 * Math.PI * r, pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="5" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" transform="rotate(-90 36 36)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x="36" y="33" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="600" fontFamily="'DM Sans'">{value}</text>
      <text x="36" y="46" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="'DM Sans'" opacity="0.5">{unit}</text>
    </svg>
    <span style={{ fontSize: 10, color: C.t3, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>{label}</span>
  </div>);
}

export function MacroRow({ calories, protein, carbs, fat }) {
  return (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
    <StatBox label="Calories" value={calories} unit="kcal" color={C.purple} />
    <StatBox label="Protein" value={protein} unit="g" color={C.pink} />
    <StatBox label="Carbs" value={carbs} unit="g" color={C.violet} />
    <StatBox label="Fat" value={fat} unit="g" color={C.lavender} />
  </div>);
}

export function StatBox({ label, value, unit, color = C.purple }) {
  return (<div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 8px", textAlign: "center", flex: 1 }}>
    <div style={{ fontSize: 20, fontWeight: 700, color }}>{value ?? "—"}</div>
    <div style={{ fontSize: 9, color: C.t4, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{unit ? `${unit} ` : ""}{label}</div>
  </div>);
}

export function Pill({ children, active, onClick }) {
  return <button onClick={onClick} style={{ background: active ? "var(--purple-surface)" : C.elevated, border: `1px solid ${active ? "var(--purple-border)" : C.border}`, color: active ? C.purple : C.t3, padding: "7px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans'", fontWeight: 500 }}>{children}</button>;
}

export function TabBar({ tabs, active, onChange }) {
  return (<div style={{ display: "flex", gap: 2, background: C.subtle, padding: 3, borderRadius: 10, overflowX: "auto" }}>
    {tabs.map(t => <button key={t} onClick={() => onChange(t)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, textTransform: "uppercase", whiteSpace: "nowrap", background: active === t ? "var(--purple-surface)" : "transparent", color: active === t ? C.purple : C.t3 }}>{t}</button>)}
  </div>);
}

export function SectionLabel({ children }) {
  return <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: C.t4, fontWeight: 600 }}>{children}</span>;
}

export function Avatar({ name, size = 40, color = C.purple }) {
  const i = name?.split(" ").map(n => n?.[0]).join("").slice(0, 2) || "?";
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--purple-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 600, color, flexShrink: 0 }}>{i}</div>;
}

export function RatingSlider({ label, value, onChange }) {
  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <SectionLabel>{label}</SectionLabel>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.purple }}>{value}/10</span>
    </div>
    <input type="range" min="1" max="10" value={value} onChange={e => onChange(parseInt(e.target.value))} style={{ width: "100%" }} />
  </div>);
}

export function Loading({ msg = "Loading" }) {
  return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "60px 0" }}>
    <div style={{ display: "flex", gap: 6 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: C.purple, animation: `bh-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}</div>
    <span style={{ color: C.t3, fontSize: 13, fontStyle: "italic" }}>{msg}...</span>
    <style>{`@keyframes bh-pulse { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
  </div>);
}

export function Empty({ icon = "📭", title, subtitle, action, onAction }) {
  return (<div style={{ textAlign: "center", padding: "50px 20px" }}>
    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{icon}</div>
    <p style={{ color: C.t3, fontSize: 14, fontWeight: 500 }}>{title}</p>
    {subtitle && <p style={{ color: C.t4, fontSize: 12, marginTop: 4 }}>{subtitle}</p>}
    {action && <Btn onClick={onAction} style={{ marginTop: 20, maxWidth: 220, margin: "20px auto 0" }}>{action}</Btn>}
  </div>);
}

export function ErrorMsg({ children }) {
  if (!children) return null;
  return <div style={{ color: C.red, fontSize: 13, padding: "10px 14px", background: "var(--red-surface)", borderRadius: 10 }}>{children}</div>;
}

/* Theme toggle button — drop anywhere */
export function ThemeToggle({ size = 36 }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: C.elevated, border: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: size * 0.45, transition: "all 0.15s",
        color: C.t2, padding: 0, lineHeight: 1,
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

export async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" }, credentials: "include", ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
