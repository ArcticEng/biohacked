"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, Btn, SectionLabel, C, api } from "@/components/ui";

export default function UpgradePage() {
  const { user, isPremium, isCoach, fetchUser } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(isCoach ? "COACH" : "PREMIUM");
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    api("/payments").then(d => setPlans(d.plans || [])).catch(() => {});
  }, []);

  const initPayment = async () => {
    setLoading(true);
    try {
      const data = await api("/payments", { method: "POST", body: { plan: selected } });
      // Build and submit PayFast form
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.url;
      Object.entries(data.data).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      alert(e.message);
      setLoading(false);
    }
  };

  if (isPremium) return (
    <div className="fade-up" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You're on {user.tier}</h2>
      <p style={{ color: C.t3, fontSize: 14, marginBottom: 24 }}>You have full access to all features.</p>
      <Btn variant="secondary" onClick={() => router.push("/dashboard")} style={{ maxWidth: 240, margin: "0 auto" }}>Back to dashboard</Btn>
    </div>
  );

  const planDetails = {
    PREMIUM: {
      name: "Premium",
      price: "R149",
      period: "/month",
      features: ["Unlimited AI recipes", "AI meal plan generator", "Full progress tracking", "Research paper AI summaries", "Priority support"],
      color: C.purple,
    },
    COACH: {
      name: "Coach",
      price: "R499",
      period: "/month",
      features: ["Everything in Premium", "Unlimited clients", "Coach dashboard & inbox", "Client check-in management", "Training program builder", "Video feedback tools"],
      color: C.pink,
    },
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>👑</div>
        <h2 style={{ fontFamily: "'Syne'", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Upgrade to Premium</h2>
        <p style={{ color: C.t3, fontSize: 14 }}>Unlock the full Bio-Hacked experience</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(planDetails).map(([key, plan]) => (
          <Card key={key} onClick={() => setSelected(key)} style={{
            cursor: "pointer",
            borderColor: selected === key ? `${plan.color}40` : C.border,
            background: selected === key ? `${plan.color}08` : C.card,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: plan.color }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginTop: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 700 }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: C.t3 }}>{plan.period}</span>
                </div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                border: `2px solid ${selected === key ? plan.color : C.border}`,
                background: selected === key ? plan.color : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}>
                {selected === key && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {plan.features.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.t2 }}>
                  <span style={{ color: plan.color, fontSize: 14 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ background: "rgba(255,255,255,0.02)", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.5 }}>Secure payment via PayFast. Cancel anytime. Billed in ZAR.</div>
        </div>
      </Card>

      <Btn onClick={initPayment} disabled={loading}>
        {loading ? "Redirecting to PayFast..." : `Subscribe — ${planDetails[selected].price}${planDetails[selected].period}`}
      </Btn>

      <button onClick={() => router.back()} style={{ background: "none", border: "none", color: C.t3, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans'", textAlign: "center" }}>Maybe later</button>
    </div>
  );
}
