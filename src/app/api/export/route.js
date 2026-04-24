import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = auth.user.id;
  const [user, checkins, measurements, trainingLogs, mealPlans, recipes, bookings, notes] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, gender: true, age: true, goal: true, height: true, bodyFat: true, calories: true, protein: true, carbs: true, fat: true, dietaryRestrictions: true, cycleLength: true, lastCycleStart: true, createdAt: true } }),
    prisma.checkin.findMany({ where: { userId }, include: { photos: true }, orderBy: { date: "desc" } }),
    prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.trainingLog.findMany({ where: { userId }, include: { exercises: { include: { sets: true } } }, orderBy: { date: "desc" } }),
    prisma.mealPlan.findMany({ where: { userId }, include: { meals: true }, orderBy: { date: "desc" } }),
    prisma.savedRecipe.findMany({ where: { userId }, include: { recipe: true } }),
    prisma.booking.findMany({ where: { userId }, include: { provider: { select: { name: true, type: true } } } }),
    prisma.coachingNote.findMany({ where: { clientId: userId }, orderBy: { createdAt: "desc" } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: user, checkins, bodyMeasurements: measurements,
    trainingLogs, mealPlans, savedRecipes: recipes.map(r => r.recipe),
    bookings, coachingNotes: notes,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="biohacked-export-${new Date().toISOString().slice(0,10)}.json"` },
  });
}
