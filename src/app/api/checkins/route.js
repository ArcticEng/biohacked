// ═══════════════════════════════════════════════════
// /api/checkins — Enriched Daily Check-in System
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { checkinSchema } from "@/lib/validation";

async function verifyCoachOfClient(coachId, clientId) {
  const rel = await prisma.coachClient.findFirst({
    where: { coachId, clientId, active: true },
  });
  return !!rel;
}

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();

  // Coach submitting feedback — verify they coach the client
  if (body.action === "feedback" && body.checkinId) {
    const existing = await prisma.checkin.findUnique({ where: { id: body.checkinId } });
    if (!existing) return NextResponse.json({ error: "Checkin not found" }, { status: 404 });
    if (auth.user.role !== "COACH" && auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (auth.user.role === "COACH") {
      const ok = await verifyCoachOfClient(auth.user.id, existing.userId);
      if (!ok) return NextResponse.json({ error: "Not your client" }, { status: 403 });
    }

    const checkin = await prisma.checkin.update({
      where: { id: body.checkinId },
      data: {
        coachFeedback: body.feedback,
        feedbackVideoUrl: body.videoUrl || null,
        feedbackDate: new Date(),
        status: "REVIEWED",
      },
    });
    return NextResponse.json({ checkin });
  }

  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const d = parsed.data;

  const checkin = await prisma.checkin.create({
    data: {
      userId: auth.user.id,
      style: d.style || "DETAILED",
      weight: d.weight,
      calories: d.calories,
      protein: d.protein,
      hydration: d.hydration,
      caffeine: d.caffeine,
      cravings: d.cravings,
      appetite: d.appetite,
      digestionRating: d.digestionRating,
      steps: d.steps,
      cardioMinutes: d.cardioMinutes,
      trainingStatus: d.trainingStatus,
      trainingRating: d.trainingRating,
      sleepHours: d.sleepHours,
      sleepQuality: d.sleepQuality,
      energyLevel: d.energyLevel,
      stressLevel: d.stressLevel,
      sorenessLevel: d.sorenessLevel,
      supplements: d.supplements || [],
      lifestyleTraining: d.lifestyleTraining,
      lifestyleRecovery: d.lifestyleRecovery,
      lifestyleDiet: d.lifestyleDiet,
      lifestyleSteps: d.lifestyleSteps,
      lifestyleHydration: d.lifestyleHydration,
      lifestyleEvents: d.lifestyleEvents,
      lifestyleWin: d.lifestyleWin,
      lifestyleFromCoach: d.lifestyleFromCoach,
      digestNotes: d.digestNotes,
      generalNotes: d.generalNotes,
      photos: d.photos?.length ? {
        create: d.photos.map(p => ({ type: p.type, url: p.url })),
      } : undefined,
    },
    include: { photos: true },
  });

  if (d.measurements && Object.values(d.measurements).some(v => v != null)) {
    await prisma.bodyMeasurement.create({
      data: {
        userId: auth.user.id,
        arms: d.measurements.arms,
        shoulders: d.measurements.shoulders,
        back: d.measurements.back,
        waist: d.measurements.waist,
        hips: d.measurements.hips,
        glutes: d.measurements.glutes,
        quads: d.measurements.quads,
      },
    });
  }

  return NextResponse.json({ checkin });
}

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "30");

  if (clientId && auth.user.role === "COACH") {
    const ok = await verifyCoachOfClient(auth.user.id, clientId);
    if (!ok) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  } else if (clientId && auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetId = clientId || auth.user.id;
  const where = { userId: targetId };
  if (status) where.status = status;

  const checkins = await prisma.checkin.findMany({
    where,
    include: { photos: true },
    orderBy: { date: "desc" },
    take: limit,
  });

  const measurements = await prisma.bodyMeasurement.findMany({
    where: { userId: targetId },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json({ checkins, measurements });
}
