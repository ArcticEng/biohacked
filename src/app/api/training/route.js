// ═══════════════════════════════════════════════════
// /api/training — Training Logbook + Programs
//   GET                    → client: own logs + assigned program | coach: ?clientId=
//   POST                   → client: log a session
//   POST ?action=program   → coach: create/update a program for a client
//   DELETE ?programId=     → coach: deactivate a program
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { trainingLogSchema, trainingProgramSchema } from "@/lib/validation";

// Verify an active coach-client relation
async function verifyCoachOfClient(coachId, clientId) {
  const rel = await prisma.coachClient.findFirst({
    where: { coachId, clientId, active: true },
  });
  return !!rel;
}

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const limit = parseInt(searchParams.get("limit") || "20");

  if (clientId && auth.user.role === "COACH") {
    const ok = await verifyCoachOfClient(auth.user.id, clientId);
    if (!ok) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  } else if (clientId && auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetId = clientId || auth.user.id;

  const logs = await prisma.trainingLog.findMany({
    where: { userId: targetId },
    include: {
      exercises: { include: { sets: { orderBy: { setNumber: "asc" } } }, orderBy: { order: "asc" } },
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  const program = await prisma.trainingProgram.findFirst({
    where: { assignedTo: targetId, active: true },
    include: {
      days: {
        include: { exercises: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ logs, program });
}

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const body = await request.json();

  // ── Coach: create or update a training program for a client ──
  if (action === "program") {
    if (auth.user.role !== "COACH" && auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only coaches can create programs" }, { status: 403 });
    }
    const parsed = trainingProgramSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { id, clientId, name, days } = parsed.data;

    const ok = await verifyCoachOfClient(auth.user.id, clientId);
    if (!ok && auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Client not assigned to you" }, { status: 403 });
    }

    if (id) {
      const existing = await prisma.trainingProgram.findUnique({ where: { id } });
      if (!existing || (existing.createdById !== auth.user.id && auth.user.role !== "ADMIN")) {
        return NextResponse.json({ error: "Program not found" }, { status: 404 });
      }
      // Delete old days (cascades to exercises)
      await prisma.trainingProgramDay.deleteMany({ where: { programId: id } });
      const program = await prisma.trainingProgram.update({
        where: { id },
        data: {
          name,
          days: {
            create: days.map((d, i) => ({
              dayName: d.dayOfWeek, focus: d.focus, order: i,
              exercises: {
                create: d.exercises.map((ex, j) => ({
                  name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight, notes: ex.notes, order: j,
                })),
              },
            })),
          },
        },
        include: {
          days: { include: { exercises: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
        },
      });
      return NextResponse.json({ program });
    }

    // Deactivate any existing active programs for this client
    await prisma.trainingProgram.updateMany({
      where: { assignedTo: clientId, active: true },
      data: { active: false },
    });

    const program = await prisma.trainingProgram.create({
      data: {
        name, active: true,
        createdById: auth.user.id,
        assignedTo: clientId,
        days: {
          create: days.map((d, i) => ({
            dayName: d.dayOfWeek, focus: d.focus, order: i,
            exercises: {
              create: d.exercises.map((ex, j) => ({
                name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight, notes: ex.notes, order: j,
              })),
            },
          })),
        },
      },
      include: {
        days: { include: { exercises: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
      },
    });
    return NextResponse.json({ program });
  }

  // ── Client: log a training session ──
  const parsed = trainingLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { name, notes, duration, programDayId, exercises } = parsed.data;

  const log = await prisma.trainingLog.create({
    data: {
      userId: auth.user.id,
      name, notes, duration, programDayId,
      exercises: {
        create: exercises.map((ex, i) => ({
          name: ex.name, order: i,
          sets: {
            create: ex.sets.map((s, j) => ({
              setNumber: j + 1, reps: s.reps, weight: s.weight, rpe: s.rpe,
            })),
          },
        })),
      },
    },
    include: {
      exercises: { include: { sets: { orderBy: { setNumber: "asc" } } }, orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ log });
}

export async function DELETE(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.user.role !== "COACH" && auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only coaches can deactivate programs" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const programId = searchParams.get("programId");
  if (!programId) return NextResponse.json({ error: "programId required" }, { status: 400 });

  const existing = await prisma.trainingProgram.findUnique({ where: { id: programId } });
  if (!existing || (existing.createdById !== auth.user.id && auth.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  await prisma.trainingProgram.update({
    where: { id: programId },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
