"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Loading, C } from "@/components/ui";

export default function VerifyPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify_email", token }) })
      .then(r => { if (r.ok) setStatus("success"); else setStatus("error"); })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-gradient)" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {status === "verifying" && <Loading msg="Verifying email" />}
        {status === "success" && (
          <Card style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Email verified</h2>
            <p style={{ color: C.t3, fontSize: 13 }}>Your account is now fully activated.</p>
            <a href="/dashboard" style={{ display: "inline-block", marginTop: 20, background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Go to dashboard</a>
          </Card>
        )}
        {status === "error" && (
          <Card style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Verification failed</h2>
            <p style={{ color: C.t3, fontSize: 13 }}>This link is invalid or has already been used.</p>
            <a href="/dashboard" style={{ display: "inline-block", marginTop: 20, color: C.purple, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Go to dashboard</a>
          </Card>
        )}
      </div>
    </div>
  );
}
