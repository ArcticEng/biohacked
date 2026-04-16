"use client";

import { useState, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/lib/auth-context";
import { Card, SectionLabel, StatBox, Loading, Empty, C, api } from "@/components/ui";

function getCyclePhase(day, len = 28) {
  if (day <= 5) return { phase: "Menstrual", range: "1-5", tip: "Lower intensity — focus on mobility and recovery. Iron-rich foods." };
  if (day <= 13) return { phase: "Follicular", range: "6-13", tip: "Oestrogen rising — your strongest phase. Prioritise compound lifts and aim for PRs." };
  if (day <= 16) return { phase: "Ovulation", range: "14-16", tip: "Peak strength window. Push intensity but watch joint stability." };
  return { phase: "Luteal", range: "17-28", tip: "Higher body temp, possible cravings. Focus on technique and steady volume." };
}

function calculateDay(lastStart, len = 28) {
  if (!lastStart) return null;
  const days = Math.floor((new Date() - new Date(lastStart)) / 86400000) % len + 1;
  return days;
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/checkins?limit=60").then(d => { setCheckins(d.checkins || []); setMeasurements(d.measurements || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading msg="Loading progress" />;

  const weightData = [...checkins].reverse().filter(c => c.weight).map(c => ({
    day: new Date(c.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
    weight: c.weight,
  }));

  const perfData = [...checkins].reverse().slice(-14).filter(c => c.energyLevel || c.sleepQuality).map(c => ({
    day: new Date(c.date).toLocaleDateString("en-ZA", { day: "numeric" }),
    energy: c.energyLevel || 0,
    sleep: c.sleepQuality || 0,
    stress: c.stressLevel || 0,
  }));

  const latest = measurements[0];
  const prev = measurements[1];
  const delta = (k) => {
    if (!latest || !prev || !latest[k] || !prev[k]) return null;
    const d = (latest[k] - prev[k]).toFixed(1);
    return d > 0 ? `+${d}` : d;
  };

  const avgCal = checkins.filter(c => c.calories).reduce((s, c, _, a) => s + c.calories / a.length, 0);
  const avgP = checkins.filter(c => c.protein).reduce((s, c, _, a) => s + c.protein / a.length, 0);

  const cycleDay = user?.gender === "FEMALE" && user?.lastCycleStart ? calculateDay(user.lastCycleStart, user.cycleLength) : null;
  const cycleInfo = cycleDay ? getCyclePhase(cycleDay, user.cycleLength) : null;

  if (checkins.length === 0) return (
    <div>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Progress tracker</h2>
      <Empty icon="📊" title="No check-in data yet" subtitle="Submit your first check-in to start tracking" />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700 }}>Progress tracker</h2>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <StatBox label="Start" value={weightData[0]?.weight} unit="kg" color={C.t3} />
        <StatBox label="Current" value={weightData[weightData.length - 1]?.weight} unit="kg" color={C.purple} />
        <StatBox label="Avg Cal" value={avgCal ? Math.round(avgCal) : "—"} color={C.amber} />
        <StatBox label="Avg P" value={avgP ? Math.round(avgP) : "—"} unit="g" color={C.pink} />
      </div>

      {/* Weight trend */}
      {weightData.length > 1 && (
        <Card>
          <SectionLabel>Weight trend</SectionLabel>
          <div style={{ marginTop: 12 }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weightData}>
                <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.purple} stopOpacity={0.3} /><stop offset="100%" stopColor={C.purple} stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="day" tick={{ fill: C.t4, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin-1", "dataMax+1"]} tick={{ fill: C.t4, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                <Area type="monotone" dataKey="weight" stroke={C.purple} fill="url(#wg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Energy, sleep, stress */}
      {perfData.length > 1 && (
        <Card>
          <SectionLabel>Energy, sleep & stress (last 14 days)</SectionLabel>
          <div style={{ marginTop: 12 }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={perfData}>
                <XAxis dataKey="day" tick={{ fill: C.t4, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: C.t4, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                <Bar dataKey="energy" fill={C.purple} radius={[3, 3, 0, 0]} barSize={6} />
                <Bar dataKey="sleep" fill={C.amber} radius={[3, 3, 0, 0]} barSize={6} />
                <Bar dataKey="stress" fill={C.red} radius={[3, 3, 0, 0]} barSize={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, fontSize: 11, color: C.t3 }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.purple, marginRight: 4 }} />Energy</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.amber, marginRight: 4 }} />Sleep</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.red, marginRight: 4 }} />Stress</span>
          </div>
        </Card>
      )}

      {/* Body measurements */}
      {latest && (
        <Card>
          <SectionLabel>Body measurements</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            {["arms", "shoulders", "back", "waist", "hips", "glutes", "quads"].map(k => (
              <div key={k} style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.teal }}>{latest[k] || "—"}<span style={{ fontSize: 10, color: C.t3 }}> cm</span></div>
                <div style={{ fontSize: 10, color: C.t3, textTransform: "capitalize", marginTop: 2 }}>{k}</div>
                {delta(k) && <div style={{ fontSize: 10, color: parseFloat(delta(k)) < 0 ? (k === "waist" ? C.green : C.pink) : (k === "waist" ? C.pink : C.green), marginTop: 2, fontWeight: 600 }}>{delta(k)}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Menstrual cycle tracker */}
      {cycleInfo && (
        <Card style={{ borderColor: "rgba(168,85,247,0.3)" }}>
          <SectionLabel>🌙 Menstrual cycle tracker</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, marginBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.purple }}>{cycleDay}</div>
              <div style={{ color: C.t4, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Day</div>
            </div>
            <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(cycleDay / user.cycleLength) * 100}%`, background: `linear-gradient(to right,${C.purple},${C.amber})`, borderRadius: 4 }} />
            </div>
            <span style={{ color: C.t4, fontSize: 11 }}>{user.cycleLength}d</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
            {[{ p: "Menstrual", r: "1-5" }, { p: "Follicular", r: "6-13" }, { p: "Ovulation", r: "14-16" }, { p: "Luteal", r: "17-28" }].map(x => {
              const active = cycleInfo.phase === x.p;
              return (
                <div key={x.p} style={{ padding: 8, borderRadius: 8, border: `1px solid ${active ? "rgba(168,85,247,0.4)" : C.border}`, background: active ? "rgba(168,85,247,0.1)" : "transparent", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: active ? C.purple : C.t3 }}>{x.p}</div>
                  <div style={{ fontSize: 9, color: C.t4, marginTop: 2 }}>Day {x.r}</div>
                </div>
              );
            })}
          </div>
          <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.6, padding: "10px 12px", background: "rgba(168,85,247,0.04)", borderRadius: 8 }}>
            💡 <strong style={{ color: "#fff" }}>{cycleInfo.phase} phase:</strong> {cycleInfo.tip}
          </p>
        </Card>
      )}

      {/* Recent check-ins */}
      <SectionLabel>Recent check-ins</SectionLabel>
      {checkins.slice(0, 5).map(c => (
        <Card key={c.id} style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.t3 }}>{new Date(c.date).toLocaleDateString("en-ZA")}</span>
            <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
              {c.weight && <span style={{ color: C.purple, fontWeight: 600 }}>{c.weight} kg</span>}
              {c.trainingRating && <span style={{ color: C.amber }}>🏋️ {c.trainingRating}</span>}
              {c.energyLevel && <span style={{ color: C.teal }}>⚡ {c.energyLevel}</span>}
              {c.sleepQuality && <span style={{ color: C.blue }}>😴 {c.sleepQuality}</span>}
            </div>
          </div>
          {c.generalNotes && <div style={{ fontSize: 12, color: C.t3, marginTop: 8, lineHeight: 1.5 }}>{c.generalNotes}</div>}
          {c.coachFeedback && <div style={{ fontSize: 12, color: C.green, marginTop: 8, padding: "8px 10px", background: "rgba(34,197,94,0.06)", borderRadius: 6 }}>Coach: {c.coachFeedback}</div>}
        </Card>
      ))}
    </div>
  );
}
