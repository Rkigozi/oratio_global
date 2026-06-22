import { supabase } from "./supabase";

export async function uploadAvatar(file: File): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (error) return null;

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    return publicUrl;
  } catch {
    return null;
  }
}

export function getInitialAvatarUrl(username: string): string {
  const letter = username[0]?.toUpperCase() || "?";
  return `https://ui-avatars.com/api/?name=${letter}&background=7c8fff&color=fff&size=80&font-size=0.5`;
}
