import { createClient, createServiceClient } from "@/lib/supabase/server";
import { retellClient } from "@/lib/retell";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify reCAPTCHA token
    const body = await request.json();
    const { recaptchaToken } = body;

    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return NextResponse.json(
          { error: "reCAPTCHA token required" },
          { status: 400 }
        );
      }

      const recaptchaResult = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed" },
          { status: 403 }
        );
      }
    }

    // 3. Check quota
    const maxCallsPerDay = parseInt(
      process.env.NEXT_PUBLIC_MAX_CALLS_PER_DAY || "5",
      10
    );

    const serviceClient = createServiceClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await serviceClient
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("started_at", today.toISOString());

    if ((count ?? 0) >= maxCallsPerDay) {
      return NextResponse.json(
        { error: "Daily call limit reached" },
        { status: 429 }
      );
    }

    // 4. Check global spending limit (kill switch)
    const maxSpend = parseFloat(process.env.MAX_SPEND_DOLLARS || "0");
    if (maxSpend > 0) {
      const agentId = process.env.RETELL_AGENT_ID || "";
      const calls = await retellClient.call.list({
        filter_criteria: {
          agent_id: [agentId],
        },
        limit: 1000,
      });

      const totalSpendCents = calls.reduce(
        (sum, call) => sum + (call.call_cost?.combined_cost ?? 0),
        0
      );
      const totalSpendDollars = totalSpendCents / 100;

      if (totalSpendDollars >= maxSpend) {
        return NextResponse.json(
          { error: "Demo paused — spending limit reached", code: "SPEND_LIMIT" },
          { status: 403 }
        );
      }
    }

    // 5. Create Retell web call
    const webCall = await retellClient.call.createWebCall({
      agent_id: process.env.RETELL_AGENT_ID || "",
    });

    // 6. Log the call
    await serviceClient.from("call_logs").insert({
      user_id: user.id,
      user_email: user.email,
      retell_call_id: webCall.call_id,
      status: "initiated",
    });

    // 7. Return access token to client
    return NextResponse.json({
      access_token: webCall.access_token,
      call_id: webCall.call_id,
    });
  } catch (error) {
    console.error("Error starting call:", error);
    return NextResponse.json(
      { error: "Failed to start call" },
      { status: 500 }
    );
  }
}
