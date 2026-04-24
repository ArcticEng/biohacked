// ═══════════════════════════════════════════════════
// Email Service — Resend integration
// Used for: email verification, password reset, notifications
// ═══════════════════════════════════════════════════

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Bio-Hacked <noreply@bio-hacked.co.za>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not set — email skipped:", { to, subject });
    return { success: false, reason: "no_api_key" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Resend error");
    return { success: true, id: data.id };
  } catch (err) {
    console.error("[EMAIL] Send failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ── Template helpers ──

const wrap = (content) => `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0f;color:#fff;border-radius:16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:24px;font-weight:800;background:linear-gradient(135deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">BIO—HACKED</span>
  </div>
  ${content}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:11px;color:rgba(255,255,255,0.3);">
    Bio-Hacked · AI-powered nutrition & coaching
  </div>
</div>`;

const btn = (url, label) =>
  `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;padding:14px 28px;border-radius:12px;font-weight:600;text-decoration:none;font-size:14px;">${label}</a>`;

// ── Public API ──

export async function sendVerificationEmail(email, token) {
  const url = `${APP_URL}/verify?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Verify your Bio-Hacked account",
    html: wrap(`
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Welcome to Bio-Hacked</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin-bottom:24px;">Click the button below to verify your email address and activate your account.</p>
      <div style="text-align:center;margin:24px 0;">${btn(url, "Verify Email")}</div>
      <p style="color:rgba(255,255,255,0.35);font-size:12px;">If you didn't create this account, ignore this email.</p>
    `),
  });
}

export async function sendPasswordResetEmail(email, token) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Reset your Bio-Hacked password",
    html: wrap(`
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Password Reset</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin-bottom:24px;">Click below to reset your password. This link expires in 1 hour.</p>
      <div style="text-align:center;margin:24px 0;">${btn(url, "Reset Password")}</div>
      <p style="color:rgba(255,255,255,0.35);font-size:12px;">If you didn't request this, ignore this email.</p>
    `),
  });
}

export async function sendCheckinNotification(coachEmail, clientName) {
  return sendEmail({
    to: coachEmail,
    subject: `${clientName} submitted a weekly check-in`,
    html: wrap(`
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">New Check-in</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin-bottom:24px;"><strong>${clientName}</strong> has submitted their weekly check-in and is waiting for your feedback.</p>
      <div style="text-align:center;margin:24px 0;">${btn(`${APP_URL}/dashboard`, "Review Now")}</div>
    `),
  });
}

export async function sendFeedbackNotification(clientEmail, coachName) {
  return sendEmail({
    to: clientEmail,
    subject: `${coachName} left feedback on your check-in`,
    html: wrap(`
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Coach Feedback</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin-bottom:24px;"><strong>${coachName}</strong> has reviewed your weekly check-in and left feedback.</p>
      <div style="text-align:center;margin:24px 0;">${btn(`${APP_URL}/dashboard`, "View Feedback")}</div>
    `),
  });
}

export async function sendMealPlanNotification(clientEmail, coachName) {
  return sendEmail({
    to: clientEmail,
    subject: `${coachName} updated your meal plan`,
    html: wrap(`
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Meal Plan Updated</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin-bottom:24px;"><strong>${coachName}</strong> has created or updated your meal plan.</p>
      <div style="text-align:center;margin:24px 0;">${btn(`${APP_URL}/dashboard/meal-plan`, "View Plan")}</div>
    `),
  });
}
