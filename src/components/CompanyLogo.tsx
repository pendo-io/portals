import { useState } from "react";

interface CompanyLogoProps {
  website: string | null | undefined;
  fallback: React.ReactNode;
  imgClassName?: string;
}

function extractDomain(website: string): string {
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

export function CompanyLogo({ website, fallback, imgClassName = "h-6 w-6 object-contain rounded" }: CompanyLogoProps) {
  const [usePendo, setUsePendo] = useState(false);
  const apiKey = import.meta.env.VITE_BRANDFETCH_KEY;

  if (!apiKey) return <>{fallback}</>;

  const domain = !website || usePendo ? "pendo.io" : extractDomain(website);
  const src = `https://cdn.brandfetch.io/${domain}/w/48/h/48?c=${apiKey}`;

  return (
    <img
      src={src}
      alt={domain}
      className={imgClassName}
      onError={() => setUsePendo(true)}
    />
  );
}
