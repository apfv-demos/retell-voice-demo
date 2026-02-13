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

  // Initialize Retell client once
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

  // Countdown timer
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
      // Get reCAPTCHA token (if configured)
      let recaptchaToken: string | undefined;
      if (recaptchaSiteKey && window.grecaptcha) {
        recaptchaToken = await window.grecaptcha.execute(recaptchaSiteKey, {
          action: "start_call",
        });
      }

      // Call our API to create the web call
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

      // Start the Retell web call (must happen within 30s of token creation)
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
    <div className="flex flex-col items-center gap-6">
      <BlobAnimation isActive={isActive} isTalking={isTalking} />

      {isActive && (
        <p className="text-sm tabular-nums text-neutral-400">
          {formatTime(timeRemaining)} remaining
        </p>
      )}

      {error && (
        <p className="max-w-sm text-center text-sm text-red-400">{error}</p>
      )}

      {callStatus === "idle" && !quotaExhausted && (
        <button
          onClick={startCall}
          className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 font-medium text-white transition-transform hover:scale-105 active:scale-95"
        >
          Start Call
        </button>
      )}

      {callStatus === "connecting" && (
        <button
          disabled
          className="rounded-full bg-neutral-700 px-8 py-3 font-medium text-neutral-400"
        >
          Connecting...
        </button>
      )}

      {(callStatus === "active" || callStatus === "ending") && (
        <button
          onClick={stopCall}
          disabled={callStatus === "ending"}
          className="rounded-full bg-red-600 px-8 py-3 font-medium text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {callStatus === "ending" ? "Ending..." : "End Call"}
        </button>
      )}

      <QuotaDisplay used={callsUsed} max={maxCallsPerDay} />
    </div>
  );
}
