import { Info } from "lucide-react";

export default function Tooltip({ text }) {
  return (
    <div className="relative group inline-flex items-center">
      <Info
        size={14}
        className="text-emerald-400/70 cursor-help hover:text-emerald-300 transition-colors"
      />

      <div className="absolute bottom-full top-full right-0 mb-2 w-48 hidden group-hover:block z-50">
        <div className="bg-black/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl text-xs text-gray-300 leading-relaxed">
          {text}
        </div>
        {/* Triangle Pointer */}
        <div className="absolute top-full right-1 -mt-1 border-4 border-transparent border-t-black/90"></div>
      </div>
    </div>
  );
}
