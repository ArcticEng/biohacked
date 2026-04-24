// ═══════════════════════════════════════════════════
// /api/auth — Registration, Login, Logout, Profile
// + Email verification, password reset, rate limiting
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/db";
import {
  hashPassword, verifyPassword, signToken,
  requireAuth, COOKIE_NAME, COOKIE_OPTIONS
} from "@/lib/auth";
import { registerSchema, loginSchema, updateProfileSchema } from "@/lib/validation";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const USER_SELECT = {
  id: true, email: true, name: true, role: true, avatar: true,
  emailVerified: true, onboarded: true, dietaryRestrictions: true,
  tier: true, goal: true, gender: true, age: true,
  height: true, bodyFat: true,
  calories: true, protein: true, carbs: true, fat: true,
  credentials: true, speciality: true, verified: true,
  allowMealSwap: true, photoDay: true,
  cycleLength: true, lastCycleStart: true,
  weeklyRecipeCount: true,
};

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action;

    // ── REGISTER ──
    if (action === "register") {
      const rl = checkRateLimit(request, { limit: 5, windowMs: 300000, prefix: "register" });
      if (rl) return NextResponse.json({ error: rl.error }, { status: rl.status });

      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

      const { email, password, name, role, gender, goal } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

      const passwordHash = await hashPassword(password);
      const verifyToken = randomUUID();

      const user = await prisma.user.create({
        data: {
          email, passwordHash, name, role, tier: "FREE",
          verifyToken,
          ...(gender ? { gender } : {}),
          ...(goal ? { goal } : {}),
        },
        select: USER_SELECT,
      });

      // Send verification email (non-blocking)
      sendVerificationEmail(email, verifyToken).catch(() => {});

      const token = signToken({ userId: user.id, role: user.role });
      const response = NextResponse.json({ user, token });
      response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
      return response;
    }

    // ── LOGIN ──
    if (action === "login") {
      const rl = checkRateLimit(request, { limit: 10, windowMs: 300000, prefix: "login" });
      if (rl) return NextResponse.json({ error: rl.error }, { status: rl.status });

      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

      const { passwordHash, resetToken, resetExpiry, verifyToken: vt, ...userSafe } = user;
      const token = signToken({ userId: user.id, role: user.role });
      const response = NextResponse.json({ user: userSafe, token });
      response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
      return response;
    }

    // ── LOGOUT ──
    if (action === "logout") {
      const response = NextResponse.json({ success: true });
      response.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTIONS, maxAge: 0 });
      return response;
    }

    // ── VERIFY EMAIL ──
    if (action === "verify_email" && body.token) {
      const user = await prisma.user.findFirst({ where: { verifyToken: body.token } });
      if (!user) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, verifyToken: null },
      });
      return NextResponse.json({ success: true });
    }

    // ── RESEND VERIFICATION ──
    if (action === "resend_verification") {
      const rl = checkRateLimit(request, { limit: 3, windowMs: 600000, prefix: "resend" });
      if (rl) return NextResponse.json({ error: rl.error }, { status: rl.status });

      const auth = await requireAuth(request);
      if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
      if (auth.user.emailVerified) return NextResponse.json({ error: "Already verified" }, { status: 400 });

      const newToken = randomUUID();
      await prisma.user.update({ where: { id: auth.user.id }, data: { verifyToken: newToken } });
      await sendVerificationEmail(auth.user.email, newToken);
      return NextResponse.json({ success: true });
    }

    // ── FORGOT PASSWORD ──
    if (action === "forgot_password" && body.email) {
      const rl = checkRateLimit(request, { limit: 3, windowMs: 600000, prefix: "forgot" });
      if (rl) return NextResponse.json({ error: rl.error }, { status: rl.status });

      const user = await prisma.user.findUnique({ where: { email: body.email } });
      // Always return success to prevent email enumeration
      if (!user) return NextResponse.json({ success: true });

      const resetToken = randomUUID();
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
      await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetExpiry } });
      await sendPasswordResetEmail(user.email, resetToken);
      return NextResponse.json({ success: true });
    }

    // ── RESET PASSWORD ──
    if (action === "reset_password" && body.token && body.password) {
      const user = await prisma.user.findFirst({
        where: { resetToken: body.token, resetExpiry: { gt: new Date() } },
      });
      if (!user) return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
      if (body.password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

      const passwordHash = await hashPassword(body.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, resetToken: null, resetExpiry: null },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const result = await requireAuth(request);
    if (result.error) {
      // Return specific code for expired token so frontend can handle it
      return NextResponse.json({ error: result.error, code: "AUTH_EXPIRED" }, { status: result.status });
    }
    const user = await prisma.user.findUnique({ where: { id: result.user.id }, select: USER_SELECT });
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const result = await requireAuth(request);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const data = { ...parsed.data };
    if (data.lastCycleStart) data.lastCycleStart = new Date(data.lastCycleStart);
    if (data.onboarded !== undefined) data.onboarded = data.onboarded;

    const user = await prisma.user.update({
      where: { id: result.user.id },
      data,
      select: USER_SELECT,
    });

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
