export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_intelligence_reports: {
        Row: {
          client_name: string
          client_website: string
          created_at: string
          id: string
          is_favorite: boolean | null
          report_data: Json
          report_type: string
          salesforce_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          client_website: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          report_data?: Json
          report_type: string
          salesforce_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          client_website?: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          report_data?: Json
          report_type?: string
          salesforce_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      account_intelligence_usage: {
        Row: {
          client_name: string
          created_at: string
          embedding_calls: number
          embedding_cost_usd: number
          embedding_tokens: number
          gemini_calls: number
          gemini_cost_usd: number
          gemini_input_tokens: number
          gemini_output_tokens: number
          generation_time_seconds: number | null
          google_search_calls: number
          google_search_cost_usd: number
          google_search_results: number
          id: string
          openai_calls: number
          openai_cost_usd: number
          openai_input_tokens: number
          openai_output_tokens: number
          report_id: string | null
          report_type: string
          serper_calls: number
          serper_cost_usd: number
          serper_results: number
          total_cost_usd: number
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          embedding_calls?: number
          embedding_cost_usd?: number
          embedding_tokens?: number
          gemini_calls?: number
          gemini_cost_usd?: number
          gemini_input_tokens?: number
          gemini_output_tokens?: number
          generation_time_seconds?: number | null
          google_search_calls?: number
          google_search_cost_usd?: number
          google_search_results?: number
          id?: string
          openai_calls?: number
          openai_cost_usd?: number
          openai_input_tokens?: number
          openai_output_tokens?: number
          report_id?: string | null
          report_type: string
          serper_calls?: number
          serper_cost_usd?: number
          serper_results?: number
          total_cost_usd?: number
          user_id: string
        }
        Update: {
          client_name?: string
          created_at?: string
          embedding_calls?: number
          embedding_cost_usd?: number
          embedding_tokens?: number
          gemini_calls?: number
          gemini_cost_usd?: number
          gemini_input_tokens?: number
          gemini_output_tokens?: number
          generation_time_seconds?: number | null
          google_search_calls?: number
          google_search_cost_usd?: number
          google_search_results?: number
          id?: string
          openai_calls?: number
          openai_cost_usd?: number
          openai_input_tokens?: number
          openai_output_tokens?: number
          report_id?: string | null
          report_type?: string
          serper_calls?: number
          serper_cost_usd?: number
          serper_results?: number
          total_cost_usd?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_intelligence_usage_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "account_intelligence_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      api_audit_log: {
        Row: {
          action: string
          api_name: string
          created_at: string
          id: string
          ip_address: string | null
          request_params: Json | null
          response_status: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          api_name: string
          created_at?: string
          id?: string
          ip_address?: string | null
          request_params?: Json | null
          response_status?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          api_name?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          request_params?: Json | null
          response_status?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ask_will_messages: {
        Row: {
          assistant_response: string | null
          created_at: string
          id: string
          user_id: string
          user_query: string
        }
        Insert: {
          assistant_response?: string | null
          created_at?: string
          id?: string
          user_id: string
          user_query: string
        }
        Update: {
          assistant_response?: string | null
          created_at?: string
          id?: string
          user_id?: string
          user_query?: string
        }
        Relationships: []
      }
      ask_will_reasoning_messages: {
        Row: {
          assistant_response: string | null
          created_at: string
          id: string
          user_id: string
          user_query: string
        }
        Insert: {
          assistant_response?: string | null
          created_at?: string
          id?: string
          user_id: string
          user_query: string
        }
        Update: {
          assistant_response?: string | null
          created_at?: string
          id?: string
          user_id?: string
          user_query?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_login: string | null
          salesforce_user_id: string | null
          salesforce_org_id: string | null
          salesforce_instance_url: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_login?: string | null
          salesforce_user_id?: string | null
          salesforce_org_id?: string | null
          salesforce_instance_url?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          salesforce_user_id?: string | null
          salesforce_org_id?: string | null
          salesforce_instance_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sfdc_tokens: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string
          instance_url: string
          issued_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token: string
          instance_url: string
          issued_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string
          instance_url?: string
          issued_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sfdc_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_type_config: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          icon_name: string | null
          id: string
          is_active: boolean
          is_beta: boolean
          report_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_beta?: boolean
          report_type: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_beta?: boolean
          report_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          created_at: string
          error_message: string | null
          form_data: Json | null
          id: string
          status: string
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          form_data?: Json | null
          id?: string
          status?: string
          user_id: string
          workflow_id: string
          workflow_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          form_data?: Json | null
          id?: string
          status?: string
          user_id?: string
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          is_active: boolean
          is_beta: boolean
          long_description: string | null
          original_id: string | null
          public_slug: string | null
          publish_status: string
          roles: string[]
          stage: string | null
          title: string
          updated_at: string
          webhook_url: string
          workflow_type: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          is_active?: boolean
          is_beta?: boolean
          long_description?: string | null
          original_id?: string | null
          public_slug?: string | null
          publish_status?: string
          roles: string[]
          stage?: string | null
          title: string
          updated_at?: string
          webhook_url: string
          workflow_type: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_active?: boolean
          is_beta?: boolean
          long_description?: string | null
          original_id?: string | null
          public_slug?: string | null
          publish_status?: string
          roles?: string[]
          stage?: string | null
          title?: string
          updated_at?: string
          webhook_url?: string
          workflow_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      workflows_public: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          long_description: string | null
          original_id: string | null
          public_slug: string | null
          roles: string[] | null
          stage: string | null
          title: string | null
          updated_at: string | null
          workflow_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          long_description?: string | null
          original_id?: string | null
          public_slug?: string | null
          roles?: string[] | null
          stage?: string | null
          title?: string | null
          updated_at?: string | null
          workflow_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          long_description?: string | null
          original_id?: string | null
          public_slug?: string | null
          roles?: string[] | null
          stage?: string | null
          title?: string | null
          updated_at?: string | null
          workflow_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_api_rate_limit: {
        Args: {
          _api_name: string
          _max_calls?: number
          _user_id: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "user" | "editor" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "editor", "super_admin"],
    },
  },
} as const
