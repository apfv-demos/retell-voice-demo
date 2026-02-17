"use client";

export default function BlobAnimation({
  isActive,
  isTalking,
}: {
  isActive: boolean;
  isTalking: boolean;
}) {
  const state = isActive && isTalking
    ? "speaking"
    : isActive
    ? "listening"
    : "idle";

  return (
    <div className="relative flex items-center justify-center h-72">
      <div className="blob-glow" data-state={state} />
      <div className="blob-core" data-state={state} />
    </div>
  );
}
