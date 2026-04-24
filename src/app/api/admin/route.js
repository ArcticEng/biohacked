import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(request) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "stats";

  if (action === "stats") {
    const [users, checkins, recipes, posts, videos, bookings, subs] = await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: true }),
      prisma.checkin.count(), prisma.recipe.count(), prisma.forumPost.count(),
      prisma.educationVideo.count(), prisma.booking.count(),
      prisma.subscription.count({ where: { active: true } }),
    ]);
    return NextResponse.json({ users, checkins, recipes, posts, videos, bookings, activeSubscriptions: subs });
  }

  if (action === "users") {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, tier: true, emailVerified: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 100,
    });
    return NextResponse.json({ users });
  }

  if (action === "pending_educators") {
    const educators = await prisma.user.findMany({
      where: { role: "EDUCATOR", verified: false },
      select: { id: true, email: true, name: true, credentials: true, speciality: true, createdAt: true },
    });
    return NextResponse.json({ educators });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(request) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();

  if (body.action === "verify_educator" && body.userId) {
    await prisma.user.update({ where: { id: body.userId }, data: { verified: true } });
    return NextResponse.json({ success: true });
  }
  if (body.action === "set_role" && body.userId && body.role) {
    await prisma.user.update({ where: { id: body.userId }, data: { role: body.role } });
    return NextResponse.json({ success: true });
  }
  if (body.action === "delete_post" && body.postId) {
    await prisma.forumPost.delete({ where: { id: body.postId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
