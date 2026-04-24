"use client";
import { useState } from "react";
import { Card, Btn, Inp, ErrorMsg, C } from "@/components/ui";
import { ThemeToggle } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email) { setError("Enter your email"); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forgot_password", email }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSent(true);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-gradient)", position: "relative" }}>
      <div style={{ position: "absolute", top: 20, right: 20 }}><ThemeToggle size={36} /></div>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Syne'", fontSize: 32, fontWeight: 800, background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>BIO—HACKED</h1>
        </div>
        {sent ? (
          <Card style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: C.t3, fontSize: 13, lineHeight: 1.6 }}>If an account exists with <strong style={{ color: C.t1 }}>{email}</strong>, we've sent a password reset link. It expires in 1 hour.</p>
            <a href="/login" style={{ display: "inline-block", marginTop: 20, color: C.purple, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Back to login</a>
          </Card>
        ) : (
          <Card>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 16 }}>Forgot password</h2>
            <p style={{ color: C.t3, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>Enter the email you registered with and we'll send you a reset link.</p>
            <Inp label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            <ErrorMsg>{error}</ErrorMsg>
            <Btn onClick={submit} disabled={busy} style={{ marginTop: 16 }}>{busy ? "Sending..." : "Send reset link"}</Btn>
            <div style={{ textAlign: "center", marginTop: 16 }}><a href="/login" style={{ color: C.t3, fontSize: 13, textDecoration: "none" }}>← Back to login</a></div>
          </Card>
        )}
      </div>
    </div>
  );
}
