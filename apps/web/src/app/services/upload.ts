import { supabase } from "./supabase";

export type UploadAvatarResult =
  | { url: string; error: null }
  | { url: null; error: string };

export type UploadAvatarStatus = "checking" | "converting" | "preparing" | "uploading";

type UploadAvatarOptions = {
  onStatusChange?: (status: UploadAvatarStatus) => void;
};

export const AVATAR_UPLOAD_TIMEOUT_MS = 20_000;

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_STORAGE_BYTES = 700 * 1024;
const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 512;
const BROWSER_FRIENDLY_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const HEIC_IMAGE_TYPES = new Set([
  "image/heic",
  "image/heif",
]);

export async function uploadAvatar(
  file: File,
  options: UploadAvatarOptions = {},
): Promise<UploadAvatarResult> {
  try {
    options.onStatusChange?.("checking");

    if (!isImageFile(file)) {
      return fail("Choose an image file to use as your profile photo.");
    }

    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      return fail("That photo is very large. Choose an image under 12 MB.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("Please sign in again before changing your photo.");

    options.onStatusChange?.(isHeicImageFile(file) ? "converting" : "preparing");
    const prepared = await prepareAvatarForUpload(file);
    if (prepared.error !== null) return fail(prepared.error);

    const uploadFile = prepared.file;
    const contentType = uploadFile.type || mimeTypeFromName(uploadFile.name) || "image/jpeg";
    const ext = extensionForMime(contentType, uploadFile.name);
    const path = `${user.id}/${Date.now()}.${ext}`;

    options.onStatusChange?.("uploading");
    const { error } = await withTimeout(
      supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, uploadFile, {
          cacheControl: "3600",
          contentType,
          upsert: true,
        }),
      AVATAR_UPLOAD_TIMEOUT_MS,
    );

    if (error) return fail(storageErrorMessage(error));

    const { data: { publicUrl } } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(path);

    return { url: publicUrl, error: null };
  } catch (error) {
    if (error instanceof Error && error.message === "Upload timed out") {
      return fail("Photo upload timed out. Check your connection and try again.");
    }
    return fail("We couldn't upload your photo. Please try again.");
  }
}

export function getInitialAvatarUrl(username: string): string {
  const letter = username[0]?.toUpperCase() || "?";
  return `https://ui-avatars.com/api/?name=${letter}&background=7c8fff&color=fff&size=80&font-size=0.5`;
}

type PreparedAvatarResult =
  | { file: File; error: null }
  | { file: null; error: string };

function fail(error: string): UploadAvatarResult {
  return { url: null, error };
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

function isHeicImageFile(file: File) {
  return HEIC_IMAGE_TYPES.has(file.type.toLowerCase()) || /\.(heic|heif)$/i.test(file.name);
}

async function prepareAvatarForUpload(file: File): Promise<PreparedAvatarResult> {
  let sourceFile = file;

  if (isHeicImageFile(file)) {
    const converted = await convertHeicToJpeg(file);
    if (converted.error !== null) return converted;
    sourceFile = converted.file;
  }

  const shouldConvert =
    sourceFile.size > MAX_AVATAR_STORAGE_BYTES ||
    !BROWSER_FRIENDLY_IMAGE_TYPES.has(sourceFile.type.toLowerCase());

  if (!shouldConvert) return { file: sourceFile, error: null };

  if (typeof document === "undefined" || typeof URL === "undefined") {
    return {
      file: null,
      error: "That photo is too large to upload. Try a cropped or smaller image.",
    };
  }

  try {
    const compressed = await compressImageToJpeg(sourceFile);
    if (compressed.size <= MAX_AVATAR_STORAGE_BYTES) {
      return { file: compressed, error: null };
    }

    return {
      file: null,
      error: "We couldn't shrink that photo enough. Try a cropped or smaller image.",
    };
  } catch {
    return {
      file: null,
      error: "We couldn't read that photo. Try a screenshot, JPEG, PNG, or WebP image instead.",
    };
  }
}

async function convertHeicToJpeg(file: File): Promise<PreparedAvatarResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      file: null,
      error: "That iPhone photo could not be converted here. Try a screenshot, JPEG, PNG, or WebP image instead.",
    };
  }

  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.82,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;

    if (!blob) {
      throw new Error("HEIC conversion did not return an image");
    }

    return { file: blobToFile(blob, file.name), error: null };
  } catch {
    return {
      file: null,
      error: "That iPhone photo could not be converted. Try a screenshot, JPEG, PNG, or WebP image instead.",
    };
  }
}

async function compressImageToJpeg(file: File): Promise<File> {
  const { image, objectUrl } = await loadImage(file);

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is not available");
    }

    const dimensions = getScaledDimensions(image.naturalWidth, image.naturalHeight);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

    const qualities = [0.78, 0.68, 0.58, 0.48];
    let smallestBlob: Blob | null = null;

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
      if (blob.size <= MAX_AVATAR_STORAGE_BYTES) {
        return blobToFile(blob, file.name);
      }
    }

    if (!smallestBlob) {
      throw new Error("Image compression failed");
    }

    return blobToFile(smallestBlob, file.name);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(file: File): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ image, objectUrl });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image could not be decoded"));
    };
    image.src = objectUrl;
  });
}

function getScaledDimensions(width: number, height: number) {
  const maxDimension = Math.max(width, height);
  if (maxDimension <= MAX_AVATAR_DIMENSION) return { width, height };

  const scale = MAX_AVATAR_DIMENSION / maxDimension;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas could not export the image"));
      },
      type,
      quality,
    );
  });
}

function blobToFile(blob: Blob, originalName: string) {
  const name = originalName.replace(/\.[^.]+$/, "") || "avatar";
  return new File([blob], `${name}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function extensionForMime(type: string, fileName: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";

  return fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

function mimeTypeFromName(fileName: string) {
  if (/\.png$/i.test(fileName)) return "image/png";
  if (/\.webp$/i.test(fileName)) return "image/webp";
  if (/\.gif$/i.test(fileName)) return "image/gif";
  if (/\.jpe?g$/i.test(fileName)) return "image/jpeg";
  return null;
}

function storageErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error && typeof error.message === "string"
        ? error.message
        : "";
  if (/too large|exceeded|payload|entity/i.test(message)) {
    return "That photo is still too large. Try a cropped or smaller image.";
  }
  if (/permission|policy|unauthori[sz]ed|forbidden|row-level security/i.test(message)) {
    return "We couldn't confirm permission to change your photo. Sign in again and try once more.";
  }
  return "We couldn't upload your photo. Please try again.";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Upload timed out"));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}
