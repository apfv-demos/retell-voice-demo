"use client";

export default function QuotaDisplay({
  used,
  max,
}: {
  used: number;
  max: number;
}) {
  const remaining = Math.max(0, max - used);
  const exhausted = remaining === 0;
  const pct = ((max - used) / max) * 100;

  if (exhausted) {
    return (
      <div className="w-48 flex flex-col items-center gap-2">
        <div className="w-full h-1 rounded-full bg-edge overflow-hidden">
          <div className="h-full w-0 rounded-full bg-danger" />
        </div>
        <p className="text-xs text-danger">
          Daily limit reached. Come back tomorrow.
        </p>
      </div>
    );
  }

  return (
    <div className="w-48 flex flex-col items-center gap-2">
      <div className="w-full h-1 rounded-full bg-edge overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted">
        {remaining} of {max} calls remaining
      </p>
    </div>
  );
}
