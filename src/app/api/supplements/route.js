import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function verifyCoachOfClient(coachId, clientId) {
  const rel = await prisma.coachClient.findFirst({ where: { coachId, clientId, active: true } });
  return !!rel;
}

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const targetId = clientId || auth.user.id;

  if (clientId && auth.user.role === "COACH") {
    const ok = await verifyCoachOfClient(auth.user.id, clientId);
    if (!ok) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  } else if (clientId && clientId !== auth.user.id && auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supplements = await prisma.clientSupplement.findMany({
    where: { clientId: targetId, active: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ supplements });
}

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.user.role !== "COACH" && auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only coaches can manage supplements" }, { status: 403 });
  }

  const body = await request.json();
  const { clientId, name, dosage, timing } = body;
  if (!clientId || !name?.trim()) return NextResponse.json({ error: "clientId and name required" }, { status: 400 });

  const ok = await verifyCoachOfClient(auth.user.id, clientId);
  if (!ok) return NextResponse.json({ error: "Client not assigned to you" }, { status: 403 });

  const count = await prisma.clientSupplement.count({ where: { clientId, active: true } });
  const supp = await prisma.clientSupplement.create({
    data: { coachId: auth.user.id, clientId, name: name.trim(), dosage: dosage?.trim() || null, timing: timing?.trim() || null, order: count },
  });

  return NextResponse.json({ supplement: supp });
}

export async function DELETE(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.user.role !== "COACH" && auth.user.role !== "ADMIN") return NextResponse.json({ error: "Only coaches" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supp = await prisma.clientSupplement.findUnique({ where: { id } });
  if (!supp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.clientSupplement.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
