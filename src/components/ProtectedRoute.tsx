import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSalesforce } from "@/hooks/useSalesforce";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { sfdcAccessToken, sfdcLoading, sfdcExpired } = useSalesforce();

  // In DEV_BYPASS mode, gate on SFDC session instead of Supabase
  if (DEV_BYPASS) {
    if (sfdcLoading) {
      return <div className="min-h-screen bg-background" />;
    }

    if (sfdcExpired) {
      return <Navigate to="/login?expired=true" replace />;
    }

    if (!sfdcAccessToken) {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  }

  // Production: require both Supabase auth and SFDC token
  if (authLoading || sfdcLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (sfdcExpired || !sfdcAccessToken) {
    return <Navigate to="/login?expired=true" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
