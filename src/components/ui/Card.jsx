export default function Card({
  children,
  className = "",
  variant = "default",
}) {
  const variants = {
    default: "bg-black/40 border-white/10",
    success: "bg-emerald-900/20 border-emerald-500/30",
    danger: "bg-rose-900/20 border-rose-500/30",
    warning: "bg-amber-900/20 border-amber-500/30",
  };

  return (
    <div
      className={`backdrop-blur-xl border rounded-3xl p-5 shadow-2xl ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
