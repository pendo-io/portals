import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ImpersonatedUser {
  id: string;
  email: string;
  full_name: string | null;
  salesforce_user_id?: string | null;
}

interface ImpersonationContextType {
  impersonatedUser: ImpersonatedUser | null;
  isImpersonating: boolean;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
  isAdminMode: boolean;
  toggleAdminMode: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(true);

  const startImpersonation = useCallback((user: ImpersonatedUser) => {
    setImpersonatedUser(user);
    // When impersonating, automatically switch to user mode
    setIsAdminMode(false);
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedUser(null);
    // When stopping impersonation, return to admin mode
    setIsAdminMode(true);
  }, []);

  const toggleAdminMode = useCallback(() => {
    setIsAdminMode(prev => !prev);
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUser,
        isImpersonating: !!impersonatedUser,
        startImpersonation,
        stopImpersonation,
        isAdminMode,
        toggleAdminMode,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
}
