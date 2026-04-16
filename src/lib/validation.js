// ═══════════════════════════════════════════════════
// Validation Schemas (Zod)
// ═══════════════════════════════════════════════════

import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
  role: z.enum(["CLIENT", "COACH", "EDUCATOR"]),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  goal: z.enum(["BUILD", "CUT", "MAINTAIN", "PERFORMANCE"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  age: z.number().int().positive().optional(),
  goal: z.enum(["BUILD", "CUT", "MAINTAIN", "PERFORMANCE"]).optional(),
  height: z.number().positive().optional(),
  bodyFat: z.number().optional(),
  calories: z.number().int().positive().optional(),
  protein: z.number().int().min(0).optional(),
  carbs: z.number().int().min(0).optional(),
  fat: z.number().int().min(0).optional(),
  credentials: z.string().optional(),
  speciality: z.string().optional(),
  cycleLength: z.number().int().positive().optional(),
  lastCycleStart: z.string().optional(),
});

export const recipeQuerySchema = z.object({
  query: z.string().optional(),
  calories: z.number().int().positive(),
  protein: z.number().int().min(0),
  carbs: z.number().int().min(0),
  fat: z.number().int().min(0),
  mode: z.enum(["macro", "craving", "mealplan"]).optional().default("macro"),
  event: z.string().optional(),
  maxPrepTime: z.number().int().optional(),
});

export const mealPlanQuerySchema = z.object({
  calories: z.number().int().positive(),
  protein: z.number().int().min(0),
  carbs: z.number().int().min(0),
  fat: z.number().int().min(0),
  goal: z.enum(["BUILD", "CUT", "MAINTAIN", "PERFORMANCE"]),
  meals: z.number().int().min(2).max(8).optional().default(4),
  mode: z.enum(["ai", "hybrid", "manual"]).optional().default("ai"),
});

export const checkinSchema = z.object({
  style: z.enum(["DETAILED", "LIFESTYLE"]).optional().default("DETAILED"),

  // Nutrition
  weight: z.number().positive().optional(),
  calories: z.number().int().optional(),
  protein: z.number().optional(),
  hydration: z.number().optional(),
  caffeine: z.number().int().optional(),
  cravings: z.enum(["low", "average", "high"]).optional(),
  appetite: z.enum(["low", "average", "high"]).optional(),
  digestionRating: z.number().int().min(1).max(10).optional(),

  // Expenditure
  steps: z.number().int().optional(),
  cardioMinutes: z.number().int().optional(),
  trainingStatus: z.enum(["progress", "maintain", "regress"]).optional(),
  trainingRating: z.number().int().min(1).max(10).optional(),

  // Recovery
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.number().int().min(1).max(10).optional(),
  energyLevel: z.number().int().min(1).max(10).optional(),
  stressLevel: z.number().int().min(1).max(10).optional(),
  sorenessLevel: z.number().int().min(1).max(10).optional(),

  supplements: z.array(z.string()).optional(),

  // Lifestyle
  lifestyleTraining: z.string().optional(),
  lifestyleRecovery: z.string().optional(),
  lifestyleDiet: z.string().optional(),
  lifestyleSteps: z.string().optional(),
  lifestyleHydration: z.string().optional(),
  lifestyleEvents: z.string().optional(),
  lifestyleWin: z.string().optional(),
  lifestyleFromCoach: z.string().optional(),

  digestNotes: z.string().optional(),
  generalNotes: z.string().optional(),

  // Photos — array of {type, url}
  photos: z.array(z.object({
    type: z.enum(["front", "side", "back", "training", "posing"]),
    url: z.string(),
  })).optional(),

  measurements: z.object({
    arms: z.number().optional(),
    shoulders: z.number().optional(),
    back: z.number().optional(),
    waist: z.number().optional(),
    hips: z.number().optional(),
    glutes: z.number().optional(),
    quads: z.number().optional(),
  }).optional(),
});

export const trainingLogSchema = z.object({
  name: z.string().min(1),
  notes: z.string().optional(),
  duration: z.number().int().optional(),
  programDayId: z.string().optional(),
  exercises: z.array(z.object({
    name: z.string().min(1),
    sets: z.array(z.object({
      reps: z.number().int().optional(),
      weight: z.number().optional(),
      rpe: z.number().int().min(1).max(10).optional(),
    })),
  })),
});

// Coach creates/updates a training program for a client
export const trainingProgramSchema = z.object({
  id: z.string().optional(), // present = update, absent = create
  clientId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  days: z.array(z.object({
    dayOfWeek: z.string().min(1), // "Monday", "Tuesday", ...
    focus: z.string().optional(),  // "Chest & Triceps"
    exercises: z.array(z.object({
      name: z.string().min(1),
      sets: z.number().int().min(1).max(20),
      reps: z.string().min(1), // "8-10" or "12"
      weight: z.number().optional(),
      notes: z.string().optional(),
    })),
  })).min(1),
});

export const forumPostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  tags: z.array(z.string()).optional().default([]),
});

export const forumReplySchema = z.object({
  body: z.string().min(1).max(2000),
});

export const bookingSchema = z.object({
  providerId: z.string(),
  scheduledFor: z.string(),
  notes: z.string().optional(),
});

export const coachingNoteSchema = z.object({
  clientId: z.string(),
  content: z.string().min(1).max(2000),
});

export const videoUploadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  videoUrl: z.string().min(1),
  thumbnailUrl: z.string().optional(),
  duration: z.number().int().optional(),
  category: z.string(),
});

export const mealSwapSchema = z.object({
  mealId: z.string(),
  query: z.string().optional(),
});

const BLOCKED_WORDS = ["fuck", "shit", "idiot", "stupid", "hate", "dumb", "moron"];

export function moderateContent(text) {
  const lower = text.toLowerCase();
  const found = BLOCKED_WORDS.filter(w => new RegExp(`\\b${w}\\b`, "i").test(lower));
  return { clean: found.length === 0, flagged: found };
}

export function getCyclePhase(dayOfCycle, cycleLength = 28) {
  if (dayOfCycle <= 5) return { phase: "menstrual", range: "1-5", tip: "Lower intensity. Focus on mobility and recovery. Iron-rich foods." };
  if (dayOfCycle <= 13) return { phase: "follicular", range: "6-13", tip: "Oestrogen rising — your strongest phase. Prioritise compound lifts and aim for PRs." };
  if (dayOfCycle <= 16) return { phase: "ovulation", range: "14-16", tip: "Peak strength window. Push intensity but watch joint stability." };
  return { phase: "luteal", range: "17-28", tip: "Higher body temp, possible cravings. Focus on technique and steady volume." };
}

export function calculateCycleDay(lastCycleStart, cycleLength = 28) {
  if (!lastCycleStart) return null;
  const start = new Date(lastCycleStart);
  const now = new Date();
  const days = Math.floor((now - start) / 86400000) % cycleLength + 1;
  return days;
}
