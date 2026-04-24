import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendCheckinNotification, sendFeedbackNotification } from "@/lib/email";

async function verifyCoachOfClient(coachId, clientId) {
  const rel = await prisma.coachClient.findFirst({ where: { coachId, clientId, active: true } });
  return !!rel;
}

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();

  // ── Coach feedback (text + voice/video) ──
  if (body.action === "feedback" && body.checkinId) {
    const existing = await prisma.checkin.findUnique({ where: { id: body.checkinId } });
    if (!existing) return NextResponse.json({ error: "Checkin not found" }, { status: 404 });
    if (auth.user.role === "COACH") {
      const ok = await verifyCoachOfClient(auth.user.id, existing.userId);
      if (!ok) return NextResponse.json({ error: "Not your client" }, { status: 403 });
    } else if (auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const checkin = await prisma.checkin.update({
      where: { id: body.checkinId },
      data: {
        coachFeedback: body.feedback || null,
        feedbackAudioUrl: body.audioUrl || null,
        feedbackVideoUrl: body.videoUrl || null,
        feedbackDate: new Date(),
        status: "REVIEWED",
      },
    });

    // Notify client about feedback
    const client = await prisma.user.findUnique({ where: { id: existing.userId }, select: { email: true } });
    if (client?.email) sendFeedbackNotification(client.email, auth.user.name).catch(() => {});

    return NextResponse.json({ checkin });
  }

  // ── Submit whole week to coach ──
  if (body.action === "submit_week" && body.weekStart) {
    const ws = new Date(body.weekStart);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 7);

    const updated = await prisma.checkin.updateMany({
      where: {
        userId: auth.user.id,
        submitted: false,
        date: { gte: ws, lt: we },
      },
      data: { submitted: true, status: "PENDING" },
    });

    // Notify coach about new weekly check-in
    const coachRel = await prisma.coachClient.findFirst({ where: { clientId: auth.user.id, active: true }, include: { coach: true } });
    if (coachRel?.coach?.email) sendCheckinNotification(coachRel.coach.email, auth.user.name).catch(() => {});

    return NextResponse.json({ submitted: updated.count });
  }

  // ── Save daily draft (or update existing today entry) ──
  const d = body;
  const isUpdate = d.existingId;

  const checkinData = {
    style: d.style || "DETAILED",
    submitted: false, // always a draft until submit_week
    weekStart: d.weekStart ? new Date(d.weekStart) : null,
    weekLabel: d.weekLabel || null,
    periodDay: !!d.periodDay,
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
  };

  let checkin;
  if (isUpdate) {
    // Update existing daily entry
    checkin = await prisma.checkin.update({
      where: { id: d.existingId },
      data: checkinData,
      include: { photos: true },
    });
  } else {
    // Create new daily entry
    checkin = await prisma.checkin.create({
      data: {
        userId: auth.user.id,
        ...checkinData,
        photos: d.photos?.length ? {
          create: d.photos.map(p => ({ type: p.type, url: p.url })),
        } : undefined,
      },
      include: { photos: true },
    });
  }

  // Handle photos on update (add new ones)
  if (isUpdate && d.photos?.length) {
    for (const p of d.photos) {
      await prisma.checkinPhoto.create({
        data: { checkinId: checkin.id, type: p.type, url: p.url },
      });
    }
  }

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
  const week = searchParams.get("week"); // "current" = client's own current week drafts
  const limit = parseInt(searchParams.get("limit") || "30");

  // Coach querying a client — only return SUBMITTED check-ins
  if (clientId && auth.user.role === "COACH") {
    const ok = await verifyCoachOfClient(auth.user.id, clientId);
    if (!ok) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const checkins = await prisma.checkin.findMany({
      where: { userId: clientId, submitted: true },
      include: { photos: true },
      orderBy: { date: "desc" },
      take: limit,
    });

    const measurements = await prisma.bodyMeasurement.findMany({
      where: { userId: clientId },
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json({ checkins, measurements });
  }

  // Client fetching their own current week drafts
  if (week === "current") {
    // Get all entries for the current week (submitted or not)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const checkins = await prisma.checkin.findMany({
      where: { userId: auth.user.id, date: { gte: sevenDaysAgo } },
      include: { photos: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ checkins });
  }

  // Default: client's own checkins (all, for progress page etc.)
  const targetId = clientId || auth.user.id;
  const checkins = await prisma.checkin.findMany({
    where: { userId: targetId },
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
