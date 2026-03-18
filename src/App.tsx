import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ThemeWrapper from "@/components/ThemeWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";
import PortalLayout from "@/components/portal/PortalLayout";
import { PortalProvider } from "@/contexts/PortalContext";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import PortalSelect from "./pages/PortalSelect";
import PartnerHome from "./pages/partner/PartnerHome";
import PartnerLeads from "./pages/partner/PartnerLeads";
import PartnerOpportunities from "./pages/partner/PartnerOpportunities";
import PartnerReferralForm from "./pages/partner/PartnerReferralForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeWrapper>
      <TooltipProvider>
        <PortalProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/api/auth/callback" element={<AuthCallback />} />

              {/* Portal Selection — requires login */}
              <Route path="/" element={<Navigate to="/portals" replace />} />
              <Route path="/portals" element={<ProtectedRoute><PortalSelect /></ProtectedRoute>} />

              {/* Partner Portal — requires login */}
              <Route element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
                <Route path="/portal/partner" element={<PartnerHome />} />
                <Route path="/portal/partner/leads" element={<PartnerLeads />} />
                <Route path="/portal/partner/opportunities" element={<PartnerOpportunities />} />
                <Route path="/portal/partner/referral" element={<PartnerReferralForm />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </PortalProvider>
      </TooltipProvider>
    </ThemeWrapper>
  </QueryClientProvider>
);

export default App;
