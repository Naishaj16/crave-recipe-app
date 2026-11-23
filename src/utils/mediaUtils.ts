const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Resizes large images (e.g. 4000px down to max 1200px) and applies JPEG compression.
 * Typical reduction: 5MB -> ~150KB-200KB.
 */
export const compressImage = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<File> => {
  return new Promise((resolve) => {
    // If not an image or SVG/GIF, return as is
    if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
};

/**
 * Uploads a photo or video to backend /api/upload.
 * Compresses photos before uploading.
 * Returns the hosted media URL.
 */
export const uploadMediaFile = async (
  file: File,
  onProgress?: (status: string) => void
): Promise<string> => {
  let fileToUpload = file;

  if (file.type.startsWith("image/")) {
    onProgress?.("Compressing image...");
    fileToUpload = await compressImage(file);
  } else if (file.type.startsWith("video/")) {
    onProgress?.("Preparing video upload...");
  }

  const formData = new FormData();
  formData.append("file", fileToUpload);

  onProgress?.("Uploading to Crave media server...");

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to upload file");
  }

  const data = await response.json();
  return data.url;
};

