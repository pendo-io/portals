import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type PortalType = "partner" | "oem" | "japan" | null;

interface PortalContextType {
  portal: PortalType;
  setPortal: (portal: PortalType) => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [portal, setPortalState] = useState<PortalType>(() => {
    return (localStorage.getItem("portal_type") as PortalType) || null;
  });

  const setPortal = (p: PortalType) => {
    setPortalState(p);
    if (p) {
      localStorage.setItem("portal_type", p);
    } else {
      localStorage.removeItem("portal_type");
    }
  };

  return (
    <PortalContext.Provider value={{ portal, setPortal }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortal must be used within a PortalProvider");
  }
  return context;
}
