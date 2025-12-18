import { ArrowRight } from "lucide-react";
import Button from "../components/ui/Button";
import ProgressIndicator from "../components/ui/ProgressIndicator";
import { OBJECTIVES } from "../data/constants";
export default function ObjectiveSelection({
  setDraftObjective,
  setDraftCustomTitle,
  setDraftCustomTime,
  setDraftDurationUnit,
  setStep,
  draftObjective,
  draftCustomTitle,
  draftCustomTime,
  draftDurationUnit,
}) {
  return (
    <div className="pt-4 pb-24">
      {/* Animated content wrapper */}
      <div className="space-y-6 animate-slideUp">
        <ProgressIndicator currentStep={1} />
        <h2 className="text-2xl font-bold text-white mb-2">
          What are you committing to?
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {OBJECTIVES.map((obj) => (
            <button
              key={obj.id}
              onClick={() => {
                setDraftObjective(obj);
                setDraftCustomTitle("");
              }}
              className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                draftObjective?.id === obj.id
                  ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  : "bg-black/20 border-white/5 hover:border-white/20 text-gray-300"
              }`}
            >
              <span className="text-3xl">{obj.icon}</span>
              <span className="font-semibold text-sm">{obj.title}</span>
              <span className="text-xs opacity-60">
                {obj.defaultTime} Hours
              </span>
            </button>
          ))}
        </div>
        <div className="space-y-4 pt-6 mt-2 border-t border-white/10">
          <h3 className="text-emerald-200 text-sm font-semibold uppercase tracking-wider">
            Or make it personal...
          </h3>
          <input
            type="text"
            value={draftCustomTitle}
            onChange={(e) => {
              setDraftCustomTitle(e.target.value);
              setDraftObjective(null);
            }}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            placeholder="e.g., Run a 5K, Read for 1 hour..."
          />
          {!draftObjective && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
              <div className="text-gray-300 text-sm pl-2 whitespace-nowrap">
                Time limit:
              </div>
              <input
                type="number"
                min="1"
                value={draftCustomTime}
                onChange={(e) => setDraftCustomTime(e.target.value)}
                className="flex-1 bg-transparent py-1 px-2 text-white text-center font-mono font-bold focus:outline-none min-w-[50px]"
              />
              <div className="flex bg-black/40 rounded-lg p-1 flex-shrink-0">
                {["minutes", "hours", "days"].map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setDraftDurationUnit(unit)}
                    className={`px-2 py-1 text-[10px] rounded uppercase font-bold transition-colors ${
                      draftDurationUnit === unit
                        ? "bg-emerald-600 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {unit.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed button - outside animated wrapper */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent z-30">
        <Button
          onClick={() => setStep("staking")}
          disabled={!draftObjective && !draftCustomTitle}
          className="w-full max-w-md mx-auto"
        >
          Next <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
