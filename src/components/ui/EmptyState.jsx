import { Leaf, Sparkles } from "lucide-react";
import Button from "./Button";

export default function EmptyState({
  title = "No challenges yet!",
  description = "Ready to prove something to yourself?",
  actionLabel = "Start Your First Challenge",
  onAction,
  icon: Icon = Leaf,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-6 animate-fadeIn">
      {/* Animated Icon Container */}
      <div className="relative mb-6">
        <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full animate-pulse"></div>
        <div className="relative bg-gradient-to-br from-emerald-500/20 to-green-900/20 w-24 h-24 rounded-3xl flex items-center justify-center ring-1 ring-white/10 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          <Icon size={48} className="text-emerald-400" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles size={20} className="text-yellow-400 animate-pulse" />
        </div>
      </div>

      {/* Text Content */}
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-emerald-200/60 text-sm max-w-xs mb-6 leading-relaxed">
        {description}
      </p>

      {/* CTA Button */}
      {onAction && (
        <Button
          onClick={onAction}
          variant="primary"
          className="shadow-lg shadow-emerald-500/20"
        >
          {actionLabel}
        </Button>
      )}

      {/* Decorative Elements */}
      <div className="mt-8 flex items-center gap-2 text-emerald-200/30 text-xs">
        <div className="w-8 h-px bg-gradient-to-r from-transparent to-emerald-500/30"></div>
        <span>Your journey starts here</span>
        <div className="w-8 h-px bg-gradient-to-l from-transparent to-emerald-500/30"></div>
      </div>
    </div>
  );
}
