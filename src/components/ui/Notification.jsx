import { useEffect, useState, useRef } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import haptic from "../../utils/haptic";

export default function Notification({ message, type, onClose }) {
  const [visible, setVisible] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const onCloseRef = useRef(onClose);

  // Keep the ref updated with the latest prop function
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // 1. Start Enter Animation immediately
    const enter = requestAnimationFrame(() => {
      setVisible(true);
      // Add bounce for success, shake for error
      setAnimationClass(
        type === "success" ? "animate-bounce-once" : "animate-shake"
      );
      // Trigger haptic feedback on mobile
      if (type === "success") {
        haptic.success();
      } else {
        haptic.error();
      }
    });

    // Remove animation class after it plays
    const animationTimer = setTimeout(() => {
      setAnimationClass("");
    }, 600);

    // 2. Schedule Exit Animation (Slide out) at 4.5s
    const exitTimer = setTimeout(() => {
      setVisible(false);
    }, 4500);

    // 3. Schedule Unmount (Remove from DOM) at 5.0s
    const closeTimer = setTimeout(() => {
      if (onCloseRef.current) onCloseRef.current();
    }, 5000);

    // Cleanup timers if component unmounts early
    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(animationTimer);
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, []); // Empty dependency array ensures this ONLY runs once on mount

  const handleManualClose = () => {
    setVisible(false);
    setTimeout(() => {
      if (onCloseRef.current) onCloseRef.current();
    }, 300);
  };

  const isSuccess = type === "success";

  return (
    <div
      className={`fixed top-6 right-6 z-[100] flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md 
        transition-all duration-500 ease-out transform origin-right
        ${
          visible
            ? "translate-x-0 opacity-100 scale-100"
            : "translate-x-full opacity-0 scale-95"
        }
        ${animationClass}
        ${
          isSuccess
            ? "bg-emerald-900/90 border-emerald-500/50 text-emerald-100"
            : "bg-rose-900/90 border-rose-500/50 text-rose-100"
        }
        max-w-xs sm:max-w-sm pointer-events-auto`}
    >
      {/* Animated icon */}
      <div
        className={`mt-0.5 ${
          isSuccess ? "text-emerald-400" : "text-rose-400"
        } ${
          visible ? "scale-100" : "scale-0"
        } transition-transform duration-300 delay-100`}
      >
        {isSuccess ? <CheckCircle size={20} /> : <XCircle size={20} />}
      </div>

      <div className="flex-1 text-sm font-medium pr-2">{message}</div>

      <button
        onClick={handleManualClose}
        className={`p-1 rounded-full hover:bg-white/10 transition-colors ${
          isSuccess ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        <X size={16} />
      </button>
    </div>
  );
}
