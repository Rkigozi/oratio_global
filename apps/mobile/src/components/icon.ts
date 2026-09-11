import type { ComponentType } from 'react';

export type NativeIcon = ComponentType<{
  color?: string;
  fill?: string;
  size?: string | number;
  strokeWidth?: number;
}>;

// Lucide's peer type resolves too narrowly with Expo 57's pinned SVG patch.
export function asNativeIcon(icon: unknown): NativeIcon {
  return icon as NativeIcon;
}
