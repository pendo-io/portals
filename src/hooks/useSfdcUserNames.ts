import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId } from "@/lib/sfdc";

interface SfdcUser {
  Id: string;
  Name: string;
}

export function useSfdcUserNames(userIds: string[]) {
  const { user, session } = useAuth();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  return useQuery({
    queryKey: ["sfdc-user-names", uniqueIds.sort().join(",")],
    queryFn: async () => {
      if (uniqueIds.length === 0) return new Map<string, string>();

      const safeIds = uniqueIds.filter(isSafeSfdcId);
      if (safeIds.length === 0) return new Map<string, string>();
      const inClause = safeIds.map((id) => `'${id}'`).join(",");
      const result = await sfdcQuery<SfdcUser>(
        `SELECT Id, Name FROM User WHERE Id IN (${inClause})`,
        session?.access_token
      );

      const map = new Map<string, string>();
      for (const u of result.records) {
        map.set(u.Id, u.Name);
      }
      return map;
    },
    enabled: !!user && uniqueIds.length > 0,
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
