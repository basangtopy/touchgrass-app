import { toBlob } from "html-to-image";

/**
 * Captures a DOM element as an image and shares it using multiple fallback methods.
 * Fallback order: Farcaster Cast → Web Share API → Clipboard → Download
 *
 * @param {string} elementId - The ID of the DOM element to capture.
 * @param {string} title - The title for the share dialog.
 * @param {string} text - The text body for the share.
 * @param {Function} notify - Notification callback function.
 * @param {string} fileName - The filename for the image.
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
      backgroundColor: "#020617",
      pixelRatio: 2,
      style: { borderRadius: "3rem" },
      filter: (node) => !node.classList?.contains("no-share"),
    });

    if (!blob) {
      throw new Error("Failed to generate image blob");
    }

    // 2. Try Farcaster compose cast first if in mini app context
    if (miniAppShare) {
      // Share homepage URL since challenges are wallet-specific and can't be accessed by others
      const shareUrl = window.location.origin;
      const result = await miniAppShare(text, shareUrl, blob);
      if (result.success) {
        notify("Cast composed! 📣", "success");
        return;
      }
    }

    const file = new File([blob], fileName, { type: "image/png" });

    // ============================================
    // FALLBACK CHAIN (in order of preference)
    // ============================================

    // FALLBACK 1: Web Share API with file support (best UX on mobile)
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
        return;
      } catch (shareError) {
        // User cancelled - not a real failure
        if (shareError.name === "AbortError") {
          notify("Share cancelled", "info");
          return;
        }
        console.warn("Web Share failed:", shareError);
        // Continue to next fallback
      }
    }

    // FALLBACK 2: Copy image to clipboard
    if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
      try {
        // Check permission before attempting write
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({
              name: "clipboard-write",
            });
            if (permission.state === "denied") {
              console.warn("Clipboard write permission denied");
              throw new Error("Clipboard permission denied");
            }
          } catch (permError) {
            // Some browsers don't support clipboard-write permission query
            // Continue anyway and let the write attempt fail if needed
            console.debug("Permission query not supported:", permError);
          }
        }

        // Ensure blob has explicit PNG MIME type
        const pngBlob =
          blob.type === "image/png"
            ? blob
            : new Blob([blob], { type: "image/png" });

        // Attempt clipboard write
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);

        // Verify write actually worked by reading back
        try {
          const clipboardItems = await navigator.clipboard.read();
          if (!clipboardItems || clipboardItems.length === 0) {
            throw new Error("Clipboard appears empty after write");
          }
          // Check if image type exists in clipboard
          const hasImage = clipboardItems.some((item) =>
            item.types.includes("image/png")
          );
          if (!hasImage) {
            throw new Error("Image not found in clipboard after write");
          }
        } catch (readError) {
          // Read permission may not be available - this is okay
          // If we can't verify, we trust the write succeeded
          console.debug("Clipboard read for verification failed:", readError);
        }

        notify("Image copied! Open your Twitter/X and paste 📋", "success");
        return;
      } catch (clipboardError) {
        console.warn("Clipboard write failed:", clipboardError);
        // Continue to next fallback
      }
    }

    // FALLBACK 3: Programmatic download (final fallback)
    const link = document.createElement("a");
    const blobUrl = URL.createObjectURL(blob);
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL after a short delay to prevent memory leak
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    notify("Image downloaded – share it anywhere! 📥", "success");
  } catch (error) {
    console.error("Error sharing:", error);
    notify(`Share failed: ${error.message}`, "error");
    throw error;
  }
};
