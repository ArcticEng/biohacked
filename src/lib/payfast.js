// ═══════════════════════════════════════════════════
// PayFast Integration — ZAR Payment Processing
// Handles subscription payments and ITN callbacks
// ═══════════════════════════════════════════════════

import crypto from "crypto";
import prisma from "./db";

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE;
const IS_SANDBOX = process.env.PAYFAST_MODE === "sandbox";

const PAYFAST_URL = IS_SANDBOX
  ? "https://sandbox.payfast.co.za/eng/process"
  : "https://www.payfast.co.za/eng/process";

const VALIDATE_URL = IS_SANDBOX
  ? "https://sandbox.payfast.co.za/eng/query/validate"
  : "https://www.payfast.co.za/eng/query/validate";

// ─── Subscription Pricing (ZAR) ───────────────────

export const PLANS = {
  PREMIUM: {
    name: "Bio-Hacked Premium",
    amount: 149.00,  // R149/month
    description: "Unlimited recipes, AI meal plans, progress tracking",
    tier: "PREMIUM",
  },
  COACH: {
    name: "Bio-Hacked Coach",
    amount: 499.00,  // R499/month
    description: "Full coaching platform, unlimited clients, all features",
    tier: "COACH",
  },
};

// ─── Generate Payment Signature ───────────────────

function generateSignature(data) {
  const params = Object.entries(data)
    .filter(([_, v]) => v !== "" && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim())}`)
    .join("&");

  const withPassphrase = PASSPHRASE
    ? `${params}&passphrase=${encodeURIComponent(PASSPHRASE.trim())}`
    : params;

  return crypto.createHash("md5").update(withPassphrase).digest("hex");
}

// ─── Create Payment Request ───────────────────────

export function createPaymentData({ userId, email, planKey }) {
  const plan = PLANS[planKey];
  if (!plan) throw new Error(`Invalid plan: ${planKey}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const data = {
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url: `${appUrl}/dashboard?payment=success`,
    cancel_url: `${appUrl}/dashboard?payment=cancelled`,
    notify_url: `${appUrl}/api/payments/notify`,
    name_first: "Bio-Hacked",
    email_address: email,
    m_payment_id: `${userId}_${planKey}_${Date.now()}`,
    amount: plan.amount.toFixed(2),
    item_name: plan.name,
    item_description: plan.description,
    subscription_type: "1",       // recurring
    billing_date: new Date().toISOString().split("T")[0],
    recurring_amount: plan.amount.toFixed(2),
    frequency: "3",               // monthly
    cycles: "0",                  // indefinite
    custom_str1: userId,
    custom_str2: planKey,
  };

  data.signature = generateSignature(data);

  return { url: PAYFAST_URL, data };
}

// ─── Validate ITN (Instant Transaction Notification) ─

export async function validateITN(body) {
  // 1. Verify signature
  const receivedSig = body.signature;
  const dataWithoutSig = { ...body };
  delete dataWithoutSig.signature;

  const expectedSig = generateSignature(dataWithoutSig);
  if (receivedSig !== expectedSig) {
    console.error("PayFast ITN: Signature mismatch");
    return { valid: false, error: "Invalid signature" };
  }

  // 2. Verify with PayFast server
  try {
    const params = new URLSearchParams(dataWithoutSig).toString();
    const res = await fetch(VALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const result = await res.text();
    if (result !== "VALID") {
      return { valid: false, error: "PayFast validation failed" };
    }
  } catch (err) {
    console.error("PayFast validation error:", err);
    return { valid: false, error: "Validation request failed" };
  }

  // 3. Verify amount matches plan
  const planKey = body.custom_str2;
  const plan = PLANS[planKey];
  if (plan && parseFloat(body.amount_gross) !== plan.amount) {
    return { valid: false, error: "Amount mismatch" };
  }

  return { valid: true };
}

// ─── Process Payment Notification ──────────────────

export async function processPayment(body) {
  const userId = body.custom_str1;
  const planKey = body.custom_str2;
  const plan = PLANS[planKey];

  if (!plan) {
    console.error(`Unknown plan key: ${planKey}`);
    return;
  }

  // Record payment
  await prisma.payment.create({
    data: {
      userId,
      amount: parseFloat(body.amount_gross),
      currency: "ZAR",
      status: body.payment_status === "COMPLETE" ? "COMPLETED" : "PENDING",
      description: plan.name,
      payfastPaymentId: body.pf_payment_id,
    },
  });

  // Update subscription if payment complete
  if (body.payment_status === "COMPLETE") {
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        tier: plan.tier,
        active: true,
        startDate: new Date(),
        payfastToken: body.token || null,
      },
      create: {
        userId,
        tier: plan.tier,
        active: true,
        payfastToken: body.token || null,
      },
    });

    // Update user tier
    await prisma.user.update({
      where: { id: userId },
      data: { tier: plan.tier },
    });
  }
}
