// ═══════════════════════════════════════════════════
// /api/meal-plans — AI Meal Plan Generation + Swaps + Manual Edits
//   Actions:
//     (none)              → generate a plan (mode=ai|hybrid|manual)
//     action=swap         → AI-swap a single meal
//     action=update_meal  → manually edit a meal (hybrid mode)
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generateMealPlan, generateMealSwap } from "@/lib/ai";
import { mealPlanQuerySchema, mealSwapSchema } from "@/lib/validation";

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

  // ── MANUAL MEAL EDIT ──
  if (body.action === "update_meal" && body.mealId) {
    const meal = await prisma.mealPlanMeal.findUnique({
      where: { id: body.mealId },
      include: { mealPlan: true },
    });
    if (!meal) return NextResponse.json({ error: "Meal not found" }, { status: 404 });

    const isOwner = meal.mealPlan.userId === auth.user.id;
    let isCoach = false;
    if (!isOwner && auth.user.role === "COACH") {
      isCoach = await verifyCoachOfClient(auth.user.id, meal.mealPlan.userId);
    }
    if (!isOwner && !isCoach && auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const patch = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.time !== undefined) patch.time = body.time;
    if (body.calories !== undefined) patch.calories = parseInt(body.calories) || 0;
    if (body.protein !== undefined) patch.protein = parseInt(body.protein) || 0;
    if (body.carbs !== undefined) patch.carbs = parseInt(body.carbs) || 0;
    if (body.fat !== undefined) patch.fat = parseInt(body.fat) || 0;
    if (body.foods !== undefined) patch.foods = Array.isArray(body.foods) ? body.foods : [];
    if (body.instructions !== undefined) patch.instructions = body.instructions;

    const updated = await prisma.mealPlanMeal.update({
      where: { id: meal.id }, data: patch,
    });

    const allMeals = await prisma.mealPlanMeal.findMany({ where: { mealPlanId: meal.mealPlanId } });
    const totals = allMeals.reduce((t, m) => ({
      totalCalories: t.totalCalories + (m.calories || 0),
      totalProtein: t.totalProtein + (m.protein || 0),
      totalCarbs: t.totalCarbs + (m.carbs || 0),
      totalFat: t.totalFat + (m.fat || 0),
    }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });

    await prisma.mealPlan.update({
      where: { id: meal.mealPlanId },
      data: { ...totals, mode: meal.mealPlan.mode === "manual" ? "manual" : "hybrid" },
    });

    return NextResponse.json({ meal: updated });
  }

  // ── MEAL SWAP ──
  if (body.action === "swap") {
    const parsed = mealSwapSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const meal = await prisma.mealPlanMeal.findUnique({
      where: { id: parsed.data.mealId },
      include: { mealPlan: true },
    });
    if (!meal) return NextResponse.json({ error: "Meal not found" }, { status: 404 });

    if (meal.mealPlan.userId !== auth.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (auth.user.role === "CLIENT" && !auth.user.allowMealSwap) {
      return NextResponse.json({ error: "Meal swap not enabled. Ask your coach to enable it." }, { status: 403 });
    }

    const result = await generateMealSwap({ meal, query: parsed.data.query });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

    const updated = await prisma.mealPlanMeal.update({
      where: { id: meal.id },
      data: {
        name: result.meal.name,
        foods: result.meal.foods || [],
        instructions: result.meal.instructions || null,
        calories: result.meal.calories ?? meal.calories,
        protein: result.meal.protein ?? meal.protein,
        carbs: result.meal.carbs ?? meal.carbs,
        fat: result.meal.fat ?? meal.fat,
        swappedAt: new Date(),
      },
    });

    const allMeals = await prisma.mealPlanMeal.findMany({ where: { mealPlanId: meal.mealPlanId } });
    const totals = allMeals.reduce((t, m) => ({
      totalCalories: t.totalCalories + (m.calories || 0),
      totalProtein: t.totalProtein + (m.protein || 0),
      totalCarbs: t.totalCarbs + (m.carbs || 0),
      totalFat: t.totalFat + (m.fat || 0),
    }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
    await prisma.mealPlan.update({ where: { id: meal.mealPlanId }, data: totals });

    return NextResponse.json({ meal: updated });
  }

  // ── GENERATE PLAN ──
  if (auth.user.tier === "FREE") {
    return NextResponse.json({ error: "Meal plan generation is a Premium feature" }, { status: 403 });
  }

  const parsed = mealPlanQuerySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { calories, protein, carbs, fat, goal, meals, mode } = parsed.data;
  const targetUserId = body.clientId || auth.user.id;

  if (body.clientId && auth.user.role !== "COACH" && auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only coaches can generate plans for clients" }, { status: 403 });
  }
  if (body.clientId && auth.user.role === "COACH") {
    const ok = await verifyCoachOfClient(auth.user.id, body.clientId);
    if (!ok) return NextResponse.json({ error: "Client not assigned to you" }, { status: 403 });
  }

  // ── MANUAL MODE: create blank template ──
  if (mode === "manual") {
    const names = Array.from({ length: meals }, (_, i) => {
      if (meals === 3) return ["Breakfast", "Lunch", "Dinner"][i];
      if (meals === 4) return ["Breakfast", "Lunch", "Pre-Workout", "Dinner"][i];
      if (meals === 5) return ["Breakfast", "Mid-Morning", "Lunch", "Pre-Workout", "Dinner"][i];
      return ["Breakfast", "Mid-Morning", "Lunch", "Pre-Workout", "Dinner", "Evening"][i] || `Meal ${i + 1}`;
    });

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: targetUserId,
        name: "Custom Meal Plan",
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        goal, mode: "manual",
        prompt: JSON.stringify(parsed.data),
        aiModel: null,
        meals: {
          create: names.map((name, i) => ({
            name, order: i,
            calories: 0, protein: 0, carbs: 0, fat: 0,
            foods: [],
          })),
        },
      },
      include: { meals: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ mealPlan });
  }

  // ── AI / HYBRID MODE ──
  const result = await generateMealPlan({ calories, protein, carbs, fat, goal, meals });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId: targetUserId,
      name: result.mealPlan.name || "Daily Meal Plan",
      totalCalories: result.mealPlan.totalCalories,
      totalProtein: result.mealPlan.totalProtein,
      totalCarbs: result.mealPlan.totalCarbs,
      totalFat: result.mealPlan.totalFat,
      goal, mode,
      prompt: JSON.stringify(parsed.data),
      aiModel: "claude-sonnet-4-20250514",
      meals: {
        create: (result.mealPlan.meals || []).map((meal, i) => ({
          name: meal.name,
          time: meal.time || null,
          order: i,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          foods: meal.foods || [],
          instructions: meal.instructions || null,
        })),
      },
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ mealPlan });
}

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const current = searchParams.get("current");

  if (clientId && auth.user.role === "COACH") {
    const ok = await verifyCoachOfClient(auth.user.id, clientId);
    if (!ok) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  } else if (clientId && auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetId = clientId || auth.user.id;

  if (current) {
    const plan = await prisma.mealPlan.findFirst({
      where: { userId: targetId },
      include: { meals: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ mealPlan: plan });
  }

  const plans = await prisma.mealPlan.findMany({
    where: { userId: targetId },
    include: { meals: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ mealPlans: plans });
}
