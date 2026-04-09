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

type Stage = "company" | "pendo" | "fallback";

export function CompanyLogo({ website, fallback, imgClassName = "h-10 w-10 object-contain rounded-xl" }: CompanyLogoProps) {
  const [stage, setStage] = useState<Stage>(website ? "company" : "pendo");
  const apiKey = import.meta.env.VITE_BRANDFETCH_KEY;

  if (!apiKey || stage === "fallback") return <>{fallback}</>;

  const domain = stage === "pendo" ? "pendo.com" : extractDomain(website!);
  const src = `https://cdn.brandfetch.io/${domain}/w/48/h/48?c=${apiKey}`;

  return (
    <img
      src={src}
      alt={domain}
      className={imgClassName}
      onError={() => setStage(stage === "company" ? "pendo" : "fallback")}
    />
  );
}
