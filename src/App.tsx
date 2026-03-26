import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ThemeWrapper from "@/components/ThemeWrapper";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import PortalLayout from "@/components/portal/PortalLayout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import PartnerHome from "./pages/partner/PartnerHome";
import PartnerLeads from "./pages/partner/PartnerLeads";
import PartnerOpportunities from "./pages/partner/PartnerOpportunities";
import PartnerReferralForm from "./pages/partner/PartnerReferralForm";
import LeadDetail from "./pages/partner/LeadDetail";
import OpportunityDetail from "./pages/partner/OpportunityDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCreateUser from "./pages/admin/AdminCreateUser";
import AdminPartners from "./pages/admin/AdminPartners";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeWrapper>
      <TooltipProvider>
        <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
              <Route path="/" element={<PartnerHome />} />
              <Route path="/leads" element={<PartnerLeads />} />
              <Route path="/leads/:leadId" element={<LeadDetail />} />
              <Route path="/opportunities" element={<PartnerOpportunities />} />
              <Route path="/opportunities/:oppId" element={<OpportunityDetail />} />
              <Route path="/referral" element={<PartnerReferralForm />} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/users/new" element={<AdminRoute><AdminCreateUser /></AdminRoute>} />
              <Route path="/admin/partners" element={<AdminRoute><AdminPartners /></AdminRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeWrapper>
  </QueryClientProvider>
);

export default App;
