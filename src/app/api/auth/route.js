// ═══════════════════════════════════════════════════
// /api/auth — Registration, Login, Logout, Profile
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  hashPassword, verifyPassword, signToken,
  requireAuth, COOKIE_NAME, COOKIE_OPTIONS
} from "@/lib/auth";
import { registerSchema, loginSchema, updateProfileSchema } from "@/lib/validation";

// Full user selection including all new fields
const USER_SELECT = {
  id: true, email: true, name: true, role: true, avatar: true,
  tier: true, goal: true, gender: true, age: true,
  height: true, bodyFat: true,
  calories: true, protein: true, carbs: true, fat: true,
  credentials: true, speciality: true, verified: true,
  allowMealSwap: true, cycleLength: true, lastCycleStart: true,
  weeklyRecipeCount: true,
};

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action;

    // ── REGISTER ──
    if (action === "register") {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
      }

      const { email, password, name, role, gender, goal } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email, passwordHash, name, role, tier: "FREE",
          ...(gender ? { gender } : {}),
          ...(goal ? { goal } : {}),
        },
        select: USER_SELECT,
      });

      const token = signToken({ userId: user.id, role: user.role });
      const response = NextResponse.json({ user, token });
      response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
      return response;
    }

    // ── LOGIN ──
    if (action === "login") {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const { passwordHash, ...userSafe } = user;
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Server error: " + err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const result = await requireAuth(request);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const user = await prisma.user.findUnique({ where: { id: result.user.id }, select: USER_SELECT });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("Auth GET error:", err);
    return NextResponse.json({ error: "Server error: " + err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const result = await requireAuth(request);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const data = { ...parsed.data };
    if (data.lastCycleStart) data.lastCycleStart = new Date(data.lastCycleStart);

    const user = await prisma.user.update({
      where: { id: result.user.id },
      data,
      select: USER_SELECT,
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Auth PATCH error:", err);
    return NextResponse.json({ error: "Server error: " + err.message }, { status: 500 });
  }
}
