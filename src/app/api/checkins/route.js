import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function verifyCoachOfClient(coachId, clientId) {
  const rel = await prisma.coachClient.findFirst({ where: { coachId, clientId, active: true } });
  return !!rel;
}

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();

  // Coach feedback (text + optional audio/video URL)
  if (body.action === "feedback" && body.checkinId) {
    const existing = await prisma.checkin.findUnique({ where: { id: body.checkinId } });
    if (!existing) return NextResponse.json({ error: "Checkin not found" }, { status: 404 });
    if (auth.user.role !== "COACH" && auth.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (auth.user.role === "COACH") {
      const ok = await verifyCoachOfClient(auth.user.id, existing.userId);
      if (!ok) return NextResponse.json({ error: "Not your client" }, { status: 403 });
    }

    const checkin = await prisma.checkin.update({
      where: { id: body.checkinId },
      data: {
        coachFeedback: body.feedback || null,
        feedbackVideoUrl: body.videoUrl || null,
        feedbackAudioUrl: body.audioUrl || null,
        feedbackDate: new Date(),
        status: "REVIEWED",
      },
    });
    return NextResponse.json({ checkin });
  }

  // Client submitting check-in (accept everything, minimal validation)
  const d = body;

  const checkin = await prisma.checkin.create({
    data: {
      userId: auth.user.id,
      style: d.style || "DETAILED",
      weight: d.weight != null ? parseFloat(d.weight) : null,
      calories: d.calories != null ? parseInt(d.calories) : null,
      protein: d.protein != null ? parseFloat(d.protein) : null,
      planCalories: d.planCalories != null ? parseInt(d.planCalories) : null,
      planProtein: d.planProtein != null ? parseFloat(d.planProtein) : null,
      hydration: d.hydration != null ? parseFloat(d.hydration) : null,
      caffeine: d.caffeine != null ? parseInt(d.caffeine) : null,
      cravings: d.cravings || null,
      appetite: d.appetite || null,
      digestionRating: d.digestionRating != null ? parseInt(d.digestionRating) : null,
      steps: d.steps != null ? parseInt(d.steps) : null,
      cardioMinutes: d.cardioMinutes != null ? parseInt(d.cardioMinutes) : null,
      trainingStatus: d.trainingStatus || null,
      trainingRating: d.trainingRating != null ? parseInt(d.trainingRating) : null,
      sleepHours: d.sleepHours != null ? parseFloat(d.sleepHours) : null,
      sleepQuality: d.sleepQuality != null ? parseInt(d.sleepQuality) : null,
      energyLevel: d.energyLevel != null ? parseInt(d.energyLevel) : null,
      stressLevel: d.stressLevel != null ? parseInt(d.stressLevel) : null,
      sorenessLevel: d.sorenessLevel != null ? parseInt(d.sorenessLevel) : null,
      supplements: d.supplements || [],
      supplementLog: d.supplementLog || null,
      periodDay: !!d.periodDay,
      lifestyleTraining: d.lifestyleTraining || null,
      lifestyleRecovery: d.lifestyleRecovery || null,
      lifestyleDiet: d.lifestyleDiet || null,
      lifestyleSteps: d.lifestyleSteps || null,
      lifestyleHydration: d.lifestyleHydration || null,
      lifestyleEvents: d.lifestyleEvents || null,
      lifestyleWin: d.lifestyleWin || null,
      lifestyleFromCoach: d.lifestyleFromCoach || null,
      digestNotes: d.digestNotes || null,
      generalNotes: d.generalNotes || null,
      photos: d.photos?.length ? {
        create: d.photos.map(p => ({ type: p.type, url: p.url })),
      } : undefined,
    },
    include: { photos: true },
  });

  // Body measurements (if provided)
  if (d.measurements && Object.values(d.measurements).some(v => v != null)) {
    await prisma.bodyMeasurement.create({
      data: {
        userId: auth.user.id,
        arms: d.measurements.arms ? parseFloat(d.measurements.arms) : null,
        shoulders: d.measurements.shoulders ? parseFloat(d.measurements.shoulders) : null,
        back: d.measurements.back ? parseFloat(d.measurements.back) : null,
        waist: d.measurements.waist ? parseFloat(d.measurements.waist) : null,
        hips: d.measurements.hips ? parseFloat(d.measurements.hips) : null,
        glutes: d.measurements.glutes ? parseFloat(d.measurements.glutes) : null,
        quads: d.measurements.quads ? parseFloat(d.measurements.quads) : null,
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
