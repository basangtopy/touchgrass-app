import { toBlob } from "html-to-image";
/**
 * Captures a DOM element as an image and shares it using the Web Share API.
 * Falls back to downloading the image if sharing is not supported.
 *
 * @param {string} elementId - The ID of the DOM element to capture.
 * @param {string} title - The title for the share dialog.
 * @param {string} text - The text body for the share.
 * @param {Function} notify - Notification callback function.
 * @param {string} fileName - The filename for the image (used in fallback download).
 * @param {Function} miniAppShare - Optional Farcaster share function from useMiniApp hook.
 */

export const handleShare = async (
  elementId,
  title,
  text,
  notify,
  fileName = "touchgrass_result.png",
  miniAppShare = null
) => {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with id '${elementId}' not found.`);
    return;
  }

  try {
    // 1. Convert DOM to Blob (PNG)
    const blob = await toBlob(element, {
      backgroundColor: "#020617", // Match app background (slate-950) to avoid transparency issues
      pixelRatio: 2,
      style: {
        borderRadius: "3rem",
      }, // Optional: reset border radius if needed for capture
      filter: (node) => !node.classList?.contains("no-share"),
    });

    if (!blob) {
      throw new Error("Failed to generate image blob");
    }

    // 2. Try Farcaster compose cast first if in mini app context
    if (miniAppShare) {
      const shareUrl = window.location.href;
      // Pass blob so it can be uploaded and embedded in the cast
      const result = await miniAppShare(text, shareUrl, blob);
      if (result.success) {
        notify("Cast composed! 📣", "success");
        return;
      }
    }

    const file = new File([blob], fileName, { type: "image/png" });

    // 3. Use Web Share API if available and supports files
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          title: title,
          text: text,
          files: [file],
        });
        notify("Shared successfully!", "success");
      } catch (shareError) {
        // If user cancels share, it throws an error. We catch it here.
        notify(`Share cancelled or failed: ${shareError}`, "error");
      }
    } else {
      // 4. Fallback: Download the image
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify("Downloaded image – share it anywhere!", "success");
    }
  } catch (error) {
    console.error("Error sharing:", error);
    // You might want to throw this error up to the UI to show a notification
    notify(`${error}`, "error");
    throw error;
  }
};
