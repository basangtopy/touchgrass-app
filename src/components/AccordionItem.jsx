import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
export default function AccordionItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-4 text-left focus:outline-none"
      >
        <span className="text-emerald-100 font-semibold text-sm pr-4">
          {question}
        </span>
        {isOpen ? (
          <ChevronUp size={16} className="text-emerald-500" />
        ) : (
          <ChevronDown size={16} className="text-gray-500" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-48 opacity-100 pb-4" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-gray-300 text-xs leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}
