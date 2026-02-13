"use client";

export default function BlobAnimation({
  isActive,
  isTalking,
}: {
  isActive: boolean;
  isTalking: boolean;
}) {
  let sizeClasses = "w-32 h-32";
  let colorClasses = "bg-neutral-700";
  let animationClass = "";

  if (isActive && isTalking) {
    sizeClasses = "w-40 h-40";
    colorClasses = "bg-gradient-to-br from-blue-500 to-purple-600";
    animationClass = "animate-[blob-talking_0.8s_ease-in-out_infinite]";
  } else if (isActive) {
    sizeClasses = "w-36 h-36";
    colorClasses = "bg-gradient-to-br from-blue-500 to-purple-600";
    animationClass = "animate-[blob-idle_4s_ease-in-out_infinite]";
  }

  return (
    <div className="flex items-center justify-center py-8">
      <div
        className={`
          ${sizeClasses} ${colorClasses} ${animationClass}
          rounded-full shadow-lg shadow-purple-500/20
          transition-all duration-500 ease-in-out
        `}
      />
    </div>
  );
}
