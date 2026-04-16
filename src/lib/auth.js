// ═══════════════════════════════════════════════════
// Authentication Library
// JWT-based auth with role-based access control
// ═══════════════════════════════════════════════════

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
export const COOKIE_NAME = "bh_token";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

// ─── Password Hashing ─────────────────────────────

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ─── JWT Token Management ──────────────────────────

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── Auth Guard for API Routes ─────────────────────

export async function requireAuth(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value
    || request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return { error: "Unauthorized", status: 401 };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: "Invalid token", status: 401 };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return { error: "User not found", status: 404 };
    }

    return { user };
  } catch (err) {
    console.error("Auth DB error:", err);
    return { error: "Database error", status: 500 };
  }
}

// ─── Role-Based Access ─────────────────────────────

export async function requireRole(request, roles) {
  const result = await requireAuth(request);
  if (result.error) return result;

  if (!roles.includes(result.user.role)) {
    return { error: "Insufficient permissions", status: 403 };
  }

  return result;
}

// ─── Freemium Check ────────────────────────────────

export async function checkRecipeLimit(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, remaining: 0 };

  if (user.tier !== "FREE") {
    return { allowed: true, remaining: Infinity };
  }

  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  if (now - user.weeklyResetAt > weekMs) {
    await prisma.user.update({
      where: { id: userId },
      data: { weeklyRecipeCount: 0, weeklyResetAt: now },
    });
    return { allowed: true, remaining: 3 };
  }

  const remaining = Math.max(0, 3 - user.weeklyRecipeCount);
  return { allowed: remaining > 0, remaining };
}

export async function incrementRecipeCount(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { weeklyRecipeCount: { increment: 1 } },
  });
}
