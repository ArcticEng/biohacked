// ═══════════════════════════════════════════════════
// /api/bookings — Service Provider Marketplace
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { bookingSchema } from "@/lib/validation";

// GET — list providers, with optional filtering
export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const city = searchParams.get("city");
  const myBookings = searchParams.get("mine");

  if (myBookings) {
    const bookings = await prisma.booking.findMany({
      where: { userId: auth.user.id },
      include: { provider: true },
      orderBy: { scheduledFor: "desc" },
    });
    return NextResponse.json({ bookings });
  }

  const where = { active: true };
  if (type && type !== "all") where.type = type;
  if (city) where.city = city;

  const providers = await prisma.serviceProvider.findMany({
    where,
    orderBy: [{ verified: "desc" }, { rating: "desc" }],
    take: 50,
  });

  // Get unique service types for filtering
  const types = await prisma.serviceProvider.findMany({
    where: { active: true },
    distinct: ["type"],
    select: { type: true },
  });

  return NextResponse.json({ providers, types: types.map(t => t.type) });
}

// POST — create a booking
export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { providerId, scheduledFor, notes } = parsed.data;

  const provider = await prisma.serviceProvider.findUnique({ where: { id: providerId } });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const booking = await prisma.booking.create({
    data: {
      userId: auth.user.id,
      providerId,
      scheduledFor: new Date(scheduledFor),
      notes,
      totalAmount: provider.price,
      status: "CONFIRMED",
    },
    include: { provider: true },
  });

  return NextResponse.json({ booking });
}

// DELETE — cancel booking
export async function DELETE(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  await prisma.booking.updateMany({
    where: { id, userId: auth.user.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true });
}
