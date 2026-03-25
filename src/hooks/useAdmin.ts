import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  partner_id: string | null;
  created_at: string;
  partners: { id: string; name: string; type: string } | null;
  user_roles: { role: string }[];
}

export interface Partner {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export function useAdminUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, partner_id, created_at, partners(id, name, type), user_roles(role)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as AdminUser[];
    },
    enabled: !!user,
  });
}

export function useAdminPartners() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Partner[];
    },
    enabled: !!user,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Delete existing roles, then insert new one
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useAssignPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, partnerId }: { userId: string; partnerId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ partner_id: partnerId })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, type }: { name: string; type: string }) => {
      const { data, error } = await supabase
        .from("partners")
        .insert({ name, type })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partnerId: string) => {
      const { error } = await supabase
        .from("partners")
        .delete()
        .eq("id", partnerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    },
  });
}
