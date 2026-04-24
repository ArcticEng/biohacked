"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Btn, Inp, ErrorMsg, C } from "@/components/ui";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset_password", token, password }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setDone(true);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (!token) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-gradient)" }}>
      <Card style={{ textAlign: "center", maxWidth: 400, padding: "40px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1 }}>Invalid link</h2>
        <p style={{ color: C.t3, fontSize: 13, marginTop: 8 }}>This reset link is missing or invalid.</p>
        <a href="/forgot-password" style={{ display: "inline-block", marginTop: 20, color: C.purple, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Request a new link</a>
      </Card>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-gradient)" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {done ? (
          <Card style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Password reset</h2>
            <p style={{ color: C.t3, fontSize: 13 }}>Your password has been updated.</p>
            <a href="/login" style={{ display: "inline-block", marginTop: 20, background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Go to login</a>
          </Card>
        ) : (
          <Card>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 16 }}>Set new password</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Inp label="New password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" />
              <Inp label="Confirm password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type it again" />
            </div>
            <ErrorMsg>{error}</ErrorMsg>
            <Btn onClick={submit} disabled={busy} style={{ marginTop: 16 }}>{busy ? "Resetting..." : "Reset password"}</Btn>
          </Card>
        )}
      </div>
    </div>
  );
}
