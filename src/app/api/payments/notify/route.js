// ═══════════════════════════════════════════════════
// /api/payments/notify — PayFast ITN Callback
// This endpoint receives payment notifications from PayFast
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { validateITN, processPayment } from "@/lib/payfast";

export async function POST(request) {
  try {
    const body = Object.fromEntries(await request.formData());

    // Validate ITN
    const validation = await validateITN(body);
    if (!validation.valid) {
      console.error("PayFast ITN validation failed:", validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Process the payment
    await processPayment(body);

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("PayFast ITN error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
