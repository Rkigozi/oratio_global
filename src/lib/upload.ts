export async function uploadAvatar(file: File): Promise<string | null> {
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
  const letter = username[0]?.toUpperCase() || "?";
  return `https://ui-avatars.com/api/?name=${letter}&background=7c8fff&color=fff&size=80&font-size=0.5`;
}
