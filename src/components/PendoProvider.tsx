import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    pendo: any;
  }
}

const PENDO_API_KEY = "1f4bf4e4-c321-472a-8e35-207de5393272";

const PendoProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [sfdcOrgId, setSfdcOrgId] = useState<string | null>(null);

  // Initialize Pendo snippet
  useEffect(() => {
    if (window.pendo) return;

    (function(apiKey: string) {
      (function(p: any, e: any, n: any, d: any, o?: any) {
        let v: any, w: any, x: any, y: any, z: any;
        o = p[d] = p[d] || {};
        o._q = o._q || [];
        v = ['initialize', 'identify', 'updateOptions', 'pageLoad', 'track'];
        for (w = 0, x = v.length; w < x; ++w) {
          (function(m: any) {
            o[m] = o[m] || function() {
              o._q[m === v[0] ? 'unshift' : 'push']([m].concat([].slice.call(arguments, 0)));
            };
          })(v[w]);
        }
        y = e.createElement(n);
        y.async = true;
        y.src = 'https://cdn.pendo.io/agent/static/' + apiKey + '/pendo.js';
        z = e.getElementsByTagName(n)[0];
        z.parentNode.insertBefore(y, z);
      })(window, document, 'script', 'pendo');
    })(PENDO_API_KEY);
  }, []);

  // Load SFDC org ID from profile
  useEffect(() => {
    if (!user) return;
    const loadOrgId = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("salesforce_org_id")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setSfdcOrgId(data.salesforce_org_id || null);
      }
    };
    loadOrgId();
  }, [user]);

  // Initialize Pendo with user data when user is authenticated
  useEffect(() => {
    if (!window.pendo || !user) return;

    const visitorId = user.email || user.id;
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";

    window.pendo.initialize({
      visitor: {
        id: visitorId,
        email: user.email,
        full_name: fullName,
      },
      account: {
        id: sfdcOrgId || "unknown-org",
      },
    });
  }, [user, sfdcOrgId]);

  // Track page changes for SPA navigation
  useEffect(() => {
    if (window.pendo && typeof window.pendo.pageLoad === "function") {
      window.pendo.pageLoad();
    }
  }, [location.pathname]);

  return <>{children}</>;
};

export default PendoProvider;
