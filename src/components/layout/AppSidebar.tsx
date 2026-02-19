import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  Building2,
  Contact2,
  Video,
  Radio,
  MessageSquare,
  Users,
  BarChart3,
  FileText,
  ScrollText,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  Workflow,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";

const adminStatusCache = new Map<string, boolean>();

export function AppSidebar() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { isImpersonating } = useImpersonation();

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    if (user?.id && adminStatusCache.has(user.id)) {
      return adminStatusCache.get(user.id)!;
    }
    return false;
  });

  useEffect(() => {
    if (!user?.id) {
      setIsSuperAdmin(false);
      return;
    }
    if (adminStatusCache.has(user.id)) {
      setIsSuperAdmin(adminStatusCache.get(user.id)!);
      return;
    }

    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      if (!cancelled) {
        const isAdmin = !!data;
        adminStatusCache.set(user.id, isAdmin);
        setIsSuperAdmin(isAdmin);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleSignOut = async () => {
    localStorage.removeItem("sfdc_dev_session");
    await signOut();
    window.location.href = "/login?logout=true";
  };

  const isActive = (path: string) =>
    (path === "/" && location.pathname === "/") ||
    (path !== "/" && location.pathname === path) ||
    (path === "/accounts" && location.pathname.startsWith("/accounts")) ||
    (path === "/contacts" && location.pathname.startsWith("/contacts")) ||
    (path === "/signals" && location.pathname === "/signals") ||
    (path === "/meetings" && location.pathname.startsWith("/meetings")) ||
    (path === "/workflows/manage" && location.pathname.startsWith("/workflows/manage"));

  const showAdmin = isSuperAdmin && !isImpersonating;

  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-3 pb-4">
        {/* Expanded: logo + hamburger */}
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <Link to="/" className="flex items-center justify-center w-5 h-5">
            <img src="/logo.png" alt="Pendo" className="w-5 h-5 min-w-5 min-h-5" />
          </Link>
          <button
            onClick={toggleSidebar}
            className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
        {/* Collapsed: hamburger only */}
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* HOME */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Home">
                  <Link to="/">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* WORKSPACE */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/accounts")} tooltip="Accounts">
                  <Link to="/accounts">
                    <Building2 className="h-4 w-4" />
                    <span>Accounts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/contacts")} tooltip="Contacts">
                  <Link to="/contacts">
                    <Contact2 className="h-4 w-4" />
                    <span>Contacts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/signals")} tooltip="Signals">
                  <Link to="/signals">
                    <Radio className="h-4 w-4" />
                    <span>Signals</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/meetings")} tooltip="Meetings">
                  <Link to="/meetings">
                    <Video className="h-4 w-4" />
                    <span>Meetings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* TOOLS */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/workflows")} tooltip="Workflows">
                  <Link to="/workflows">
                    <Workflow className="h-4 w-4" />
                    <span>Workflows</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/will")} tooltip="Ask Will">
                  <Link to="/will">
                    <MessageSquare className="h-4 w-4" />
                    <span>Ask Will</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ADMIN */}
        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/users")} tooltip="Users">
                    <Link to="/users">
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/insights")} tooltip="Insights">
                    <Link to="/insights">
                      <BarChart3 className="h-4 w-4" />
                      <span>Insights</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/workflows/manage")} tooltip="Manage Workflows">
                    <Link to="/workflows/manage">
                      <Settings className="h-4 w-4" />
                      <span>Manage Workflows</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/logs")} tooltip="Logs">
                    <Link to="/logs">
                      <FileText className="h-4 w-4" />
                      <span>Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/audit-logs")} tooltip="Audit Logs">
                    <Link to="/audit-logs">
                      <ScrollText className="h-4 w-4" />
                      <span>Audit Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        {/* Expanded: left-aligned icons */}
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-0.5 px-1 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${location.pathname === "/settings" ? "text-foreground" : "text-muted-foreground"}`}
              title="Settings"
              asChild
            >
              <Link to="/settings">
                <Settings className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Collapsed: vertical stack of icons */}
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle theme</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${location.pathname === "/settings" ? "text-foreground" : "text-muted-foreground"}`}
                asChild
              >
                <Link to="/settings">
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
