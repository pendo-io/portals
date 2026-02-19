import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MessageSquare, LogOut, Users, FileText, ChevronDown, Shield, Plus, Settings, BarChart3, ExternalLink, Eye, EyeOff, ScrollText } from "lucide-react";
import { useTheme } from "next-themes";
import { useLocation, Link } from "react-router-dom";
import pendoLogo from "@/assets/pendo-logo-twitter.png";
import { useAuth } from "@/hooks/useAuth";
import QuestionDialog from "@/components/QuestionDialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Cache admin status in memory to prevent flicker on navigation
const adminStatusCache = new Map<string, boolean>();

const Header = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdminMode, toggleAdminMode, isImpersonating, impersonatedUser } = useImpersonation();
  
  // Initialize from cache to prevent flicker
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    if (user?.id && adminStatusCache.has(user.id)) {
      return adminStatusCache.get(user.id)!;
    }
    return false;
  });
  
  // Calculate userName directly from user - no state needed
  const userName = user 
    ? (user.user_metadata?.full_name?.split(' ')[0] || 
       user.user_metadata?.name?.split(' ')[0] || 
       user.email?.split('@')[0] || '')
    : '';

  // Check super admin status - only fetch if not cached
  useEffect(() => {
    if (!user?.id) {
      setIsSuperAdmin(false);
      return;
    }
    
    // If already cached, use cached value
    if (adminStatusCache.has(user.id)) {
      setIsSuperAdmin(adminStatusCache.get(user.id)!);
      return;
    }
    
    let cancelled = false;
    
    const checkSuperAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      
      if (!cancelled) {
        const isAdmin = !!data;
        adminStatusCache.set(user.id, isAdmin);
        setIsSuperAdmin(isAdmin);
      }
    };
    checkSuperAdmin();
    
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  const navLinkClass = (path: string) =>
    cn(
      "h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none",
      location.pathname === path
        ? "bg-secondary text-secondary-foreground"
        : "hover:bg-accent hover:text-accent-foreground"
    );

  return (
    <header className="w-full bg-card border-b border-border shadow-sm relative">
      <div className="max-w-7xl mx-auto px-6 py-4 relative z-10">
        <div className="flex items-center justify-between gap-4">
          {/* Pendo Logo, Title and Navigation grouped together */}
          <div className="flex items-center gap-3">
            <img src={pendoLogo} alt="Pendo logo" className="h-16 w-auto object-contain" />
            <h1 className="text-section-title text-foreground">GTM Hub</h1>
            
            {/* Navigation right after title */}
            <nav className="flex items-center gap-1 ml-1">
              <Link to="/accounts" className={navLinkClass("/accounts")}>
                Home
              </Link>
              <Link to="/workflows" className={navLinkClass("/workflows")}>
                Workflows
              </Link>
              <Link to="/meeting-analysis" className={navLinkClass("/meeting-analysis")}>
                Meeting Analysis
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={cn(
                      "h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none",
                      "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    Resources
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem asChild>
                    <a 
                      href="https://demohub.pendoexperience.io/" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Demo Hub
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isSuperAdmin && !isImpersonating && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className={cn(
                        "h-10 px-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none",
                        (location.pathname === "/users" || location.pathname === "/logs" || location.pathname === "/workflows/create" || location.pathname === "/insights" || location.pathname === "/audit-logs")
                          ? "bg-secondary text-secondary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Super Admin
                      {!isAdminMode && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                          User Mode
                        </Badge>
                      )}
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover w-56">
                    {/* Admin/User Mode Toggle */}
                    <DropdownMenuItem 
                      onClick={toggleAdminMode}
                      className="flex items-center cursor-pointer"
                    >
                      {isAdminMode ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Switch to User Mode
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Switch to Admin Mode
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/workflows/create" className="flex items-center cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Workflow
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/workflows/manage" className="flex items-center cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Workflows
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/users" className="flex items-center cursor-pointer">
                        <Users className="h-4 w-4 mr-2" />
                        Users
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/insights" className="flex items-center cursor-pointer">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Insights
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/logs" className="flex items-center cursor-pointer">
                        <FileText className="h-4 w-4 mr-2" />
                        Logs
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/audit-logs" className="flex items-center cursor-pointer">
                        <ScrollText className="h-4 w-4 mr-2" />
                        Audit Logs
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              className="text-foreground hover:text-primary"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            
            <Button variant="default" className="text-sm" onClick={() => setIsQuestionOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Need Help?
            </Button>
            
            {/* User name and sign out */}
            {userName && (
              <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border">
                <span className="text-sm font-medium text-foreground">
                  {userName}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSignOut} 
                  className="text-muted-foreground hover:text-destructive" 
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <QuestionDialog isOpen={isQuestionOpen} onClose={() => setIsQuestionOpen(false)} />
    </header>
  );
};

export default Header;