import { useState, useEffect } from "react";
import {
  Clock,
  AlertCircle,
  RotateCcw,
  Upload,
  RefreshCw,
  FileWarning,
  CircleCheckBig,
} from "lucide-react";
import Button from "../components/ui/Button";
import ProgressIndicator from "../components/ui/ProgressIndicator";
import { formatTimeRemaining, getProofExamples } from "../utils/helpers";
import {
  convertHeicToJpeg,
  convertPdfToJpeg,
  compressImage,
} from "../utils/imageProcessing";
import Loading from "../components/ui/Loading";
import { useParams, useNavigate } from "react-router-dom";

export default function Verify({
  challenges,
  currentTime,
  verificationStatus,
  handleUpload,
  retryVerification,
  setStep,
  showNotification,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeChallenge = challenges.find((c) => c.id === id);

  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  if (!activeChallenge) {
    return <Loading message="Fetching Challenge..." />;
  }

  // FETCH CLOUDINARY CREDENTIALS (from Env)
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsConverting(true);
    setImagePreview(null);
    setSelectedFile(null);

    try {
      let processedFile = file;
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();

      // 1. Detect & Convert
      if (fileType === "image/heic" || fileName.endsWith(".heic")) {
        processedFile = await convertHeicToJpeg(file, setStatusMessage);
      } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
        processedFile = await convertPdfToJpeg(file, setStatusMessage);
      }
      // RAW detection (Basic)
      else if (
        fileName.endsWith(".cr2") ||
        fileName.endsWith(".nef") ||
        fileName.endsWith(".arw")
      ) {
        showNotification(
          "RAW files are not fully supported in browser. Please use JPEG/PNG for best results.",
          "error"
        );
      }

      // 2. Set State
      setSelectedFile(processedFile);

      // 3. Create Preview
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(processedFile);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsConverting(false);
      setStatusMessage("");
    }
  };

  const examples = getProofExamples(activeChallenge);

  const handleServerVerify = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      // 1. COMPRESS
      setStatusMessage("Compressing Image...");
      const compressedBlob = await compressImage(selectedFile);

      // 2. Upload to Cloudinary
      setStatusMessage("Uploading to Cloud...");
      const formData = new FormData();
      formData.append("file", compressedBlob);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "touchgrass_proofs");

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      const cloudinaryData = await cloudinaryRes.json();

      if (!cloudinaryData.secure_url) {
        showNotification("Upload failed", "error");
        console.error("Cloudinary Error", cloudinaryData);
        throw new Error("Upload failed. Check Cloud Name/Preset.");
      }

      const imageUrl = cloudinaryData.secure_url;

      // 3. Send URL to Backend for AI
      setStatusMessage("Verifying with AI...");
      const API_URL = import.meta.env.VITE_API_URL;
      if (!API_URL) {
        throw new Error("VITE_API_URL environment variable is not set");
      }
      const response = await fetch(`${API_URL}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: activeChallenge.onChainId,
          title: activeChallenge.title,
          imageUrl: imageUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        handleUpload(id, true);
      } else {
        console.error("Verification Rejected:", data.message);
        handleUpload(id, false, data.message);
      }
    } catch (error) {
      console.error("Process Error:", error);
      handleUpload(id, false, "Connection or Upload Failed");
    } finally {
      setUploading(false);
      setStatusMessage("");
    }
  };

  const isExpired = currentTime > activeChallenge.targetTime;
  const isCompleted = currentTime > activeChallenge.completedAt;

  if (isExpired && !activeChallenge.isSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fadeIn relative z-10">
        <div className="bg-rose-500/20 p-6 rounded-full mb-4">
          <AlertCircle size={48} className="text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">⏰ Time's Up</h2>
        <p className="text-gray-300 text-sm mb-6">
          The clock ran out before you could verify. It happens!
        </p>
        <Button
          onClick={() => navigate(`/lost/${id}`)}
          variant="danger"
          className="w-full"
        >
          See What Happens Next
        </Button>
      </div>
    );
  }

  if (isCompleted && activeChallenge.isSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fadeIn relative z-10">
        <div className="bg-emerald-500/20 p-6 rounded-full mb-4">
          <CircleCheckBig size={48} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Already Verified! ✅
        </h2>
        <p className="text-gray-300 text-sm mb-6">
          Nice! You've already proven this one.
        </p>
        <Button
          onClick={() => navigate(`/result/${id}`)}
          variant="primary"
          className="w-full"
        >
          View Result
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-center items-center text-center space-y-1 animate-slideUp px-6 pt-4 relative z-10">
      <ProgressIndicator currentStep={4} />

      {/* Countdown timer - inline below progress indicator */}
      <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
        <Clock size={12} className="text-yellow-400" />
        <span className="font-mono text-xs text-yellow-100">
          {activeChallenge &&
            formatTimeRemaining(activeChallenge.targetTime, currentTime)}
        </span>
      </div>

      <div className="z-10 w-full flex flex-col items-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Show Us What You Did! 📸
        </h2>
        <p className="text-emerald-200/70 max-w-xs mx-auto mb-4">
          Upload a photo that proves you crushed your goal.
        </p>

        <div className="w-full max-w-xs mb-4">
          <p className="text-emerald-200/60 text-xs font-bold uppercase tracking-wider mb-3">
            Proof Ideas
          </p>
          <div className="grid grid-cols-2 gap-3">
            {examples.map((ex, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col items-center gap-2"
              >
                <span className="text-2xl">{ex.icon}</span>
                <div className="text-center">
                  <div className="text-emerald-100 text-xs font-bold">
                    {ex.label}
                  </div>
                  <div className="text-gray-500 text-[10px]">{ex.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="z-10 w-full flex flex-col items-center gap-3">
        {verificationStatus === "failed" ? (
          <div className="w-full max-w-xs p-6 pt-10 bg-red-900/20 aspect-square border border-red-500/50 rounded-3xl animate-shake z-10">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-200 mb-2">
              Hmm, That Didn't Work
            </h3>
            <p className="text-red-300/70 text-sm mb-6">
              Our AI couldn't verify this image. Try a clearer shot!
            </p>
            <Button
              onClick={retryVerification}
              variant="danger"
              className="w-full"
            >
              <RotateCcw size={18} /> Try Again
            </Button>
          </div>
        ) : (
          <>
            <div
              className={`w-full max-w-xs aspect-square border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden z-10 mb-2 ${
                verificationStatus === "verifying" || uploading || isConverting
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-emerald-500/30 bg-black/20 hover:bg-emerald-500/5 cursor-pointer group"
              }`}
            >
              {imagePreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={imagePreview}
                    alt="Proof"
                    className="w-full h-full object-cover"
                  />
                  {!(
                    verificationStatus === "verifying" ||
                    uploading ||
                    isConverting
                  ) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold">
                        Click to Change
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-emerald-500/10 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                    <Upload size={40} className="text-emerald-500" />
                  </div>
                  <span className="text-emerald-100 font-bold text-lg">
                    Tap to Upload Proof
                  </span>
                </>
              )}

              {(verificationStatus === "verifying" ||
                uploading ||
                isConverting) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/50 backdrop-blur-sm rounded-3xl">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-emerald-400 font-mono animate-pulse tracking-widest uppercase text-xs">
                    {statusMessage ||
                      (isConverting ? "CONVERTING..." : "PROCESSING...")}
                  </span>
                </div>
              )}

              <input
                type="file"
                accept="image/*,application/pdf,.heic"
                onChange={onFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-30"
                disabled={
                  uploading ||
                  verificationStatus === "verifying" ||
                  isConverting
                }
              />
            </div>

            {imagePreview &&
              verificationStatus !== "verifying" &&
              !uploading &&
              !isConverting && (
                <Button
                  onClick={handleServerVerify}
                  variant="primary"
                  className="w-full max-w-xs z-10 shadow-lg shadow-emerald-500/20"
                >
                  Submit for Verification
                </Button>
              )}
          </>
        )}

        {verificationStatus !== "verifying" && !uploading && !isConverting && (
          <Button
            onClick={() => navigate(`/active/${id}`)}
            variant="secondary"
            className="w-full max-w-xs z-10"
          >
            ← Go Back
          </Button>
        )}
      </div>
    </div>
  );
}
