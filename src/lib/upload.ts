import { supabase } from "./supabase";

export async function uploadAvatar(file: File): Promise<string | null> {
  // Try Supabase first (requires auth session)
  const user = await supabase.auth.getUser();
  if (user.data?.user) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.data.user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (!error) {
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      return urlData?.publicUrl || null;
    }
  }

  // Fallback: store as base64 data URL in localStorage
  try {
    return await fileToDataUrl(file);
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getInitialAvatarUrl(username: string): string {
  // Check localStorage for uploaded photo
  try {
    const raw = localStorage.getItem("oratio_profile");
    if (raw) {
      const profile = JSON.parse(raw) as { photo?: string; username?: string };
      if (profile.photo && profile.username === username) {
        return profile.photo;
      }
    }
  } catch {
    // ignore
  }
  const letter = username[0]?.toUpperCase() || "?";
  return `https://ui-avatars.com/api/?name=${letter}&background=7c8fff&color=fff&size=80&font-size=0.5`;
}
