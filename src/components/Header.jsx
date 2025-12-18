import { Leaf, ChevronLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Header({
  setVerificationStatus,
  walletConnected,
  HeaderConnectButton,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const goBack = () => {
    const path = location.pathname;
    if (path === "/staking") navigate("/objective");
    else if (path.startsWith("/verify")) {
      setVerificationStatus("idle");
      const id = path.split("/")[2];
      navigate(`/active/${id}`);
    } else navigate("/");
  };

  const showBackButton = location.pathname !== "/";

  return (
    <header className="flex-shrink-0 px-6 py-4 flex items-center justify-between z-20 bg-black/20 border-b border-white/5 backdrop-blur-md">
      <div className="flex">
        {showBackButton && (
          <button
            onClick={goBack}
            className="mr-2 text-gray-300 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <div className="flex items-center gap-2">
          <Leaf className="text-emerald-500 w-5 h-5" />
          <span className="font-black text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">
            TOUCHGRASS
          </span>
        </div>
      </div>

      {walletConnected ? HeaderConnectButton : <div className="w-8"></div>}
    </header>
  );
}
