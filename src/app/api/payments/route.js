// ═══════════════════════════════════════════════════
// /api/payments — PayFast Payment & Subscription
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createPaymentData, PLANS, validateITN, processPayment } from "@/lib/payfast";

// POST /api/payments — Initiate subscription payment
export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { plan } = await request.json(); // "PREMIUM" | "COACH"

  if (!PLANS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const paymentData = createPaymentData({
    userId: auth.user.id,
    email: auth.user.email,
    planKey: plan,
  });

  return NextResponse.json(paymentData);
}

// GET /api/payments — Get subscription status
export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json({
    tier: auth.user.tier,
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      key,
      ...plan,
    })),
  });
}
