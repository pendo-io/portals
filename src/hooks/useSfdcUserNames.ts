import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId } from "@/lib/sfdc";
import { isDemoMode, getDemoUserNames } from "@/lib/demoData";

interface SfdcUser {
  Id: string;
  Name: string;
}

export function useSfdcUserNames(userIds: string[]) {
  const { user, session, impersonating } = useAuth();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const safeIds = uniqueIds.filter(isSafeSfdcId);
  const demo = isDemoMode(impersonating?.id);

  return useQuery({
    queryKey: ["sfdc-user-names", demo ? "demo" : safeIds.sort().join(",")],
    queryFn: async () => {
      if (demo) return getDemoUserNames(uniqueIds);
      if (safeIds.length === 0) return new Map<string, string>();

      const result = await sfdcQuery<SfdcUser>("user-names", { userIds: safeIds }, {
        accessToken: session?.access_token,
      });

      const map = new Map<string, string>();
      for (const u of result.records) {
        map.set(u.Id, u.Name);
      }
      return map;
    },
    enabled: !!user && (demo || safeIds.length > 0),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
