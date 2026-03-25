import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ThemeWrapper from "@/components/ThemeWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalRedirect from "@/components/PortalRedirect";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import PartnerHome from "./pages/partner/PartnerHome";
import PartnerLeads from "./pages/partner/PartnerLeads";
import PartnerOpportunities from "./pages/partner/PartnerOpportunities";
import PartnerReferralForm from "./pages/partner/PartnerReferralForm";
import LeadDetail from "./pages/partner/LeadDetail";
import OpportunityDetail from "./pages/partner/OpportunityDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPartners from "./pages/admin/AdminPartners";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeWrapper>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Redirect root to user's portal based on partner type */}
            <Route path="/" element={<PortalRedirect />} />

            {/* All portal types share the same layout and pages */}
            <Route element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
              <Route path="/portal/:portalType" element={<PartnerHome />} />
              <Route path="/portal/:portalType/leads" element={<PartnerLeads />} />
              <Route path="/portal/:portalType/leads/:leadId" element={<LeadDetail />} />
              <Route path="/portal/:portalType/opportunities" element={<PartnerOpportunities />} />
              <Route path="/portal/:portalType/opportunities/:oppId" element={<OpportunityDetail />} />
              <Route path="/portal/:portalType/referral" element={<PartnerReferralForm />} />
              <Route path="/portal/:portalType/admin/users" element={<AdminUsers />} />
              <Route path="/portal/:portalType/admin/partners" element={<AdminPartners />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeWrapper>
  </QueryClientProvider>
);

export default App;
