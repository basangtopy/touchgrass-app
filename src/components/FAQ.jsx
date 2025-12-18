import { HelpCircle } from "lucide-react";
import AccordionItem from "./AccordionItem";
import { FAQ_DATA } from "../data/constants";

export default function FAQ() {
  return (
    <div className="w-full max-w-sm mb-4">
      <h3 className="text-emerald-200 font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
        <HelpCircle size={16} /> Frequently Asked Questions
      </h3>
      <div className="bg-black/20 border border-white/10 rounded-2xl p-4">
        {FAQ_DATA.map((faq, index) => (
          <AccordionItem
            key={index}
            question={faq.question}
            answer={faq.answer}
          />
        ))}
      </div>
    </div>
  );
}
