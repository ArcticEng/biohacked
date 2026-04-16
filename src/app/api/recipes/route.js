// ═══════════════════════════════════════════════════
// /api/recipes — 3-Mode AI Recipe Generation
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, checkRecipeLimit, incrementRecipeCount } from "@/lib/auth";
import { generateRecipe } from "@/lib/ai";
import { recipeQuerySchema } from "@/lib/validation";

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();

  // Save existing
  if (body.action === "save" && body.recipeId) {
    const existing = await prisma.savedRecipe.findUnique({
      where: { userId_recipeId: { userId: auth.user.id, recipeId: body.recipeId } },
    });
    if (existing) return NextResponse.json({ error: "Already saved" }, { status: 409 });

    await prisma.savedRecipe.create({
      data: { userId: auth.user.id, recipeId: body.recipeId },
    });
    return NextResponse.json({ success: true });
  }

  const limit = await checkRecipeLimit(auth.user.id);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Weekly recipe limit reached. Upgrade to Premium for unlimited recipes.", remaining: 0 },
      { status: 429 }
    );
  }

  const parsed = recipeQuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { query, calories, protein, carbs, fat, mode, event, maxPrepTime } = parsed.data;

  const result = await generateRecipe({ query, calories, protein, carbs, fat, mode, event, maxPrepTime });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const recipe = await prisma.recipe.create({
    data: {
      name: result.recipe.name,
      description: result.recipe.description || null,
      calories: result.recipe.calories,
      protein: result.recipe.protein,
      carbs: result.recipe.carbs,
      fat: result.recipe.fat,
      prepTime: result.recipe.prepTime || null,
      ingredients: result.recipe.ingredients,
      method: result.recipe.method,
      tips: result.recipe.tips || null,
      mode,
      event: event || null,
      maxPrepTime: maxPrepTime || null,
      prompt: query,
      aiModel: "claude-sonnet-4-20250514",
    },
  });

  await incrementRecipeCount(auth.user.id);

  return NextResponse.json({ recipe, remaining: limit.remaining - 1 });
}

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const saved = await prisma.savedRecipe.findMany({
    where: { userId: auth.user.id },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.savedRecipe.count({ where: { userId: auth.user.id } });
  const recipeLimit = await checkRecipeLimit(auth.user.id);

  return NextResponse.json({
    recipes: saved.map(s => s.recipe),
    total, page,
    remaining: recipeLimit.remaining,
  });
}

export async function DELETE(request) {
  const auth = await requireAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get("id");
  if (!recipeId) return NextResponse.json({ error: "Recipe ID required" }, { status: 400 });

  await prisma.savedRecipe.deleteMany({
    where: { userId: auth.user.id, recipeId },
  });

  return NextResponse.json({ success: true });
}
