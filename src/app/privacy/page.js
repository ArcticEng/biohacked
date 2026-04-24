"use client";
import { C } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px", color: C.t2, fontSize: 14, lineHeight: 1.8 }}>
      <a href="/" style={{ color: C.purple, fontSize: 13, textDecoration: "none" }}>← Back</a>
      <h1 style={{ fontFamily: "'Syne'", fontSize: 28, fontWeight: 800, color: C.t1, marginTop: 16, marginBottom: 24 }}>Privacy Policy</h1>
      <p>Last updated: April 2026. This policy complies with the Protection of Personal Information Act (POPIA) of South Africa.</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginTop: 24 }}>1. Information We Collect</h2>
      <p>We collect: email, name, body measurements, weight, photos, nutrition data, training logs, and health information you voluntarily provide. We also collect usage data for improving the platform.</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginTop: 24 }}>2. How We Use Your Data</h2>
      <p>Your data is used to: provide the coaching and nutrition service, generate AI meal plans and recipes, enable coach-client communication, process payments, and improve the platform.</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginTop: 24 }}>3. Data Sharing</h2>
      <p>We share data with: your assigned coach (check-ins, photos, measurements), Anthropic (anonymised prompts for AI generation), PayFast (payment processing), Supabase (data storage), Resend (email delivery). We never sell your personal data.</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginTop: 24 }}>4. Your Rights Under POPIA</h2>
      <p>You have the right to: access your personal data, request correction of inaccurate data, request deletion of your data, object to processing, and receive your data in a portable format. Use the data export feature in Settings or contact us.</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginTop: 24 }}>5. Data Retention</h2>
      <p>We retain your data for as long as your account is active. After account deletion, data is purged within 30 days.</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginTop: 24 }}>6. Security</h2>
      <p>Passwords are hashed with bcrypt. Data is encrypted in transit (HTTPS). Photos are stored in Supabase Storage with access controls. We do not store payment card details.</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginTop: 24 }}>7. Contact</h2>
      <p>For data requests or privacy concerns: privacy@bio-hacked.co.za</p>
    </div>
  );
}
