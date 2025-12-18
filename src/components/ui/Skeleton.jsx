// Skeleton Loader Component
// Use for loading states instead of spinners for smoother perceived performance

function SkeletonBase({
  variant = "text", // "text" | "circle" | "card" | "button"
  width,
  height,
  className = "",
}) {
  const baseClass =
    "animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] animate-shimmer";

  const variants = {
    text: "h-4 rounded",
    circle: "rounded-full",
    card: "rounded-2xl",
    button: "h-12 rounded-xl",
    avatar: "w-10 h-10 rounded-full",
  };

  const style = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${baseClass} ${variants[variant]} ${className}`}
      style={style}
    />
  );
}

// Preset skeleton layouts for common use cases
export function ChallengeCardSkeleton() {
  return (
    <div className="w-full p-4 rounded-2xl border border-white/10 bg-black/20 animate-fadeIn">
      <div className="flex items-center gap-3">
        <SkeletonBase variant="circle" width={10} height={10} />
        <div className="flex-1 space-y-2">
          <SkeletonBase variant="text" width="70%" height={16} />
          <SkeletonBase variant="text" width="45%" height={12} />
        </div>
      </div>
    </div>
  );
}

export function ChallengeListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <ChallengeCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-4 animate-fadeIn">
      <SkeletonBase variant="text" width="50%" height={32} className="mb-4" />
      <SkeletonBase variant="card" width="100%" height={120} />
      <SkeletonBase variant="card" width="100%" height={180} />
      <SkeletonBase variant="button" width="100%" />
    </div>
  );
}

export default SkeletonBase;
