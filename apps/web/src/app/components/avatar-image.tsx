import { useMemo, useState } from 'react';
import type { MouseEventHandler } from 'react';

type AvatarImageProps = {
  src?: string | null;
  name: string;
  alt?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLElement>;
};

export function AvatarImage({ src, name, alt, className = '', onClick }: AvatarImageProps) {
  const displayName = name.trim() || 'User';
  const initial = useMemo(() => getInitial(displayName), [displayName]);
  const imageSrc = src?.trim() || '';

  const avatarClassName = `relative inline-flex items-center justify-center overflow-hidden rounded-full bg-accent/10 text-accent ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={avatarClassName}
        onClick={onClick}
        aria-label={alt || displayName}
      >
        <AvatarImageContent
          key={imageSrc || 'fallback'}
          alt={alt || displayName}
          imageSrc={imageSrc}
          initial={initial}
        />
      </button>
    );
  }

  return (
    <span className={avatarClassName} aria-label={alt || displayName}>
      <AvatarImageContent
        key={imageSrc || 'fallback'}
        alt={alt || displayName}
        imageSrc={imageSrc}
        initial={initial}
      />
    </span>
  );
}

function AvatarImageContent({
  alt,
  imageSrc,
  initial,
}: {
  alt: string;
  imageSrc: string;
  initial: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {(!imageSrc || failed || !loaded) && (
        <span className="select-none font-semibold uppercase leading-none">{initial}</span>
      )}
      {imageSrc && !failed && (
        <img
          src={imageSrc}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
}

function getInitial(name: string) {
  return name.replace(/^@/, '').trim()[0]?.toUpperCase() || '?';
}
