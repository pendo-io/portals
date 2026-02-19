import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ThemeWrapper from "@/components/ThemeWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import PendoProvider from "@/components/PendoProvider";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import Index from "./pages/Index";
import CustomerEngagement from "./pages/CustomerEngagement";
import AskWill from "./pages/AskWill";
import AskWillReasoning from "./pages/AskWillReasoning";
import AskAce from "./pages/AskAce";
import AskRFP from "./pages/AskRFP";
import Users from "./pages/Users";
import Logs from "./pages/Logs";
import AuditLogs from "./pages/AuditLogs";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import CreateWorkflow from "./pages/CreateWorkflow";
import ManageWorkflows from "./pages/ManageWorkflows";
import Insights from "./pages/Insights";
import PublicWorkflow from "./pages/PublicWorkflow";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Meetings from "./pages/Meetings";
import MeetingDetail from "./pages/MeetingDetail";
import Settings from "./pages/Settings";
import Signals from "./pages/Signals";
import Home from "./pages/Home";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeWrapper>
      <TooltipProvider>
        <ImpersonationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PendoProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/api/auth/callback" element={<AuthCallback />} />
                <Route path="/public/workflow" element={<PublicWorkflow />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Home />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/accounts/:accountId" element={<AccountDetail />} />
                  <Route path="/signals" element={<Signals />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/contacts/:contactId" element={<ContactDetail />} />
                  <Route path="/workflows" element={<Index />} />
                  <Route path="/workflows/create" element={<CreateWorkflow />} />
                  <Route path="/workflows/manage" element={<ManageWorkflows />} />
                  <Route path="/customer-engagement" element={<CustomerEngagement />} />
                  <Route path="/will" element={<AskWill />} />
                  <Route path="/will-reasoning" element={<AskWillReasoning />} />
                  <Route path="/ask-ace" element={<AskAce />} />
                  <Route path="/ask-rfp" element={<AskRFP />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/meetings" element={<Meetings />} />
                  <Route path="/meetings/:meetingId" element={<MeetingDetail />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/meeting-analysis" element={<Navigate to="/meetings" replace />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PendoProvider>
          </BrowserRouter>
        </ImpersonationProvider>
      </TooltipProvider>
    </ThemeWrapper>
  </QueryClientProvider>
);

export default App;
