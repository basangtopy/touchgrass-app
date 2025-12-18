export default function Loading({
  message = "Loading...",
  context = "default",
}) {
  // Contextual subtitles based on what's happening
  const getSubtitle = () => {
    switch (context) {
      case "starting":
        return "Creating your challenge on the blockchain...";
      case "verifying":
        return "Our AI is analyzing your proof...";
      case "withdrawing":
        return "Processing your withdrawal...";
      case "minting":
        return "Minting your victory NFT...";
      case "syncing":
        return "Syncing with the blockchain...";
      default:
        return "This won't take long...";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fadeIn">
      {/* Animated Spinner/Pulse */}
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Loading Text */}
      <h3 className="text-emerald-200 font-bold text-lg animate-pulse tracking-wide">
        {message}
      </h3>
      <p className="text-emerald-200/50 text-xs mt-1">{getSubtitle()}</p>
    </div>
  );
}
