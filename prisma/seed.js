// ═══════════════════════════════════════════════════
// Database Seed — Demo Data (richer for client demos)
//
// Populates every major page with meaningful content so the
// client doesn't land on empty states during the walkthrough.
// ═══════════════════════════════════════════════════

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000);

async function main() {
  console.log("🌱 Seeding Bio-Hacked database...\n");

  // ── CLEAN (order matters because of FKs) ──
  await prisma.booking.deleteMany();
  await prisma.serviceProvider.deleteMany();
  await prisma.forumLike.deleteMany();
  await prisma.forumReply.deleteMany();
  await prisma.forumPost.deleteMany();
  await prisma.trainingLogSet.deleteMany();
  await prisma.trainingLogExercise.deleteMany();
  await prisma.trainingLog.deleteMany();
  await prisma.trainingProgramExercise.deleteMany();
  await prisma.trainingProgramDay.deleteMany();
  await prisma.trainingProgram.deleteMany();
  await prisma.checkinPhoto.deleteMany();
  await prisma.checkin.deleteMany();
  await prisma.bodyMeasurement.deleteMany();
  await prisma.savedRecipe.deleteMany();
  await prisma.mealPlanMeal.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.coachingNote.deleteMany();
  await prisma.coachClient.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.educationVideo.deleteMany();
  await prisma.researchPaper.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("password123", 12);

  // ───────────────────────────────────────────────
  // USERS
  // ───────────────────────────────────────────────
  const coach = await prisma.user.create({
    data: {
      email: "coach@biohacked.co.za", passwordHash: hash,
      name: "Coach Alex Thompson", role: "COACH", tier: "COACH",
      gender: "MALE", age: 34, speciality: "Bodybuilding & Nutrition",
      verified: true, calories: 2600, protein: 200, carbs: 280, fat: 80,
    },
  });

  const educator = await prisma.user.create({
    data: {
      email: "educator@biohacked.co.za", passwordHash: hash,
      name: "Dr. Lauren Price", role: "EDUCATOR", tier: "PREMIUM",
      gender: "FEMALE", age: 38, credentials: "PhD Sports Science, CSCS",
      speciality: "Exercise Physiology & Female Athletics", verified: true,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: "sarah@example.com", passwordHash: hash,
      name: "Sarah Mitchell", role: "CLIENT", tier: "PREMIUM",
      gender: "FEMALE", age: 27, goal: "CUT",
      height: 165, bodyFat: 22,
      calories: 1800, protein: 150, carbs: 180, fat: 60,
      allowMealSwap: true,
      cycleLength: 28,
      lastCycleStart: daysAgo(7),
    },
  });

  const james = await prisma.user.create({
    data: {
      email: "james@example.com", passwordHash: hash,
      name: "James Carter", role: "CLIENT", tier: "PREMIUM",
      gender: "MALE", age: 31, goal: "BUILD",
      height: 180, bodyFat: 16,
      calories: 2800, protein: 220, carbs: 300, fat: 80,
      allowMealSwap: false,
    },
  });

  const marcus = await prisma.user.create({
    data: {
      email: "marcus@example.com", passwordHash: hash,
      name: "Marcus Johnson", role: "CLIENT", tier: "FREE",
      gender: "MALE", age: 29, goal: "MAINTAIN",
      calories: 2400, protein: 180, carbs: 280, fat: 70,
    },
  });
  console.log("✓ Users (5): 1 coach, 1 educator, 3 clients");

  // ───────────────────────────────────────────────
  // COACH-CLIENT & NOTES TIMELINE
  // ───────────────────────────────────────────────
  await prisma.coachClient.createMany({
    data: [
      { coachId: coach.id, clientId: sarah.id },
      { coachId: coach.id, clientId: james.id },
      { coachId: coach.id, clientId: marcus.id },
    ],
  });

  await prisma.coachingNote.createMany({
    data: [
      { coachId: coach.id, clientId: sarah.id, content: "Starting stats locked. Body-fat estimate 22%, goal to hit 18% in 10 weeks. Macros: 1800/150P/180C/60F.", createdAt: daysAgo(21) },
      { coachId: coach.id, clientId: sarah.id, content: "Week 2 — down 0.8kg, training compliance 100%. Lifts holding on Phase 1. Moving to Phase 2 next week.", createdAt: daysAgo(14) },
      { coachId: coach.id, clientId: sarah.id, content: "Phase 2 started. Added a 4th cardio session and bumped steps to 10k. Cut dairy — digestion much better.", createdAt: daysAgo(7) },
      { coachId: coach.id, clientId: sarah.id, content: "Energy steady this week despite deficit. Sleep quality improved. Considering refeed next Sunday.", createdAt: daysAgo(2) },
      { coachId: coach.id, clientId: james.id, content: "Kicking off a lean bulk. +200 cal surplus, focus on compound progression.", createdAt: daysAgo(10) },
    ],
  });

  // ───────────────────────────────────────────────
  // CHECK-INS (with coach feedback on the reviewed ones)
  // ───────────────────────────────────────────────
  const feedbackBlurbs = [
    "Great consistency — macros on point. Keep pushing the 10k step goal.",
    "Digestion improving, good call removing dairy. Cardio looks perfect.",
    "Strong week. Energy is holding — deficit is sustainable right now.",
    "Sleep quality dipping slightly. Try magnesium 1hr before bed this week.",
    "Training performance up — proof the Phase 2 programming is working.",
    "Stress a bit elevated, maybe scale cardio back one session if it persists.",
  ];

  const makeCheckins = async (userId, baseWeight) => {
    for (let i = 6; i >= 0; i--) {
      const weight = +(baseWeight - (i * 0.15) + ((i * 37 % 7) * 0.05)).toFixed(1);
      const isToday = i === 0;
      await prisma.checkin.create({
        data: {
          userId,
          date: daysAgo(i),
          status: isToday ? "PENDING" : "REVIEWED",
          style: "DETAILED",
          weight,
          calories: Math.round(baseWeight * 26 + i * 12),
          protein: +(baseWeight * 2.2 + i * 2).toFixed(1),
          hydration: +(2.5 + (i * 0.15)).toFixed(1),
          caffeine: 150 + (i * 20),
          cravings: ["low", "average", "high"][i % 3],
          appetite: ["low", "average", "high"][(i + 1) % 3],
          digestionRating: Math.min(10, 6 + ((i * 3) % 5)),
          steps: 7000 + i * 600,
          cardioMinutes: 20 + i * 5,
          sleepHours: +(7 + (i * 0.3) % 2).toFixed(1),
          sleepQuality: Math.min(10, 5 + ((i * 2) % 5)),
          energyLevel: Math.min(10, 5 + ((i * 3 + 1) % 5)),
          stressLevel: Math.max(1, 7 - ((i * 2) % 5)),
          sorenessLevel: Math.max(1, 6 - ((i * 3) % 5)),
          trainingRating: Math.min(10, 6 + ((i * 3) % 4)),
          trainingStatus: ["progress", "maintain", "progress", "maintain", "progress", "progress", "maintain"][i],
          supplements: ["Creatine", "Whey Protein", "Vitamin D", "Omega 3"],
          generalNotes: isToday ? "Feeling strong this week. Training performance up. Energy steady." : null,
          coachFeedback: isToday ? null : feedbackBlurbs[i % feedbackBlurbs.length],
          feedbackDate: isToday ? null : daysAgo(i - 1),
        },
      });
    }
  };

  await makeCheckins(sarah.id, 68.2);
  await makeCheckins(james.id, 85.4);

  // A lifestyle check-in for Sarah from 3 days ago
  await prisma.checkin.create({
    data: {
      userId: sarah.id, date: daysAgo(3), status: "REVIEWED", style: "LIFESTYLE",
      lifestyleTraining: "All 5 sessions done. Squat PB +5kg. Deadlift felt strong.",
      lifestyleRecovery: "Sleep 7-8h most nights. Some soreness Mondays.",
      lifestyleDiet: "On plan 6/7 days. One off-plan dinner (family birthday).",
      lifestyleSteps: "Hit 10k 5 of 7 days. Rain on Thursday kept me under.",
      lifestyleHydration: "Averaging 2.8L + electrolytes on training days.",
      lifestyleEvents: "Friend's wedding next Saturday — flagging it for macros.",
      lifestyleWin: "First unassisted pull-up! Huge win after 8 weeks of negatives.",
      lifestyleFromCoach: "Can we look at deload timing for week 6?",
      coachFeedback: "Fantastic win on the pull-up! Let's plan deload for end of week 5 given your current intensity — I'll update your program Sunday.",
      feedbackDate: daysAgo(2),
    },
  });
  console.log("✓ Check-ins (15 across Sarah & James, with coach feedback)");

  // ───────────────────────────────────────────────
  // BODY MEASUREMENTS (two entries each to show delta)
  // ───────────────────────────────────────────────
  await prisma.bodyMeasurement.createMany({
    data: [
      // Sarah — older entry
      { userId: sarah.id, date: daysAgo(14), arms: 28.5, shoulders: 99, back: 87, waist: 70, hips: 97, glutes: 95, quads: 53 },
      // Sarah — latest (showing cut progress)
      { userId: sarah.id, date: daysAgo(1), arms: 28, shoulders: 98, back: 86, waist: 68, hips: 96, glutes: 94, quads: 52 },
      // James — older
      { userId: james.id, date: daysAgo(14), arms: 37, shoulders: 120, back: 106, waist: 81, glutes: 97, quads: 61 },
      // James — latest (building)
      { userId: james.id, date: daysAgo(1), arms: 38, shoulders: 122, back: 108, waist: 82, glutes: 98, quads: 62 },
    ],
  });

  // ───────────────────────────────────────────────
  // TRAINING PROGRAM (Sarah)
  // ───────────────────────────────────────────────
  const sarahProgram = await prisma.trainingProgram.create({
    data: {
      name: "Physique Shred — Phase 2",
      createdById: coach.id, assignedTo: sarah.id,
      days: {
        create: [
          {
            dayName: "Monday", focus: "Chest & Triceps", order: 0,
            exercises: { create: [
              { name: "Flat Bench Press", sets: 4, reps: "8-10", weight: 50, order: 0 },
              { name: "Incline DB Press", sets: 3, reps: "10-12", weight: 22, order: 1 },
              { name: "Cable Flyes", sets: 3, reps: "12-15", weight: 15, order: 2 },
              { name: "Tricep Pushdowns", sets: 3, reps: "12-15", weight: 30, order: 3 },
            ]},
          },
          {
            dayName: "Tuesday", focus: "Back & Biceps", order: 1,
            exercises: { create: [
              { name: "Deadlift", sets: 4, reps: "5-6", weight: 90, order: 0 },
              { name: "Barbell Row", sets: 4, reps: "8-10", weight: 55, order: 1 },
              { name: "Lat Pulldown", sets: 3, reps: "10-12", weight: 50, order: 2 },
              { name: "Barbell Curl", sets: 3, reps: "10-12", weight: 25, order: 3 },
            ]},
          },
          { dayName: "Wednesday", focus: "Rest / Active Recovery", order: 2 },
          {
            dayName: "Thursday", focus: "Shoulders & Abs", order: 3,
            exercises: { create: [
              { name: "Overhead Press", sets: 4, reps: "8-10", weight: 40, order: 0 },
              { name: "Lateral Raises", sets: 4, reps: "12-15", weight: 10, order: 1 },
              { name: "Rear Delt Flyes", sets: 3, reps: "15", weight: 8, order: 2 },
              { name: "Cable Crunches", sets: 3, reps: "15-20", weight: 20, order: 3 },
            ]},
          },
          {
            dayName: "Friday", focus: "Legs", order: 4,
            exercises: { create: [
              { name: "Squat", sets: 4, reps: "8-10", weight: 75, order: 0 },
              { name: "Romanian Deadlift", sets: 3, reps: "10-12", weight: 60, order: 1 },
              { name: "Leg Press", sets: 3, reps: "12-15", weight: 120, order: 2 },
              { name: "Calf Raises", sets: 4, reps: "15-20", weight: 50, order: 3 },
            ]},
          },
          { dayName: "Saturday", focus: "Cardio / Rest", order: 5 },
          { dayName: "Sunday", focus: "Rest", order: 6 },
        ],
      },
    },
    include: { days: { include: { exercises: true } } },
  });

  // ───────────────────────────────────────────────
  // TRAINING LOGS (Sarah — last 3 sessions)
  // ───────────────────────────────────────────────
  const mondayDay = sarahProgram.days.find(d => d.dayName === "Monday");
  const tuesdayDay = sarahProgram.days.find(d => d.dayName === "Tuesday");
  const fridayDay = sarahProgram.days.find(d => d.dayName === "Friday");

  await prisma.trainingLog.create({
    data: {
      userId: sarah.id, date: daysAgo(1), name: "Monday — Chest & Triceps",
      programDayId: mondayDay?.id, duration: 58,
      notes: "Bench felt strong. 52.5kg for 8 next week.",
      exercises: { create: [
        { name: "Flat Bench Press", order: 0, sets: { create: [
          { setNumber: 1, reps: 10, weight: 50, rpe: 7 },
          { setNumber: 2, reps: 9, weight: 50, rpe: 8 },
          { setNumber: 3, reps: 8, weight: 50, rpe: 9 },
          { setNumber: 4, reps: 8, weight: 50, rpe: 9 },
        ]}},
        { name: "Incline DB Press", order: 1, sets: { create: [
          { setNumber: 1, reps: 12, weight: 22, rpe: 7 },
          { setNumber: 2, reps: 11, weight: 22, rpe: 8 },
          { setNumber: 3, reps: 10, weight: 22, rpe: 9 },
        ]}},
        { name: "Cable Flyes", order: 2, sets: { create: [
          { setNumber: 1, reps: 15, weight: 15 },
          { setNumber: 2, reps: 13, weight: 15 },
          { setNumber: 3, reps: 12, weight: 15 },
        ]}},
      ]},
    },
  });

  await prisma.trainingLog.create({
    data: {
      userId: sarah.id, date: daysAgo(2), name: "Friday — Legs",
      programDayId: fridayDay?.id, duration: 65,
      notes: "Squat PB! 80kg for 6. Feeling strong.",
      exercises: { create: [
        { name: "Squat", order: 0, sets: { create: [
          { setNumber: 1, reps: 10, weight: 75, rpe: 7 },
          { setNumber: 2, reps: 9, weight: 75, rpe: 8 },
          { setNumber: 3, reps: 8, weight: 80, rpe: 9 },
          { setNumber: 4, reps: 6, weight: 80, rpe: 10 },
        ]}},
        { name: "Romanian Deadlift", order: 1, sets: { create: [
          { setNumber: 1, reps: 12, weight: 60 },
          { setNumber: 2, reps: 10, weight: 60 },
          { setNumber: 3, reps: 10, weight: 60 },
        ]}},
      ]},
    },
  });

  await prisma.trainingLog.create({
    data: {
      userId: sarah.id, date: daysAgo(5), name: "Tuesday — Back & Biceps",
      programDayId: tuesdayDay?.id, duration: 62,
      exercises: { create: [
        { name: "Deadlift", order: 0, sets: { create: [
          { setNumber: 1, reps: 6, weight: 90, rpe: 8 },
          { setNumber: 2, reps: 5, weight: 90, rpe: 9 },
          { setNumber: 3, reps: 5, weight: 90, rpe: 9 },
          { setNumber: 4, reps: 4, weight: 90, rpe: 10 },
        ]}},
      ]},
    },
  });
  console.log("✓ Training program + 3 logged sessions");

  // ───────────────────────────────────────────────
  // RECIPES + SAVED RECIPES (Sarah's saves)
  // ───────────────────────────────────────────────
  const proteinPancakes = await prisma.recipe.create({
    data: {
      name: "High-Protein Banana Pancakes",
      description: "Fluffy, macro-friendly stack — 40g protein and under 400 kcal.",
      calories: 380, protein: 40, carbs: 42, fat: 7,
      prepTime: "5 min",
      mode: "macro",
      ingredients: [
        { name: "Rolled oats", amount: "50g" },
        { name: "Banana", amount: "1 medium" },
        { name: "Whey isolate", amount: "30g" },
        { name: "Egg whites", amount: "150ml" },
        { name: "Baking powder", amount: "1 tsp" },
      ],
      method: [
        "Blend oats into a fine flour.",
        "Add banana, whey, egg whites, baking powder. Blend to batter.",
        "Cook on non-stick pan, medium heat, 1-2 min per side.",
        "Top with Greek yoghurt and berries.",
      ],
      tips: "Add 10g cocoa powder for a chocolate version. Swap banana for blueberries to drop carbs.",
      aiModel: "claude-sonnet-4-20250514",
    },
  });

  const ovenChicken = await prisma.recipe.create({
    data: {
      name: "Tray-Bake Chicken with Sweet Potato",
      description: "Classic prep meal — hits macros with zero thinking.",
      calories: 520, protein: 48, carbs: 45, fat: 14,
      prepTime: "10 min",
      mode: "macro",
      ingredients: [
        { name: "Chicken breast", amount: "180g" },
        { name: "Sweet potato", amount: "200g" },
        { name: "Broccoli", amount: "150g" },
        { name: "Olive oil", amount: "1 tbsp" },
        { name: "Paprika + garlic + salt", amount: "to taste" },
      ],
      method: [
        "Preheat oven to 200°C.",
        "Cube sweet potato, toss with oil and paprika, bake 15 min.",
        "Add chicken (seasoned) and broccoli to the tray, bake another 20 min.",
        "Let chicken rest 3 min before serving.",
      ],
      aiModel: "claude-sonnet-4-20250514",
    },
  });

  const proteinPizza = await prisma.recipe.create({
    data: {
      name: "Macro-Perfect Protein Pizza",
      description: "Movie night without breaking your cut.",
      calories: 450, protein: 43, carbs: 38, fat: 12,
      prepTime: "15 min",
      mode: "craving", event: "Movie Night", maxPrepTime: 20,
      ingredients: [
        { name: "Wholemeal tortilla", amount: "1 wrap (70g)" },
        { name: "Tomato passata", amount: "80ml" },
        { name: "Low-fat mozzarella", amount: "60g" },
        { name: "Chicken breast (shredded)", amount: "150g" },
        { name: "Spinach", amount: "30g" },
        { name: "Oregano", amount: "1 tsp" },
      ],
      method: [
        "Preheat oven to 200°C.",
        "Spread passata on tortilla.",
        "Add chicken, spinach. Top with mozzarella.",
        "Bake 12-15 minutes until golden.",
      ],
      tips: "Use lavash instead of tortilla for an even lower-cal base.",
      aiModel: "claude-sonnet-4-20250514",
    },
  });

  await prisma.savedRecipe.createMany({
    data: [
      { userId: sarah.id, recipeId: proteinPancakes.id },
      { userId: sarah.id, recipeId: ovenChicken.id },
      { userId: sarah.id, recipeId: proteinPizza.id },
    ],
  });
  console.log("✓ Recipes + Sarah saves 3");

  // ───────────────────────────────────────────────
  // MEAL PLAN (pre-built for Sarah — looks AI-generated)
  // ───────────────────────────────────────────────
  await prisma.mealPlan.create({
    data: {
      userId: sarah.id,
      name: "Cut Phase — 1800 kcal",
      totalCalories: 1800, totalProtein: 150, totalCarbs: 180, totalFat: 60,
      goal: "CUT", mode: "ai",
      aiModel: "claude-sonnet-4-20250514",
      meals: {
        create: [
          {
            name: "Breakfast", time: "7:00 AM", order: 0,
            calories: 330, protein: 28, carbs: 38, fat: 5,
            foods: [
              { name: "Greek yoghurt (0%)", amount: "200g", calories: 100, protein: 18, carbs: 6, fat: 0 },
              { name: "Mixed berries", amount: "100g", calories: 50, protein: 1, carbs: 11, fat: 0 },
              { name: "Oats", amount: "50g", calories: 180, protein: 6, carbs: 32, fat: 3 },
            ],
            instructions: "Mix oats + yoghurt in a jar the night before. Top with berries in the morning.",
          },
          {
            name: "Lunch", time: "12:30 PM", order: 1,
            calories: 480, protein: 60, carbs: 55, fat: 8,
            foods: [
              { name: "Chicken breast", amount: "180g", calories: 270, protein: 54, carbs: 0, fat: 3 },
              { name: "Brown rice", amount: "100g cooked", calories: 130, protein: 3, carbs: 28, fat: 1 },
              { name: "Broccoli", amount: "150g", calories: 40, protein: 3, carbs: 7, fat: 0 },
              { name: "Avocado", amount: "30g", calories: 40, protein: 0, carbs: 2, fat: 4 },
            ],
            instructions: "Grill chicken with paprika + lemon. Steam broccoli. Combine with rice.",
          },
          {
            name: "Pre-Workout", time: "4:00 PM", order: 2,
            calories: 260, protein: 27, carbs: 34, fat: 3,
            foods: [
              { name: "Banana", amount: "1 medium", calories: 90, protein: 1, carbs: 23, fat: 0 },
              { name: "Whey protein", amount: "30g", calories: 120, protein: 25, carbs: 3, fat: 1 },
              { name: "Rice cakes", amount: "2", calories: 50, protein: 1, carbs: 8, fat: 0 },
            ],
            instructions: "Simple blend. Eat 60-90 min before training.",
          },
          {
            name: "Dinner", time: "7:30 PM", order: 3,
            calories: 560, protein: 42, carbs: 45, fat: 22,
            foods: [
              { name: "Salmon fillet", amount: "180g", calories: 310, protein: 40, carbs: 0, fat: 16 },
              { name: "Sweet potato", amount: "150g", calories: 130, protein: 2, carbs: 30, fat: 0 },
              { name: "Mixed salad + olive oil", amount: "100g", calories: 120, protein: 1, carbs: 5, fat: 6 },
            ],
            instructions: "Bake salmon 15 min at 200°C. Microwave sweet potato whole, 6-8 min.",
          },
          {
            name: "Evening Snack", time: "9:30 PM", order: 4,
            calories: 170, protein: 18, carbs: 8, fat: 8,
            foods: [
              { name: "Cottage cheese", amount: "150g", calories: 110, protein: 15, carbs: 5, fat: 3 },
              { name: "Almonds", amount: "10g", calories: 60, protein: 3, carbs: 3, fat: 5 },
            ],
            instructions: "Slow-digesting protein to end the day. Optional.",
          },
        ],
      },
    },
  });
  console.log("✓ Meal plan (Sarah — 5 meals, 1800 kcal)");

  // ───────────────────────────────────────────────
  // SUBSCRIPTIONS
  // ───────────────────────────────────────────────
  await prisma.subscription.createMany({
    data: [
      { userId: coach.id, tier: "COACH", active: true },
      { userId: sarah.id, tier: "PREMIUM", active: true },
      { userId: james.id, tier: "PREMIUM", active: true },
      { userId: educator.id, tier: "PREMIUM", active: true },
    ],
  });

  // ───────────────────────────────────────────────
  // FORUM (posts + replies + likes)
  // ───────────────────────────────────────────────
  const post1 = await prisma.forumPost.create({
    data: { authorId: james.id, title: "Finally hit a new PB on deadlift — 180kg!", body: "Four years of consistent training. Stoked with this. Slow and steady wins.", tags: ["training"], createdAt: daysAgo(2) },
  });
  const post2 = await prisma.forumPost.create({
    data: { authorId: sarah.id, title: "Pre-workout nutrition makes a huge difference", body: "Anyone notice a huge difference when you nail pre-workout nutrition? Switched from fasted to carbs 90 mins before — pump is insane and I'm adding reps.", tags: ["nutrition"], createdAt: daysAgo(4) },
  });
  const post3 = await prisma.forumPost.create({
    data: { authorId: coach.id, title: "Sleep is the most underrated performance enhancer", body: "Reminder: 8 hours beats any supplement stack. Prioritise it. Most of my clients who stall are getting 5-6 hours.", tags: ["recovery"], createdAt: daysAgo(6) },
  });
  const post4 = await prisma.forumPost.create({
    data: { authorId: marcus.id, title: "12-week transformation — Bio-Hacked meal tool worked", body: "92kg at 24% BF to 84kg at 15%. The AI meal plan tool kept me honest on macros.", tags: ["transformation"], createdAt: daysAgo(10) },
  });

  await prisma.forumReply.createMany({
    data: [
      { postId: post1.id, authorId: coach.id, body: "Huge. What's your current body weight and training split?", createdAt: daysAgo(1) },
      { postId: post1.id, authorId: sarah.id, body: "Congrats! Inspiring to see consistency pay off.", createdAt: daysAgo(1) },
      { postId: post2.id, authorId: james.id, body: "100%. I also front-load carbs on training days now.", createdAt: daysAgo(3) },
      { postId: post3.id, authorId: sarah.id, body: "Cosign. Magnesium glycinate + cool room has been a game-changer for me.", createdAt: daysAgo(5) },
      { postId: post3.id, authorId: educator.id, body: "Sleep is also one of the most studied recovery modalities — 40% faster glycogen replenishment after adequate sleep.", createdAt: daysAgo(5) },
      { postId: post4.id, authorId: coach.id, body: "Proud of you Marcus. Ready to move to a Build phase when you are.", createdAt: daysAgo(9) },
    ],
  });

  await prisma.forumLike.createMany({
    data: [
      { postId: post1.id, userId: sarah.id }, { postId: post1.id, userId: coach.id }, { postId: post1.id, userId: marcus.id },
      { postId: post2.id, userId: james.id }, { postId: post2.id, userId: coach.id },
      { postId: post3.id, userId: sarah.id }, { postId: post3.id, userId: james.id }, { postId: post3.id, userId: marcus.id }, { postId: post3.id, userId: educator.id },
      { postId: post4.id, userId: coach.id }, { postId: post4.id, userId: sarah.id },
    ],
  });
  console.log("✓ Forum: 4 posts, 6 replies, 11 likes");

  // ───────────────────────────────────────────────
  // EDUCATION VIDEOS
  // ───────────────────────────────────────────────
  await prisma.educationVideo.createMany({
    data: [
      { title: "Progressive Overload: The Science Behind Muscle Growth", description: "Evidence-based programming for sustainable strength gains", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", category: "Training", authorName: educator.name, authorId: educator.id, approved: true, views: 4821, duration: 1104 },
      { title: "Optimising Protein Intake for Body Recomposition", description: "How much, when, and what sources", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", category: "Nutrition", authorName: educator.name, authorId: educator.id, approved: true, views: 7342, duration: 1330 },
      { title: "Understanding Peptides: BPC-157 & TB-500", description: "Mechanisms of action and practical considerations", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", category: "Peptides", authorName: "Marcus Reid", approved: true, views: 3100, duration: 1865 },
      { title: "Sleep, Recovery and Performance", description: "Sleep hygiene protocols for athletes", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", category: "Recovery", authorName: educator.name, authorId: educator.id, approved: true, views: 5620, duration: 940 },
      { title: "Creatine & Beta-Alanine: Evidence-Based", description: "The two supplements with the most robust evidence", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", category: "Supplementation", authorName: "James Holloway", approved: true, views: 9100, duration: 775 },
      { title: "The Female Athlete: Hormones & Cycles", description: "Training around your cycle for better results", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", category: "Female Health", authorName: educator.name, authorId: educator.id, approved: true, views: 6230, duration: 1578 },
    ],
  });

  // ───────────────────────────────────────────────
  // RESEARCH PAPERS (some with pre-generated AI summaries)
  // ───────────────────────────────────────────────
  const creatineSummary = {
    keyFindings: [
      "3-5g/day creatine monohydrate raises muscle phosphocreatine by 20-40% within 4 weeks",
      "Loading phase (20g/day × 5 days) accelerates saturation but isn't required",
      "Improvements are most pronounced for high-intensity, short-duration efforts (<30s)",
    ],
    practicalApplications: [
      "Take 3-5g daily with any meal — timing doesn't materially matter",
      "Expect 1-2kg weight gain in the first month from intracellular water",
      "Combine with resistance training for strength and hypertrophy gains",
    ],
    methodology: "Meta-analysis of 28 RCTs across trained and untrained populations (n=1,421)",
    limitations: ["Most studies 12 weeks or less", "Long-term safety data strongest for monohydrate form only"],
    bottomLine: "Creatine monohydrate is the most well-researched and effective legal ergogenic aid for resistance-trained individuals. 3-5g daily is the optimal dose with no timing requirement.",
  };

  await prisma.researchPaper.createMany({
    data: [
      { title: "Protein timing on muscle protein synthesis: a systematic review", authors: ["Schoenfeld B", "Aragon A"], journal: "J Int Soc Sports Nutr", year: 2023, category: "Nutrition" },
      { title: "Progressive overload and satellite cell activation", authors: ["Damas F", "Phillips S"], journal: "Med Sci Sports Exerc", year: 2023, category: "Training" },
      { title: "BPC-157 and tendon healing: systematic review", authors: ["Petrov A", "Kim S"], journal: "Peptides Journal", year: 2022, category: "Peptides" },
      { title: "Creatine monohydrate: 30 years of research", authors: ["Kreider R"], journal: "Nutrients", year: 2024, category: "Supplementation", aiSummary: JSON.stringify(creatineSummary) },
      { title: "Menstrual cycle phase and strength performance", authors: ["Sims S"], journal: "Sports Med", year: 2024, category: "Female Health" },
      { title: "Sleep restriction and athletic recovery", authors: ["Walker M", "Dinges D"], journal: "Sports Medicine Reviews", year: 2024, category: "Recovery" },
    ],
  });

  // ───────────────────────────────────────────────
  // SERVICE PROVIDERS (Cape Town booking marketplace)
  // ───────────────────────────────────────────────
  const emma = await prisma.serviceProvider.create({
    data: { name: "Emma Clarke", type: "Sports Massage", description: "Specialist sports massage therapist for recovery and mobility.", price: 650, currency: "ZAR", rating: 4.9, reviewCount: 127, city: "Cape Town", suburb: "Sea Point", address: "Main Rd, Sea Point", latitude: -33.9180, longitude: 18.3830, nextAvailable: daysFromNow(2), verified: true },
  });
  const ryan = await prisma.serviceProvider.create({
    data: { name: "Ryan Posing Academy", type: "Posing Coach", description: "Competition prep posing coach — bodybuilding & physique.", price: 800, rating: 4.8, reviewCount: 89, city: "Cape Town", suburb: "Green Point", latitude: -33.9089, longitude: 18.4150, nextAvailable: daysFromNow(3), verified: true },
  });
  await prisma.serviceProvider.createMany({
    data: [
      { name: "Peak Recovery Studio", type: "Sports Massage", description: "Deep tissue, myofascial release, athlete recovery", price: 550, rating: 4.7, reviewCount: 204, city: "Cape Town", suburb: "Gardens", latitude: -33.9320, longitude: 18.4090, nextAvailable: daysFromNow(4), verified: true },
      { name: "Stage Ready Posing", type: "Posing Coach", description: "Stage-ready posing for IFBB and natural competitions", price: 950, rating: 5.0, reviewCount: 43, city: "Cape Town", suburb: "Claremont", latitude: -33.9810, longitude: 18.4640, nextAvailable: daysFromNow(5), verified: true },
      { name: "Biokineticist Connect", type: "Biokineticist", description: "Rehab and exercise prescription", price: 700, rating: 4.6, reviewCount: 68, city: "Cape Town", suburb: "Observatory", latitude: -33.9380, longitude: 18.4730, nextAvailable: daysFromNow(2), verified: false },
      { name: "Precision Physio", type: "Physiotherapist", description: "Sports injury rehabilitation and prevention", price: 750, rating: 4.8, reviewCount: 156, city: "Cape Town", suburb: "Rondebosch", latitude: -33.9570, longitude: 18.4750, nextAvailable: daysFromNow(1), verified: true },
    ],
  });

  // ───────────────────────────────────────────────
  // BOOKINGS (Sarah has an upcoming one)
  // ───────────────────────────────────────────────
  await prisma.booking.create({
    data: {
      userId: sarah.id, providerId: emma.id,
      scheduledFor: daysFromNow(2), status: "CONFIRMED",
      totalAmount: 650,
      notes: "Post-leg-day recovery session. Focus on hamstrings and glutes.",
    },
  });
  console.log("✓ Service providers (6) + 1 Sarah booking");

  console.log("\n══════════════════════════════════════");
  console.log("  Seed complete! Demo accounts:");
  console.log("══════════════════════════════════════");
  console.log("  Coach:    coach@biohacked.co.za    / password123");
  console.log("  Educator: educator@biohacked.co.za / password123");
  console.log("  Client:   sarah@example.com        / password123  (female, cut, loaded)");
  console.log("  Client:   james@example.com        / password123  (male, build)");
  console.log("  Client:   marcus@example.com       / password123  (free tier)");
  console.log("══════════════════════════════════════");
  console.log("  Sarah's account has: meal plan, training program, 7 check-ins");
  console.log("  with coach feedback, 3 training logs, 3 saved recipes,");
  console.log("  1 upcoming booking, body-measurement history.");
  console.log("══════════════════════════════════════\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
