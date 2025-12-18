// Conversion Libraries
import heic2any from "heic2any";
import * as pdfjsLib from "pdfjs-dist";

// Initialize PDF Worker (Required for pdfjs)
// Using CDN for the worker to avoid complex Vite configuration issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// --- CONVERSION HELPERS ---

export const convertHeicToJpeg = async (file, setStatusMessage) => {
  try {
    setStatusMessage("Converting HEIC...");
    const convertedBlob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.8,
    });
    // Handle case where heic2any returns array (multi-image heic)
    const blob = Array.isArray(convertedBlob)
      ? convertedBlob[0]
      : convertedBlob;
    return new File([blob], file.name.replace(/\.heic$/i, ".jpg"), {
      type: "image/jpeg",
    });
  } catch (e) {
    console.error("HEIC Conversion failed", e);
    throw new Error("Could not convert HEIC image.");
  }
};

export const convertPdfToJpeg = async (file, setStatusMessage) => {
  try {
    setStatusMessage("Processing PDF...");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1); // Get first page

    const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale for decent quality
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(
            new File([blob], file.name.replace(/\.pdf$/i, ".jpg"), {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        0.8
      );
    });
  } catch (e) {
    console.error("PDF Conversion failed", e);
    throw new Error("Could not process PDF file.");
  }
};

// Compression Helper (Same as before)
export const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1500;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      };
    };
  });
};
