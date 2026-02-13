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

  return (
    <div className="text-center">
      {exhausted ? (
        <p className="text-sm text-red-400">
          Daily limit reached. Please try again tomorrow.
        </p>
      ) : (
        <p className="text-sm text-neutral-400">
          <span className="font-medium text-neutral-200">{remaining}</span> of{" "}
          {max} calls remaining today
        </p>
      )}
    </div>
  );
}
