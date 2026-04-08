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
      closers: {
        Row: {
          created_at: string
          id: string
          name: string
          squad_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          squad_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          squad_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closers_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_daily_data: {
        Row: {
          calls_done: number
          calls_scheduled: number
          created_at: string
          created_by: string | null
          date: string
          entries_value: number
          funnel_id: string
          id: string
          leads_count: number
          qualified_count: number
          sales_count: number
          sales_value: number
          sdr_id: string | null
          user_id: string
        }
        Insert: {
          calls_done?: number
          calls_scheduled?: number
          created_at?: string
          created_by?: string | null
          date: string
          entries_value?: number
          funnel_id: string
          id?: string
          leads_count?: number
          qualified_count?: number
          sales_count?: number
          sales_value?: number
          sdr_id?: string | null
          user_id: string
        }
        Update: {
          calls_done?: number
          calls_scheduled?: number
          created_at?: string
          created_by?: string | null
          date?: string
          entries_value?: number
          funnel_id?: string
          id?: string
          leads_count?: number
          qualified_count?: number
          sales_count?: number
          sales_value?: number
          sdr_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_daily_data_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_daily_data_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          metric_key: string
          month: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metric_key: string
          month: string
          target_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metric_key?: string
          month?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      google_sheets_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          last_sync_at: string | null
          row_mapping: Json | null
          spreadsheet_id: string
          spreadsheet_name: string | null
          sync_message: string | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_sync_at?: string | null
          row_mapping?: Json | null
          spreadsheet_id: string
          spreadsheet_name?: string | null
          sync_message?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_sync_at?: string | null
          row_mapping?: Json | null
          spreadsheet_id?: string
          spreadsheet_name?: string | null
          sync_message?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_action_items: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          meeting_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          meeting_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          meeting_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by: string
          id?: string
          meeting_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          meeting_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          meeting_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          meeting_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          calls: number
          cancellation_entries: number | null
          cancellation_value: number | null
          cancellations: number | null
          closer_id: string
          created_at: string
          created_by: string | null
          entries: number
          entries_trend: number | null
          funnel_id: string | null
          id: string
          period_end: string
          period_start: string
          revenue: number
          revenue_trend: number | null
          sales: number
          sdr_id: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          calls?: number
          cancellation_entries?: number | null
          cancellation_value?: number | null
          cancellations?: number | null
          closer_id: string
          created_at?: string
          created_by?: string | null
          entries?: number
          entries_trend?: number | null
          funnel_id?: string | null
          id?: string
          period_end: string
          period_start: string
          revenue?: number
          revenue_trend?: number | null
          sales?: number
          sdr_id?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          calls?: number
          cancellation_entries?: number | null
          cancellation_value?: number | null
          cancellations?: number | null
          closer_id?: string
          created_at?: string
          created_by?: string | null
          entries?: number
          entries_trend?: number | null
          funnel_id?: string | null
          id?: string
          period_end?: string
          period_start?: string
          revenue?: number
          revenue_trend?: number | null
          sales?: number
          sdr_id?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "closers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          created_at: string
          id: string
          module: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sdr_funnels: {
        Row: {
          created_at: string
          created_by: string | null
          funnel_name: string
          id: string
          sdr_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          funnel_name: string
          id?: string
          sdr_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          funnel_name?: string
          id?: string
          sdr_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdr_funnels_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_metrics: {
        Row: {
          activated: number
          attendance_rate: number
          attended: number
          cancellations: number
          cancellation_value: number
          cancellation_entries: number
          conversion_rate: number
          created_at: string
          created_by: string | null
          date: string
          funnel: string
          id: string
          sales: number
          scheduled: number
          scheduled_follow_up: number
          scheduled_rate: number
          scheduled_same_day: number
          sdr_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          activated?: number
          attendance_rate?: number
          attended?: number
          cancellations?: number
          cancellation_value?: number
          cancellation_entries?: number
          conversion_rate?: number
          created_at?: string
          created_by?: string | null
          date: string
          funnel?: string
          id?: string
          sales?: number
          scheduled?: number
          scheduled_follow_up?: number
          scheduled_rate?: number
          scheduled_same_day?: number
          sdr_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          activated?: number
          attendance_rate?: number
          attended?: number
          cancellations?: number
          cancellation_value?: number
          cancellation_entries?: number
          conversion_rate?: number
          created_at?: string
          created_by?: string | null
          date?: string
          funnel?: string
          id?: string
          sales?: number
          scheduled?: number
          scheduled_follow_up?: number
          scheduled_rate?: number
          scheduled_same_day?: number
          sdr_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdr_metrics_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_sheets_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          last_sync_at: string | null
          row_mapping: Json | null
          spreadsheet_id: string
          spreadsheet_name: string | null
          sync_message: string | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_sync_at?: string | null
          row_mapping?: Json | null
          spreadsheet_id: string
          spreadsheet_name?: string | null
          sync_message?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_sync_at?: string | null
          row_mapping?: Json | null
          spreadsheet_id?: string
          spreadsheet_name?: string | null
          sync_message?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_calls: {
        Row: {
          id: string
          sdr_id: string
          closer_id: string
          funnel_id: string
          client_name: string
          client_phone: string
          scheduled_time: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sdr_id: string
          closer_id: string
          funnel_id: string
          client_name: string
          client_phone: string
          scheduled_time: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sdr_id?: string
          closer_id?: string
          funnel_id?: string
          client_name?: string
          client_phone?: string
          scheduled_time?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_calls_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "closers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          data: Json
          read: boolean
          created_at: string
          entity_id: string | null
          entity_type: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type?: string
          title: string
          message: string
          data?: Json
          read?: boolean
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          data?: Json
          read?: boolean
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sdrs: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      squad_sheets_config: {
        Row: {
          created_at: string | null
          id: string
          last_sync_at: string | null
          row_mapping: Json | null
          spreadsheet_id: string
          spreadsheet_name: string | null
          squad_id: string
          sync_message: string | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          row_mapping?: Json | null
          spreadsheet_id: string
          spreadsheet_name?: string | null
          squad_id: string
          sync_message?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          row_mapping?: Json | null
          spreadsheet_id?: string
          spreadsheet_name?: string | null
          squad_id?: string
          sync_message?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_sheets_config_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: true
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_entity_links: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entity_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_funnels: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          funnel_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          funnel_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          funnel_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_funnels_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "closers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_funnels_summary: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: Json
      }
      get_funnel_report: {
        Args: {
          p_funnel_id: string
          p_period_end?: string
          p_period_start?: string
        }
        Returns: Json
      }
      get_sales_by_person_and_product: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: Json
      }
      get_sdr_total_metrics: {
        Args: { p_period_end?: string; p_period_start?: string; p_type: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_module_permission: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_linked_to_entity: {
        Args: { _entity_id: string; _entity_type: string; _user_id: string }
        Returns: boolean
      }
      manager_can_access_closer: {
        Args: { _closer_id: string; _user_id: string }
        Returns: boolean
      }
      manager_can_access_sdr: {
        Args: { _sdr_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "viewer" | "user"
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
      app_role: ["admin", "manager", "viewer", "user"],
    },
  },
} as const
