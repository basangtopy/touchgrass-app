import { ShieldCheck, Zap, Target, Heart, Eye } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Put Your Money Where Your Goals Are",
    description:
      "Lock funds in a smart contract. Hit your goal, get them back. Miss it? Face the music.",
  },
  {
    icon: Zap,
    title: "AI Proof Checker",
    description:
      "Snap a photo, upload it, and our AI will verify your win in seconds.",
  },
  {
    icon: Target,
    title: "Real Stakes, Real Results",
    description:
      "Miss your goal? Your stake goes to charity, gets burned, or stays locked. Your choice.",
  },
  {
    icon: Heart,
    title: "Failure Funds Good",
    description:
      "If you slip up, your stake helps fund public health initiatives. Even failure does good.",
  },
  {
    icon: Eye,
    title: "100% Transparent",
    description:
      "Every transaction, donation, and penalty is visible on-chain. No hidden fees, no tricks.",
  },
];

export default function HomeInfo() {
  return (
    <div className="w-full max-w-sm mb-8">
      {/* Section header */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-emerald-500/50"></div>
        <h2 className="text-emerald-400 text-xs font-bold uppercase tracking-widest">
          How It Works
        </h2>
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-emerald-500/50"></div>
      </div>

      {/* Feature list */}
      <div className="space-y-2">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-emerald-500/20 transition-all duration-200"
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <feature.icon size={24} className="text-emerald-400" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-emerald-100 text-sm font-semibold leading-tight">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-xs leading-snug mt-0.5">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
