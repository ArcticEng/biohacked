// ═══════════════════════════════════════════════════
// Database Seed — Demo Data for Development
// ═══════════════════════════════════════════════════

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Bio-Hacked database...\n");

  // Clean
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

  // ── USERS ──
  const coach = await prisma.user.create({
    data: {
      email: "coach@biohacked.co.za", passwordHash: hash,
      name: "Coach Alex Thompson", role: "COACH", tier: "COACH",
      gender: "MALE", age: 34, speciality: "Bodybuilding & Nutrition",
      verified: true, calories: 2600, protein: 200, carbs: 280, fat: 80,
    },
  });
  console.log("✓ Coach:", coach.email);

  const educator = await prisma.user.create({
    data: {
      email: "educator@biohacked.co.za", passwordHash: hash,
      name: "Dr. Lauren Price", role: "EDUCATOR", tier: "PREMIUM",
      gender: "FEMALE", age: 38, credentials: "PhD Sports Science, CSCS",
      speciality: "Exercise Physiology & Female Athletics", verified: true,
    },
  });
  console.log("✓ Educator:", educator.email);

  const sarah = await prisma.user.create({
    data: {
      email: "sarah@example.com", passwordHash: hash,
      name: "Sarah Mitchell", role: "CLIENT", tier: "PREMIUM",
      gender: "FEMALE", age: 27, goal: "CUT",
      height: 165, bodyFat: 22,
      calories: 1800, protein: 150, carbs: 180, fat: 60,
      allowMealSwap: true,
      cycleLength: 28,
      lastCycleStart: new Date(Date.now() - 7 * 86400000),
    },
  });

  const james = await prisma.user.create({
    data: {
      email: "james@example.com", passwordHash: hash,
      name: "James Carter", role: "CLIENT", tier: "PREMIUM",
      gender: "MALE", age: 31, goal: "BUILD",
      height: 180, bodyFat: 16,
      calories: 2800, protein: 220, carbs: 300, fat: 80,
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
  console.log("✓ Clients:", [sarah.email, james.email, marcus.email].join(", "));

  // ── COACH-CLIENT ──
  await prisma.coachClient.createMany({
    data: [
      { coachId: coach.id, clientId: sarah.id },
      { coachId: coach.id, clientId: james.id },
      { coachId: coach.id, clientId: marcus.id },
    ],
  });

  // ── COACHING NOTES TIMELINE ──
  await prisma.coachingNote.createMany({
    data: [
      { coachId: coach.id, clientId: sarah.id, content: "Week 1 check-in. Starting stats locked. Macro targets set. Client motivated." },
      { coachId: coach.id, clientId: sarah.id, content: "Good week — down 0.8kg. Maintained lifts. Increased steps goal to 10,000." },
      { coachId: coach.id, clientId: sarah.id, content: "Increased cardio 3x to 4x/week. Energy holding. Digestion improved since removing dairy." },
    ],
  });

  // ── CHECKINS (with full enriched fields) ──
  const makeCheckins = async (userId, baseWeight, isFemale) => {
    for (let i = 6; i >= 0; i--) {
      const dayOffset = i * 86400000;
      const weight = +(baseWeight - (i * 0.15) + ((i * 37 % 7) * 0.05)).toFixed(1);
      await prisma.checkin.create({
        data: {
          userId,
          date: new Date(Date.now() - dayOffset),
          status: i === 0 ? "PENDING" : "REVIEWED",
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
          trainingStatus: ["progress", "maintain", "progress", "maintain", "progress"][i % 5],
          supplements: ["Creatine", "Whey Protein", "Vitamin D", "Omega 3"],
          generalNotes: i === 0 ? "Feeling strong this week. Training performance up. Energy steady." : null,
        },
      });
    }
  };
  await makeCheckins(sarah.id, 68.2, true);
  await makeCheckins(james.id, 85.4, false);
  console.log("✓ Check-ins with full metrics");

  // ── BODY MEASUREMENTS ──
  await prisma.bodyMeasurement.create({
    data: { userId: sarah.id, arms: 28, shoulders: 98, back: 86, waist: 68, hips: 96, glutes: 94, quads: 52 },
  });
  await prisma.bodyMeasurement.create({
    data: { userId: james.id, arms: 38, shoulders: 122, back: 108, waist: 82, glutes: 98, quads: 62 },
  });

  // ── TRAINING PROGRAM (Sarah: Physique Shred Phase 2) ──
  await prisma.trainingProgram.create({
    data: {
      name: "Physique Shred — Phase 2", createdById: coach.id, assignedTo: sarah.id,
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
  });
  console.log("✓ Training program");

  // ── SUBSCRIPTIONS ──
  await prisma.subscription.createMany({
    data: [
      { userId: coach.id, tier: "COACH", active: true },
      { userId: sarah.id, tier: "PREMIUM", active: true },
      { userId: james.id, tier: "PREMIUM", active: true },
      { userId: educator.id, tier: "PREMIUM", active: true },
    ],
  });

  // ── FORUM POSTS ──
  await prisma.forumPost.createMany({
    data: [
      { authorId: james.id, title: "Finally hit a new PB on deadlift — 180kg!", body: "Four years of consistent training. Stoked with this.", tags: ["training"] },
      { authorId: sarah.id, title: "Pre-workout nutrition makes a huge difference", body: "Anyone notice a huge difference when you nail pre-workout nutrition? Switched from fasted to carbs 90 mins before — pump is insane.", tags: ["nutrition"] },
      { authorId: coach.id, title: "Sleep is the most underrated performance enhancer", body: "Reminder: 8 hours beats any supplement stack. Prioritise it.", tags: ["recovery"] },
      { authorId: marcus.id, title: "12-week transformation — Bio-Hacked meal tool worked", body: "92kg at 24% BF to 84kg at 15%. The AI meal plan tool kept me on track.", tags: ["transformation"] },
    ],
  });

  // ── EDUCATION VIDEOS ──
  await prisma.educationVideo.createMany({
    data: [
      { title: "Progressive Overload: The Science Behind Muscle Growth", description: "Evidence-based programming for sustainable strength gains", videoUrl: "#", category: "Training", authorName: educator.name, authorId: educator.id, approved: true, views: 4821, duration: 1104 },
      { title: "Optimising Protein Intake for Body Recomposition", description: "How much, when, and what sources", videoUrl: "#", category: "Nutrition", authorName: educator.name, authorId: educator.id, approved: true, views: 7342, duration: 1330 },
      { title: "Understanding Peptides: BPC-157 & TB-500", description: "Mechanisms of action and practical considerations", videoUrl: "#", category: "Peptides", authorName: "Marcus Reid", approved: true, views: 3100, duration: 1865 },
      { title: "Sleep, Recovery and Performance", description: "Sleep hygiene protocols for athletes", videoUrl: "#", category: "Recovery", authorName: educator.name, authorId: educator.id, approved: true, views: 5620, duration: 940 },
      { title: "Creatine & Beta-Alanine: Evidence-Based", description: "The two supplements with the most robust evidence", videoUrl: "#", category: "Supplementation", authorName: "James Holloway", approved: true, views: 9100, duration: 775 },
      { title: "The Female Athlete: Hormones & Cycles", description: "Training around your cycle for better results", videoUrl: "#", category: "Female Health", authorName: educator.name, authorId: educator.id, approved: true, views: 6230, duration: 1578 },
    ],
  });

  // ── RESEARCH PAPERS ──
  await prisma.researchPaper.createMany({
    data: [
      { title: "Protein timing on muscle protein synthesis: a systematic review", authors: ["Schoenfeld B", "Aragon A"], journal: "J Int Soc Sports Nutr", year: 2023, category: "nutrition" },
      { title: "Progressive overload and satellite cell activation", authors: ["Damas F", "Phillips S"], journal: "Med Sci Sports Exerc", year: 2023, category: "training" },
      { title: "BPC-157 and tendon healing: systematic review", authors: ["Petrov A", "Kim S"], journal: "Peptides Journal", year: 2022, category: "peds" },
      { title: "Creatine monohydrate: 30 years of research", authors: ["Kreider R"], journal: "Nutrients", year: 2024, category: "supplementation" },
      { title: "Menstrual cycle phase and strength performance", authors: ["Sims S"], journal: "Sports Med", year: 2024, category: "female-health" },
    ],
  });

  // ── SERVICE PROVIDERS (Booking Marketplace) ──
  await prisma.serviceProvider.createMany({
    data: [
      { name: "Emma Clarke", type: "Sports Massage", description: "Specialist sports massage therapist for recovery and mobility", price: 650, currency: "ZAR", rating: 4.9, reviewCount: 127, city: "Cape Town", suburb: "Sea Point", address: "Main Rd, Sea Point", latitude: -33.9180, longitude: 18.3830, nextAvailable: new Date(Date.now() + 2 * 86400000), verified: true },
      { name: "Ryan Posing Academy", type: "Posing Coach", description: "Competition prep posing coach — bodybuilding & physique", price: 800, rating: 4.8, reviewCount: 89, city: "Cape Town", suburb: "Green Point", latitude: -33.9089, longitude: 18.4150, nextAvailable: new Date(Date.now() + 3 * 86400000), verified: true },
      { name: "Peak Recovery Studio", type: "Sports Massage", description: "Deep tissue, myofascial release, athlete recovery", price: 550, rating: 4.7, reviewCount: 204, city: "Cape Town", suburb: "Gardens", latitude: -33.9320, longitude: 18.4090, nextAvailable: new Date(Date.now() + 4 * 86400000), verified: true },
      { name: "Stage Ready Posing", type: "Posing Coach", description: "Stage-ready posing for IFBB and natural competitions", price: 950, rating: 5.0, reviewCount: 43, city: "Cape Town", suburb: "Claremont", latitude: -33.9810, longitude: 18.4640, nextAvailable: new Date(Date.now() + 5 * 86400000), verified: true },
      { name: "Biokineticist Connect", type: "Biokineticist", description: "Rehab and exercise prescription", price: 700, rating: 4.6, reviewCount: 68, city: "Cape Town", suburb: "Observatory", latitude: -33.9380, longitude: 18.4730, nextAvailable: new Date(Date.now() + 2 * 86400000), verified: false },
      { name: "Precision Physio", type: "Physiotherapist", description: "Sports injury rehabilitation and prevention", price: 750, rating: 4.8, reviewCount: 156, city: "Cape Town", suburb: "Rondebosch", latitude: -33.9570, longitude: 18.4750, nextAvailable: new Date(Date.now() + 1 * 86400000), verified: true },
    ],
  });
  console.log("✓ Service providers (booking marketplace)");

  console.log("\n══════════════════════════════════════");
  console.log("  Seed complete! Demo accounts:");
  console.log("══════════════════════════════════════");
  console.log("  Coach:    coach@biohacked.co.za    / password123");
  console.log("  Educator: educator@biohacked.co.za / password123");
  console.log("  Client:   sarah@example.com        / password123  (female, cut)");
  console.log("  Client:   james@example.com        / password123  (male, build)");
  console.log("  Client:   marcus@example.com       / password123  (free tier)");
  console.log("══════════════════════════════════════\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
