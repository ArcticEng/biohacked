// ═══════════════════════════════════════════════════
// AI Service — Recipe & Meal Plan Generation
// ═══════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

function parseJSON(text) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return null;
}

// ─── Recipe Generation (3 modes) ──────────────────

export async function generateRecipe({ query, calories, protein, carbs, fat, mode = "macro", event, maxPrepTime }) {
  let prompt;

  if (mode === "craving") {
    prompt = `You are a sports nutrition expert creating a satisfying recipe for a specific situation.

Situation: ${event || "general craving"}
Calorie budget: ${calories} kcal
Max prep time: ${maxPrepTime || 30} minutes

Create something that fits the occasion (e.g. Movie Night = snacky/comforting, Date Night = presentable/appealing, Quick Prep = minimal steps, Post-Workout = anabolic window appropriate).

Respond ONLY with valid JSON, no markdown:
{
  "name": "...",
  "description": "One line describing what makes this fit the occasion",
  "calories": <number>,
  "protein": <number>,
  "carbs": <number>,
  "fat": <number>,
  "prepTime": "X min",
  "cookTime": "X min",
  "ingredients": [{"name": "...", "amount": "..."}],
  "method": ["Step 1...", "Step 2..."],
  "tips": "..."
}`;
  } else {
    prompt = `You are a sports nutrition recipe expert.

Create a recipe for: "${query || 'balanced meal'}"

Target macros:
- Calories: ${calories} kcal
- Protein: ${protein}g
- Carbs: ${carbs}g
- Fat: ${fat}g

REQUIREMENTS:
1. Hit macros within 5% tolerance
2. Exact gram measurements for every ingredient
3. Accessible ingredients
4. Practical cooking instructions

Respond ONLY with valid JSON, no markdown:
{
  "name": "...",
  "description": "One sentence",
  "calories": <number>,
  "protein": <number>,
  "carbs": <number>,
  "fat": <number>,
  "prepTime": "X min",
  "cookTime": "X min",
  "servings": 1,
  "ingredients": [{"name": "...", "amount": "150g", "calories": <n>, "protein": <n>, "carbs": <n>, "fat": <n>}],
  "method": ["Step 1..."],
  "tips": "..."
}`;
  }

  const response = await client.messages.create({
    model: MODEL, max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.filter(c => c.type === "text").map(c => c.text).join("");
  const parsed = parseJSON(text);

  if (parsed) return { success: true, recipe: parsed };
  return { success: false, error: "Could not parse recipe response" };
}

// ─── Meal Plan Generation ──────────────────────────

export async function generateMealPlan({ calories, protein, carbs, fat, goal, meals = 4 }) {
  const goalContext = {
    BUILD: "Muscle-building phase. Prioritise calorie-dense nutrient-rich foods. Time carbs around training.",
    CUT: "Cutting phase. Prioritise high-volume, low-calorie foods for satiety. Keep protein high.",
    MAINTAIN: "Maintenance. Balance meals for sustained energy.",
    PERFORMANCE: "Athletic performance focus. Time carbs around training. Include recovery nutrition.",
  };

  const prompt = `You are an elite sports nutritionist creating a precision meal plan.

${goalContext[goal] || goalContext.MAINTAIN}

Daily targets:
- Calories: ${calories} kcal
- Protein: ${protein}g, Carbs: ${carbs}g, Fat: ${fat}g
- Meals: ${meals}

Distribute macros intelligently. Sum to daily targets within 2% tolerance. Exact gram measurements.

Respond ONLY with valid JSON:
{
  "name": "Daily Meal Plan",
  "totalCalories": ${calories},
  "totalProtein": ${protein},
  "totalCarbs": ${carbs},
  "totalFat": ${fat},
  "goal": "${goal}",
  "meals": [
    {
      "name": "Breakfast",
      "time": "7:00 AM",
      "calories": <n>, "protein": <n>, "carbs": <n>, "fat": <n>,
      "foods": [{"name": "...", "amount": "100g"}],
      "instructions": "Brief prep"
    }
  ]
}`;

  const response = await client.messages.create({
    model: MODEL, max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.filter(c => c.type === "text").map(c => c.text).join("");
  const parsed = parseJSON(text);

  if (parsed) return { success: true, mealPlan: parsed };
  return { success: false, error: "Could not parse meal plan response" };
}

// ─── Meal Swap (single meal within a plan) ───────

export async function generateMealSwap({ meal, query }) {
  const prompt = `You are a sports nutritionist generating a meal swap.

Original meal: ${meal.name} (${meal.calories}kcal, ${meal.protein}P/${meal.carbs}C/${meal.fat}F)
User preference: ${query || "something different"}

Create a replacement that hits the same macros (within 5% tolerance) but offers variety.

Respond ONLY with valid JSON:
{
  "name": "...",
  "time": "${meal.time || ''}",
  "calories": ${meal.calories},
  "protein": ${meal.protein},
  "carbs": ${meal.carbs},
  "fat": ${meal.fat},
  "foods": [{"name": "...", "amount": "100g"}],
  "instructions": "Brief prep"
}`;

  const response = await client.messages.create({
    model: MODEL, max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.filter(c => c.type === "text").map(c => c.text).join("");
  const parsed = parseJSON(text);

  if (parsed) return { success: true, meal: parsed };
  return { success: false, error: "Could not parse meal swap" };
}

// ─── Research Paper Summary ────────────────────────

export async function summarizeResearchPaper({ title, abstract, fullText }) {
  const prompt = `You are a sports science researcher. Provide a clear breakdown for fitness enthusiasts and coaches.

Title: ${title}
${abstract ? `Abstract: ${abstract}` : ""}
${fullText ? `Full text: ${fullText.slice(0, 8000)}` : ""}

Respond ONLY with JSON:
{
  "keyFindings": ["..."],
  "practicalApplications": ["..."],
  "methodology": "...",
  "limitations": ["..."],
  "bottomLine": "One paragraph takeaway"
}`;

  const response = await client.messages.create({
    model: MODEL, max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.filter(c => c.type === "text").map(c => c.text).join("");
  const parsed = parseJSON(text);

  if (parsed) return { success: true, summary: parsed };
  return { success: false, error: "Could not parse summary" };
}
