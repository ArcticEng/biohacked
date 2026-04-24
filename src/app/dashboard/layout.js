"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { Loading, ThemeToggle, C } from "@/components/ui";

export default function DashboardLayout({ children }) {
  const { user, loading, isCoach, isEducator, sessionExpired, dismissSessionExpired } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loading /></div>;
  if (sessionExpired) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-gradient)" }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Session expired</h2>
        <p style={{ color: C.t3, fontSize: 14, marginBottom: 24 }}>Your session has timed out. Please log in again.</p>
        <button onClick={dismissSessionExpired} style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", border: "none", color: "#fff", padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>Log in again</button>
      </div>
    </div>
  );
  if (!user) { router.push("/login"); return null; }

  const navItems = isEducator ? [
    { path: "/dashboard/educator", label: "Videos", icon: "🎥" },
    { path: "/dashboard/education", label: "Library", icon: "📚" },
    { path: "/dashboard/community", label: "Forum", icon: "💬" },
  ] : isCoach ? [
    { path: "/dashboard", label: "Clients", icon: "👥" },
    { path: "/dashboard/nutrition", label: "Recipes", icon: "🔍" },
    { path: "/dashboard/education", label: "Learn", icon: "📚" },
    { path: "/dashboard/booking", label: "Book", icon: "📍" },
    { path: "/dashboard/community", label: "Forum", icon: "💬" },
  ] : [
    { path: "/dashboard", label: "Home", icon: "🏠" },
    { path: "/dashboard/nutrition", label: "Recipes", icon: "🔍" },
    { path: "/dashboard/education", label: "Learn", icon: "📚" },
    { path: "/dashboard/booking", label: "Book", icon: "📍" },
    { path: "/dashboard/community", label: "Forum", icon: "💬" },
  ];

  const isHome = pathname === "/dashboard";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "fixed", width: 300, height: 300, borderRadius: "50%", background: "rgba(168,85,247,0.06)", top: -100, right: -80, filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ padding: "16px 0 12px", display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 10 }}>
        {!isHome && <button onClick={() => router.back()} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", padding: "4px 6px", fontSize: 18 }}>←</button>}
        <h1 onClick={() => router.push("/dashboard")} style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -0.5, cursor: "pointer" }}>BIO—HACKED</h1>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggle size={32} />
          <button onClick={() => router.push("/dashboard/settings")} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16, padding: 4 }}>⚙</button>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: 90, position: "relative", zIndex: 1 }}>
        {children}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg-overlay-strong)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`, zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", justifyContent: "space-around", padding: "8px 16px 12px" }}>
          {navItems.map(item => {
            const active = item.path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.path);
            return (
              <button key={item.path} onClick={() => router.push(item.path)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "6px 10px", borderRadius: 10, cursor: "pointer", border: "none",
                background: active ? "var(--purple-surface)" : "transparent",
                color: active ? C.purple : C.t4,
                fontFamily: "'DM Sans'", fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
