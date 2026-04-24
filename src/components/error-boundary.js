"use client";
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💥</div>
            <h2 style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>An unexpected error occurred. Try reloading the page.</p>
            <button onClick={() => window.location.reload()} style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", border: "none", color: "#fff", padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>Reload page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
