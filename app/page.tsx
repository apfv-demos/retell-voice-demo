import { createClient } from "@/lib/supabase/server";
import AuthButton from "@/components/AuthButton";
import CallControls from "@/components/CallControls";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Voice Agent Demo";
const appDescription =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Talk to our AI agent!";
const maxCallsPerDay = parseInt(
  process.env.NEXT_PUBLIC_MAX_CALLS_PER_DAY || "5",
  10
);
const maxDuration = parseInt(
  process.env.NEXT_PUBLIC_MAX_CALL_DURATION_SECONDS || "120",
  10
);

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get today's call count for the authenticated user
  let callCount = 0;
  if (user) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("started_at", today.toISOString());

    callCount = count ?? 0;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8 text-center">
        {/* Hero */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">{appName}</h1>
          <p className="text-lg text-neutral-400">{appDescription}</p>
        </div>

        {!user ? (
          <>
            {/* Usage info for unauthenticated users */}
            <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <p className="text-sm text-neutral-400">
                Sign in with Google to try the demo. Each user gets{" "}
                <span className="font-medium text-neutral-200">
                  {maxCallsPerDay} calls per day
                </span>
                , up to{" "}
                <span className="font-medium text-neutral-200">
                  {Math.floor(maxDuration / 60)} minutes
                </span>{" "}
                each.
              </p>
            </div>

            <AuthButton user={null} />
          </>
        ) : (
          <>
            {/* Authenticated: show call UI */}
            <div className="flex justify-end">
              <AuthButton user={user} />
            </div>

            <CallControls initialCallCount={callCount} />
          </>
        )}
      </div>
    </main>
  );
}
