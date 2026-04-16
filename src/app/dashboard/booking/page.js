"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, Pill, TabBar, SectionLabel, Loading, Empty, ErrorMsg, Avatar, C, api } from "@/components/ui";

export default function BookingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("browse");
  const [view, setView] = useState("list"); // list | map
  const [providers, setProviders] = useState([]);
  const [types, setTypes] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [bookedDate, setBookedDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => { load(); }, [typeFilter]);
  useEffect(() => { if (tab === "mine") loadBookings(); }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api(`/bookings${typeFilter !== "all" ? `?type=${encodeURIComponent(typeFilter)}` : ""}`);
      setProviders(d.providers || []);
      setTypes(d.types || []);
    } catch {}
    setLoading(false);
  };

  const loadBookings = async () => {
    try { const d = await api("/bookings?mine=1"); setBookings(d.bookings || []); } catch {}
  };

  const book = async () => {
    if (!selected || !bookedDate) return;
    setBusy(true);
    try {
      const d = await api("/bookings", { method: "POST", body: { providerId: selected.id, scheduledFor: bookedDate } });
      setSuccess(d.booking);
      setSelected(null);
      setBookedDate("");
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const cancelBooking = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try { await api(`/bookings?id=${id}`, { method: "DELETE" }); loadBookings(); } catch (e) { alert(e.message); }
  };

  // ── BOOKING DIALOG ──
  if (selected) return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 13, textAlign: "left" }}>← Back</button>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(168,85,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{selected.name}</div>
            <div style={{ fontSize: 12, color: C.t3 }}>{selected.type} · {selected.suburb}, {selected.city}</div>
          </div>
          {selected.verified && <span style={{ fontSize: 10, background: "rgba(34,197,94,0.1)", color: C.green, padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>✓ Verified</span>}
        </div>
        {selected.description && <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, marginBottom: 12 }}>{selected.description}</p>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: C.t3, marginBottom: 14 }}>
          <span>⭐ <strong style={{ color: "#fff" }}>{selected.rating}</strong> ({selected.reviewCount})</span>
          <span style={{ color: C.amber, fontWeight: 700 }}>R{selected.price}/session</span>
        </div>
      </Card>
      <div>
        <SectionLabel>Select date & time</SectionLabel>
        <input type="datetime-local" value={bookedDate} onChange={e => setBookedDate(e.target.value)}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: "#fff", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans'", outline: "none", marginTop: 8 }} />
      </div>
      <Btn onClick={book} disabled={busy || !bookedDate}>{busy ? "Booking..." : `Book now — R${selected.price}`}</Btn>
    </div>
  );

  // ── SUCCESS ──
  if (success) return (
    <div className="fade-up" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Booking confirmed</h2>
      <p style={{ color: C.t3, fontSize: 14, marginBottom: 4 }}>Your session with <strong>{success.provider?.name}</strong></p>
      <p style={{ color: C.green, fontSize: 13, marginBottom: 24 }}>{new Date(success.scheduledFor).toLocaleString("en-ZA")}</p>
      <Btn onClick={() => setSuccess(null)} style={{ maxWidth: 240, margin: "0 auto" }}>Done</Btn>
    </div>
  );

  if (loading) return <Loading msg="Loading providers" />;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Book a service</h2>
      <TabBar tabs={["browse", "mine"]} active={tab} onChange={setTab} />

      {tab === "browse" && (<>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Pill active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>All services</Pill>
          {types.map(t => <Pill key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>{t}</Pill>)}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.t3 }}>{providers.length} providers</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["list", "map"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, cursor: "pointer",
                background: view === v ? "rgba(168,85,247,0.12)" : "transparent",
                color: view === v ? C.purple : C.t3, fontFamily: "'DM Sans'", fontWeight: 600,
              }}>{v === "list" ? "☰ List" : "🗺 Map"}</button>
            ))}
          </div>
        </div>

        {view === "map" && (
          <div style={{ height: 280, borderRadius: 14, border: `1px solid ${C.border}`, background: "linear-gradient(135deg,#0d1117,#13131f,#1a1a2e)", position: "relative", overflow: "hidden" }}>
            {[...Array(10)].map((_, i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${i * 10}%`, borderBottom: "1px solid rgba(255,255,255,0.03)" }} />)}
            {providers.slice(0, 6).map((p, i) => {
              const x = 20 + ((i * 17) % 60), y = 20 + ((i * 23) % 60);
              return (
                <div key={p.id} onClick={() => setSelected(p)} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-100%)", cursor: "pointer" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#a855f7,#7c3aed)", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>📍</div>
                </div>
              );
            })}
            <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(10,10,15,0.9)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 10, color: C.t3 }}>Cape Town · Tap pins to book</div>
          </div>
        )}

        {providers.length === 0 ? <Empty icon="📍" title="No providers found" subtitle="Try a different service type" /> : providers.map(p => (
          <Card key={p.id} onClick={() => setSelected(p)} style={{ cursor: "pointer", display: "flex", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(168,85,247,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>📍</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.t3 }}>{p.type}</div>
                </div>
                <span style={{ color: C.amber, fontWeight: 700, fontSize: 14 }}>R{p.price}</span>
              </div>
              <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.t4, flexWrap: "wrap" }}>
                <span>⭐ <strong style={{ color: "#fff" }}>{p.rating}</strong> ({p.reviewCount})</span>
                <span>📍 {p.suburb}</span>
                {p.nextAvailable && <span style={{ color: C.green }}>🕐 Next: {new Date(p.nextAvailable).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}</span>}
              </div>
            </div>
          </Card>
        ))}
        <p style={{ textAlign: "center", color: C.t4, fontSize: 11, padding: "10px 0" }}>Bio-Hacked earns a listing fee and commission on bookings.</p>
      </>)}

      {tab === "mine" && (<>
        {bookings.length === 0 ? <Empty icon="📅" title="No bookings yet" action="Browse providers" onAction={() => setTab("browse")} /> : bookings.map(b => (
          <Card key={b.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{b.provider?.name}</div>
                <div style={{ fontSize: 12, color: C.t3 }}>{b.provider?.type}</div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: b.status === "CONFIRMED" ? "rgba(34,197,94,0.1)" : b.status === "CANCELLED" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: b.status === "CONFIRMED" ? C.green : b.status === "CANCELLED" ? C.red : C.amber, fontWeight: 600 }}>{b.status}</span>
            </div>
            <div style={{ fontSize: 13, color: C.t2 }}>{new Date(b.scheduledFor).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
            <div style={{ fontSize: 12, color: C.amber, fontWeight: 600, marginTop: 4 }}>R{b.totalAmount}</div>
            {b.status === "CONFIRMED" && new Date(b.scheduledFor) > new Date() && (
              <button onClick={() => cancelBooking(b.id)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.red, padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'", marginTop: 10 }}>Cancel booking</button>
            )}
          </Card>
        ))}
      </>)}
    </div>
  );
}
