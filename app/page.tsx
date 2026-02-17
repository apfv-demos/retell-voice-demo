import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import AuthButton from "@/components/AuthButton";
import CallControls from "@/components/CallControls";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Amplify Voice Demo";
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

  const durationLabel =
    maxDuration >= 60
      ? `${Math.floor(maxDuration / 60)}:${(maxDuration % 60).toString().padStart(2, "0")}`
      : `${maxDuration}s`;

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
      {user ? (
        <>
          <div className="fixed top-6 right-6 z-20">
            <AuthButton user={user} />
          </div>

          <div className="fixed top-5 left-6 z-20">
            <Image
              src="/logo.png"
              alt="Amplify Voice"
              width={120}
              height={48}
              className="rounded-lg"
            />
          </div>

          <div className="w-full max-w-md text-center">
            <h1 className="font-display text-3xl tracking-tight mb-2 text-accent-light">
              {appName}
            </h1>
            <p className="text-sm text-muted mb-8">{appDescription}</p>
            <CallControls initialCallCount={callCount} />
          </div>
        </>
      ) : (
        <div className="w-full max-w-lg text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Amplify Voice"
              width={160}
              height={64}
              className="rounded-xl"
            />
          </div>

          <h1 className="font-display text-5xl tracking-tight leading-tight mb-4 text-accent-light">
            {appName}
          </h1>
          <p className="text-lg text-muted mb-10">{appDescription}</p>

          <div className="relative rounded-2xl border border-edge bg-surface/60 p-8 mb-8 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            <p className="text-sm text-muted leading-relaxed">
              Sign in to try the demo. Each user gets{" "}
              <span className="font-medium text-primary">
                {maxCallsPerDay} calls per day
              </span>
              , up to{" "}
              <span className="font-medium text-primary">{durationLabel}</span>{" "}
              each.
            </p>
          </div>

          <AuthButton user={null} />
        </div>
      )}
    </main>
  );
}
