// Browser-only: downscale/re-encode a photo before sending it to an AI
// import action, so uploads stay fast and cheap regardless of the original
// camera resolution.

export type CompressedImage = { base64: string; mediaType: string };

const MAX_DIMENSION = 1568; // plenty for reading text off a schedule/roster photo
const JPEG_QUALITY = 0.85;
const RAW_FALLBACK_LIMIT = 8 * 1024 * 1024; // 8MB, if canvas re-encoding isn't available

export async function compressImageFile(file: File): Promise<CompressedImage> {
  try {
    return await resizeViaCanvas(file);
  } catch {
    // Formats canvas can't decode (e.g. some HEIC photos): fall back to the
    // original bytes, within a hard size cap.
    if (file.size > RAW_FALLBACK_LIMIT) {
      throw new Error(
        "Couldn't process that photo — try a JPEG or PNG, or a smaller image."
      );
    }
    const base64 = await fileToBase64(file);
    return { base64, mediaType: file.type || "image/jpeg" };
  }
}

function resizeViaCanvas(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      const base64 = dataUrl.split(",")[1];
      if (!base64) return reject(new Error("Failed to encode image"));
      resolve({ base64, mediaType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.split(",")[1];
      if (!base64) return reject(new Error("Failed to read file"));
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
