# Bio-Hacked — Coach Feedback Spec (v2)

Organized from coach notes. Each item tagged with priority and complexity.

---

## 1. MEAL PLANS — Coach Controls Everything

### Current behaviour
- Coach clicks "Generate AI meal plan" → creates a plan with just macros shown
- Client can view plan, do AI swaps, and edit meals directly

### Required changes

**[P1] Coach: Full meal plan view under client drill-down**
- Show the actual meals (name, time, foods, macros per meal) — not just the macro summary
- Coach can edit any individual meal inline
- Coach can add/remove meals from an existing plan
- Coach can manually set calories + macros before generating
- "New plan" lives under the client's Program tab (or a dedicated Meal Plan tab)
- Coach uses AI to generate, then tweaks meal-by-meal

**[P1] Client: View-only meal plan**
- Client sees full meal plan (same rich layout as coach)
- Client CANNOT edit meals — edit button removed
- AI swap button only visible if coach has enabled `allowMealSwap`
- Protein & calories from the current meal plan auto-populate into daily check-in

**Layout reference (coach mentioned):**
Each meal shown as a card:
```
┌─ Breakfast · 7:00 AM ─────────────────┐
│ Greek yoghurt (0%) .......... 200g    │
│ Mixed berries ............... 100g    │
│ Oats ....................... 50g     │
│                                       │
│ 330 kcal · 28P · 38C · 5F           │
│                          [Edit] [🗑]  │
└───────────────────────────────────────┘
```

---

## 2. CHECK-INS — Weekly Coach Review, Daily Client Logging

### Current behaviour
- Client submits daily check-ins, each one goes to coach individually
- Coach reviews and gives feedback per check-in

### Required changes

**[P1] Client: Daily logging, weekly submission**
- Client fills in data EVERY DAY (weight, calories, protein, supplements, notes)
- Calories & protein auto-populated from meal plan (editable if off-plan)
- Supplements list managed by coach (client sees checkboxes, not free-text)
- ONE designated "photo day" per week (set by coach, e.g. Monday)
- On photo day, front/side/back photos are REQUIRED before submit
- Pressing "Submit weekly check-in" bundles the entire week's data and sends to coach
- Until submitted, coach sees nothing (client is drafting)

**[P1] Coach: Weekly review with period reference**
- Coach sees weekly bundles: "Cut — Week 3 (7–13 Apr)"
- Opens to see all 7 days of data in a summary table
- Photos displayed in a comparison strip (front/side/back)
- Body measurements shown with delta from previous week
- Single feedback field for the whole week

**[P2] Coach feedback: Video/voice recording**
- "Record feedback" button next to text field
- Records via browser MediaRecorder API (audio or video)
- Uploads to Supabase Storage
- Client sees playback inline on their check-in review

**[P1] Both styles: Menstrual cycle + period day logging**
- Both Detailed and Lifestyle check-in styles include a "Period today?" toggle
- Logs which days the client is on their period
- Feeds into the cycle tracker on Progress page (more accurate than estimate)

---

## 3. SUPPLEMENTS — Coach-Managed

### Current behaviour
- Client types supplement names manually (free-text array)

### Required changes

**[P1] Coach assigns supplements per client**
- Coach portal → client → new "Supplements" section (or in Overview)
- Coach adds supplement names + optional dosage/timing
- e.g. "Creatine — 5g daily", "Vitamin D — 2000IU morning"

**[P1] Client check-in shows coach's supplement list as checkboxes**
- Client ticks which ones they took today
- Can't add their own (or optionally: "Other" free-text field)

---

## 4. PROGRESS PAGE — Visible to Coach

### Current behaviour
- Only visible to the client (weight chart, measurements, cycle tracker)

### Required changes

**[P1] Coach can see client's Progress page**
- Coach → client drill-down → new "Progress" tab (6th tab)
- Shows same content: weight trend, energy/sleep/stress, body measurements with deltas, cycle tracker
- Read-only for coach

---

## 5. TRAINING — Session Notes

### Current behaviour
- Training log has a `notes` field on the overall session but it's at the top

### Required changes

**[P2] Post-session notes prompt**
- After logging the last set, show a "Session notes" textarea
- "How did the session feel? Any PBs or issues?"
- Saves to the existing `notes` field on TrainingLog

---

## 6. PHOTOS — HD Quality

### Current behaviour
- Upload endpoint caps at 8 MB, accepts PNG/JPG/WEBP/GIF

### Required changes

**[P2] Allow larger photos for HD**
- Increase upload cap to 15-20 MB
- Consider client-side compression (e.g. browser-image-compression) to balance quality vs storage cost
- Supabase free tier = 1 GB storage, so ~65 photos at 15 MB each before hitting limit

---

## Implementation Order

### Phase 1 — Demo-critical (send to coach for review)
1. Meal plan: full display on coach + client side, coach-only editing
2. Check-in: auto-populate macros from meal plan
3. Check-in: supplements as coach-managed checkboxes
4. Progress tab visible to coach
5. Period day logging on both check-in styles

### Phase 2 — Polish
6. Weekly check-in bundling (daily drafts → weekly submit)
7. Photo day designation (coach sets which day)
8. Video/voice feedback recording
9. HD photo uploads + client-side compression
10. Session notes prompt at end of training log

---

## Schema Changes Required

```prisma
// New: Coach-assigned supplements per client
model ClientSupplement {
  id        String   @id @default(uuid())
  coachId   String
  clientId  String
  name      String   // "Creatine"
  dosage    String?  // "5g daily"
  timing    String?  // "Post-workout"
  active    Boolean  @default(true)
  order     Int      @default(0)
  createdAt DateTime @default(now())

  @@index([clientId])
  @@unique([coachId, clientId, name])
}

// Modify Checkin: add period tracking
model Checkin {
  // ... existing fields ...
  periodDay     Boolean  @default(false)  // "Am I on my period today?"

  // Auto-populated from meal plan
  planCalories  Int?     // What the meal plan prescribes
  planProtein   Float?   // What the meal plan prescribes
  // calories & protein fields = what client actually ate

  // Supplement compliance (JSON array of { name, taken: bool })
  supplementLog Json?
}

// Modify MealPlan: link to coach + week reference
model MealPlan {
  // ... existing fields ...
  weekLabel    String?  // "Cut — Week 3"
  weekStart    DateTime?
  weekEnd      DateTime?
  createdById  String?  // coach who created it
}
```
