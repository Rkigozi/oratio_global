import { useState, type KeyboardEventHandler } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  hasError?: boolean;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  hasError = false,
  onKeyDown,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <div className="relative">
      <input
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl px-14 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border transition-colors text-center"
        style={{
          background: 'rgba(var(--rgb-surface), 0.6)',
          borderColor: hasError ? 'rgb(var(--rgb-danger))' : 'rgba(var(--rgb-accent), 0.12)',
        }}
      />
      <button
        type="button"
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((visible) => !visible)}
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-text-dim transition-colors hover:text-accent hover:bg-accent/6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 cursor-pointer"
      >
        <Icon size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
