import { useState, useEffect } from "react";

const SIZES = {
  sm: "h-6 w-6 text-xs",
  lg: "h-8 w-8 text-sm",
} as const;

interface AccountLogoProps {
  domain: string | null;
  name: string;
  size: keyof typeof SIZES;
}

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

function isValidDomain(d: string | null): d is string {
  return typeof d === "string" && DOMAIN_RE.test(d.trim());
}

const INITIAL_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-orange-600",
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length];
}

export function AccountLogo({ domain, name, size }: AccountLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass = SIZES[size];
  const initial = name.charAt(0).toUpperCase();

  useEffect(() => {
    setImgFailed(false);
  }, [domain]);

  const fallback = (
    <span
      className={`${sizeClass} rounded-full ${getColorForName(name)} flex items-center justify-center font-semibold text-white shrink-0`}
    >
      {initial}
    </span>
  );

  if (isValidDomain(domain) && !imgFailed) {
    return (
      <span className={`${sizeClass} relative shrink-0`}>
        {fallback}
        <img
          src={`https://cdn.brandfetch.io/domain/${domain.trim()}?c=1idY9IzoSo2SC8vKsKw`}
          alt=""
          className="absolute inset-0 h-full w-full rounded-full object-contain"
          loading="lazy"
          onError={() => setImgFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth === 0) setImgFailed(true);
          }}
        />
      </span>
    );
  }

  return fallback;
}
