/**
 * Image upload utility for sharing screenshots in Farcaster casts.
 * Uses Cloudinary's unsigned upload for client-side uploads.
 *
 * Setup required:
 * 1. Create a Cloudinary account at https://cloudinary.com
 * 2. Get your Cloud Name from the dashboard
 * 3. Create an unsigned upload preset:
 *    - Go to Settings > Upload > Upload presets
 *    - Click "Add upload preset"
 *    - Set "Signing Mode" to "Unsigned"
 *    - Optionally set folder to "touchgrass-shares"
 *    - Save and copy the preset name
 * 4. Add to your .env:
 *    VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads an image blob to Cloudinary and returns the public URL.
 *
 * @param {Blob} blob - The image blob to upload
 * @param {string} fileName - Optional filename for the upload
 * @returns {Promise<string>} - The public URL of the uploaded image
 * @throws {Error} - If upload fails or Cloudinary is not configured
 */
export const uploadImageToCloudinary = async (
  blob,
  fileName = "touchgrass_share.png"
) => {
  // Check if Cloudinary is configured
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.warn(
      "Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env"
    );
    throw new Error("Image hosting not configured");
  }

  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "touchgrass-shares");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Cloudinary upload failed:", errorData);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

/**
 * Check if Cloudinary is configured
 * @returns {boolean}
 */
export const isCloudinaryConfigured = () => {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
};
