import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSalesforce } from "@/hooks/useSalesforce";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { sfdcAccessToken, sfdcLoading, sfdcExpired } = useSalesforce();

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
};

export default ProtectedRoute;
