"use client";

import { Component } from "react";
import { C } from "@/components/ui";

// ── ERROR BOUNDARY (item #24) ──
export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-primary)" }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>💥</div>
          <h2 style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "var(--text-3)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>The page crashed unexpectedly. This has been logged. Try reloading.</p>
          <button onClick={() => window.location.reload()} style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", border: "none", color: "#fff", padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>Reload page</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ── SESSION EXPIRED MODAL (item #3) ──
export function SessionExpiredModal({ onDismiss }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 360, width: "90%", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", marginBottom: 8, fontFamily: "'Syne'" }}>Session expired</h2>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>Your session has timed out for security. Please sign in again.</p>
        <button onClick={onDismiss} style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", border: "none", color: "#fff", padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", fontFamily: "'DM Sans'" }}>Sign in</button>
      </div>
    </div>
  );
}

// ── CONFIRM DIALOG (item #19) ──
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxWidth: 340, width: "90%", textAlign: "center" }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)", marginBottom: 8, fontFamily: "'Syne'" }}>{title}</h3>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-1)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: danger ? "var(--red-surface)" : "linear-gradient(135deg,#a855f7,#7c3aed)", color: danger ? "#ef4444" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
