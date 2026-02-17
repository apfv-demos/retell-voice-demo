"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import BlobAnimation from "./BlobAnimation";
import QuotaDisplay from "./QuotaDisplay";

const maxCallsPerDay = parseInt(
  process.env.NEXT_PUBLIC_MAX_CALLS_PER_DAY || "5",
  10
);
const maxDuration = parseInt(
  process.env.NEXT_PUBLIC_MAX_CALL_DURATION_SECONDS || "120",
  10
);
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

type CallStatus = "idle" | "connecting" | "active" | "ending";

export default function CallControls({
  initialCallCount,
}: {
  initialCallCount: number;
}) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isTalking, setIsTalking] = useState(false);
  const [callsUsed, setCallsUsed] = useState(initialCallCount);
  const [timeRemaining, setTimeRemaining] = useState(maxDuration);
  const [error, setError] = useState<string | null>(null);

  const retellClientRef = useRef<RetellWebClient | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isActive = callStatus === "active";
  const quotaExhausted = callsUsed >= maxCallsPerDay;

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTalking(false);
    setTimeRemaining(maxDuration);
  }, []);

  useEffect(() => {
    const client = new RetellWebClient();

    client.on("call_started", () => {
      setCallStatus("active");
      setError(null);
    });

    client.on("call_ended", () => {
      setCallStatus("idle");
      setCallsUsed((prev) => prev + 1);
      cleanup();
    });

    client.on("agent_start_talking", () => {
      setIsTalking(true);
    });

    client.on("agent_stop_talking", () => {
      setIsTalking(false);
    });

    client.on("error", (err) => {
      console.error("Retell error:", err);
      setError("Call error occurred. Please try again.");
      setCallStatus("idle");
      cleanup();
    });

    retellClientRef.current = client;

    return () => {
      client.stopCall();
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (callStatus === "active") {
      setTimeRemaining(maxDuration);
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            retellClientRef.current?.stopCall();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus]);

  const startCall = async () => {
    setError(null);
    setCallStatus("connecting");

    try {
      let recaptchaToken: string | undefined;
      if (recaptchaSiteKey && window.grecaptcha) {
        recaptchaToken = await window.grecaptcha.execute(recaptchaSiteKey, {
          action: "start_call",
        });
      }

      const response = await fetch("/api/start-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recaptchaToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start call");
      }

      const { access_token } = await response.json();

      await retellClientRef.current!.startCall({
        accessToken: access_token,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start call";
      setError(message);
      setCallStatus("idle");
    }
  };

  const stopCall = () => {
    setCallStatus("ending");
    retellClientRef.current?.stopCall();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <BlobAnimation isActive={isActive} isTalking={isTalking} />

      {isActive && (
        <div className="w-48 flex flex-col items-center gap-2">
          <div className="w-full h-1 rounded-full bg-edge overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${(timeRemaining / maxDuration) * 100}%`,
                backgroundColor: timeRemaining <= 15 ? "var(--color-danger)" : "var(--color-accent)",
              }}
            />
          </div>
          <p className="text-xs tabular-nums text-muted tracking-widest">
            {formatTime(timeRemaining)}
          </p>
        </div>
      )}

      {error && (
        <p className="max-w-sm text-center text-sm text-danger">{error}</p>
      )}

      {callStatus === "idle" && !quotaExhausted && (
        <button
          onClick={startCall}
          className="rounded-full bg-accent px-10 py-3 text-sm font-medium text-ground transition-all hover:bg-accent-light active:scale-[0.97]"
        >
          Start Call
        </button>
      )}

      {callStatus === "connecting" && (
        <button
          disabled
          className="rounded-full bg-accent/60 px-10 py-3 text-sm font-medium text-ground animate-pulse"
        >
          Connecting...
        </button>
      )}

      {(callStatus === "active" || callStatus === "ending") && (
        <button
          onClick={stopCall}
          disabled={callStatus === "ending"}
          className="rounded-full border border-danger/40 bg-danger/10 px-10 py-3 text-sm font-medium text-danger transition-all hover:bg-danger/20 active:scale-[0.97] disabled:opacity-50"
        >
          {callStatus === "ending" ? "Ending..." : "End Call"}
        </button>
      )}

      <QuotaDisplay used={callsUsed} max={maxCallsPerDay} />
    </div>
  );
}
