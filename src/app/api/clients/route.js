// ═══════════════════════════════════════════════════
// /api/clients — Coach-Client Relationship Management
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(request) {
  const auth = await requireRole(request, ["COACH", "ADMIN"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // Single client detail
  if (id) {
    const relationship = await prisma.coachClient.findFirst({
      where: { coachId: auth.user.id, clientId: id, active: true },
      include: {
        client: {
          select: {
            id: true, name: true, email: true, avatar: true,
            gender: true, age: true, goal: true, height: true, bodyFat: true,
            calories: true, protein: true, carbs: true, fat: true,
            allowMealSwap: true, cycleLength: true, lastCycleStart: true,
          },
        },
      },
    });
    if (!relationship) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    return NextResponse.json({ client: relationship.client });
  }

  const relationships = await prisma.coachClient.findMany({
    where: { coachId: auth.user.id, active: true },
    include: {
      client: {
        select: {
          id: true, name: true, email: true, avatar: true,
          gender: true, age: true, goal: true,
          calories: true, protein: true, carbs: true, fat: true,
          allowMealSwap: true,
          checkins: {
            where: { status: "PENDING" },
            orderBy: { date: "desc" },
            take: 1,
            select: { id: true, date: true, weight: true, status: true },
          },
        },
      },
    },
  });

  const clients = relationships.map((r) => ({
    ...r.client,
    hasPendingCheckin: r.client.checkins.length > 0,
    latestCheckin: r.client.checkins[0] || null,
  }));

  return NextResponse.json({ clients });
}

export async function POST(request) {
  const auth = await requireRole(request, ["COACH", "ADMIN"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();

  // Update permissions
  if (body.action === "update_permissions" && body.clientId) {
    // Verify relationship
    const rel = await prisma.coachClient.findFirst({
      where: { coachId: auth.user.id, clientId: body.clientId, active: true },
    });
    if (!rel) return NextResponse.json({ error: "Not your client" }, { status: 403 });

    const client = await prisma.user.update({
      where: { id: body.clientId },
      data: {
        allowMealSwap: body.allowMealSwap !== undefined ? body.allowMealSwap : undefined,
      },
    });
    return NextResponse.json({ success: true, client });
  }

  // Add client by email
  const { email } = body;
  const client = await prisma.user.findUnique({ where: { email } });
  if (!client) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (client.role !== "CLIENT") return NextResponse.json({ error: "User is not a client" }, { status: 400 });

  const existing = await prisma.coachClient.findUnique({
    where: { coachId_clientId: { coachId: auth.user.id, clientId: client.id } },
  });

  if (existing) {
    if (existing.active) return NextResponse.json({ error: "Already your client" }, { status: 409 });
    await prisma.coachClient.update({ where: { id: existing.id }, data: { active: true } });
    return NextResponse.json({ success: true });
  }

  await prisma.coachClient.create({
    data: { coachId: auth.user.id, clientId: client.id },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const auth = await requireRole(request, ["COACH", "ADMIN"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("id");

  await prisma.coachClient.updateMany({
    where: { coachId: auth.user.id, clientId },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
