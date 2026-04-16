// ═══════════════════════════════════════════════════
// /api/notes — Coaching Notes Timeline
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { coachingNoteSchema } from "@/lib/validation";

export async function GET(request) {
  const auth = await requireRole(request, ["COACH", "ADMIN"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const notes = await prisma.coachingNote.findMany({
    where: { coachId: auth.user.id, clientId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ notes });
}

export async function POST(request) {
  const auth = await requireRole(request, ["COACH", "ADMIN"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const parsed = coachingNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const note = await prisma.coachingNote.create({
    data: {
      coachId: auth.user.id,
      clientId: parsed.data.clientId,
      content: parsed.data.content,
    },
  });

  return NextResponse.json({ note });
}

export async function DELETE(request) {
  const auth = await requireRole(request, ["COACH", "ADMIN"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  await prisma.coachingNote.deleteMany({
    where: { id, coachId: auth.user.id },
  });

  return NextResponse.json({ success: true });
}
