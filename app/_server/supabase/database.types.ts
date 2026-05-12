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
      academy_reels: {
        Row: {
          body: string | null
          caption: string | null
          created_at: string
          hashtags: string[]
          idea: string
          id: string
          notes: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          caption?: string | null
          created_at?: string
          hashtags?: string[]
          idea: string
          id?: string
          notes?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          caption?: string | null
          created_at?: string
          hashtags?: string[]
          idea?: string
          id?: string
          notes?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          assistant_history: Json
          created_at: string
          full_history: Json
          id: string
          last_activity_at: string
          summary_embedding: string | null
          summary_text: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          assistant_history?: Json
          created_at?: string
          full_history?: Json
          id?: string
          last_activity_at?: string
          summary_embedding?: string | null
          summary_text?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          assistant_history?: Json
          created_at?: string
          full_history?: Json
          id?: string
          last_activity_at?: string
          summary_embedding?: string | null
          summary_text?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      episodic_memory: {
        Row: {
          content: string
          created_at: string
          embedding: string
          id: string
          importance: string
          metadata: Json
          ttl_days: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding: string
          id?: string
          importance?: string
          metadata?: Json
          ttl_days?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          importance?: string
          metadata?: Json
          ttl_days?: number | null
          user_id?: string
        }
        Relationships: []
      }
      semantic_memory: {
        Row: {
          content: string
          created_at: string
          embedding: string
          id: string
          importance: string
          key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding: string
          id?: string
          importance?: string
          key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          importance?: string
          key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progression_actions: {
        Row: {
          active: boolean
          created_at: string
          deactivated_at: string | null
          description: string | null
          frequency_config: Json
          frequency_type: string
          goal_id: string
          id: string
          title: string
          updated_at: string
          user_id: string
          xp_per_checkin: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          deactivated_at?: string | null
          description?: string | null
          frequency_config?: Json
          frequency_type: string
          goal_id: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
          xp_per_checkin?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          deactivated_at?: string | null
          description?: string | null
          frequency_config?: Json
          frequency_type?: string
          goal_id?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          xp_per_checkin?: number
        }
        Relationships: [
          {
            foreignKeyName: "progression_actions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "progression_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_checkins: {
        Row: {
          action_id: string
          created_at: string
          goal_id: string
          id: string
          local_date: string
          timezone: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          action_id: string
          created_at?: string
          goal_id: string
          id?: string
          local_date: string
          timezone: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          action_id?: string
          created_at?: string
          goal_id?: string
          id?: string
          local_date?: string
          timezone?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "progression_checkins_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "progression_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_checkins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "progression_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_goals: {
        Row: {
          completed_at: string | null
          completion_xp: number
          created_at: string
          deadline: string | null
          deadline_change_count: number
          deleted_at: string | null
          description: string | null
          failed_at: string | null
          id: string
          started_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_xp?: number
          created_at?: string
          deadline?: string | null
          deadline_change_count?: number
          deleted_at?: string | null
          description?: string | null
          failed_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_xp?: number
          created_at?: string
          deadline?: string | null
          deadline_change_count?: number
          deleted_at?: string | null
          description?: string | null
          failed_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progression_profiles: {
        Row: {
          created_at: string
          level: number
          timezone: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          level?: number
          timezone?: string
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          level?: number
          timezone?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progression_xp_history: {
        Row: {
          action_id: string | null
          checkin_id: string | null
          created_at: string
          description: string
          goal_id: string | null
          id: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          action_id?: string | null
          checkin_id?: string | null
          created_at?: string
          description: string
          goal_id?: string | null
          id?: string
          user_id: string
          xp_amount: number
        }
        Update: {
          action_id?: string | null
          checkin_id?: string | null
          created_at?: string
          description?: string
          goal_id?: string | null
          id?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "progression_xp_history_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "progression_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_xp_history_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "progression_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_xp_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "progression_goals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_episodic_memory: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          created_at: string
          id: string
          importance: string
          similarity: number
        }[]
      }
      match_semantic_memory: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          similarity: number
        }[]
      }
      search_chats_semantic: {
        Args: {
          p_limit?: number
          p_max_distance?: number
          p_query_embedding: string
        }
        Returns: {
          chat_id: string
          distance: number
          last_activity_at: string
          similarity: number
          summary_text: string
          title: string
        }[]
      }
      progression_calculate_level: {
        Args: { p_total_xp: number }
        Returns: number
      }
      progression_complete_goal: {
        Args: { p_description?: string; p_goal_id: string }
        Returns: {
          completed_at: string | null
          completion_xp: number
          created_at: string
          deadline: string | null
          deadline_change_count: number
          deleted_at: string | null
          description: string | null
          failed_at: string | null
          id: string
          started_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
      }
      progression_create_checkin: {
        Args: {
          p_action_id: string
          p_description?: string
          p_local_date: string
          p_timezone: string
        }
        Returns: {
          action_id: string
          created_at: string
          goal_id: string
          id: string
          local_date: string
          timezone: string
          user_id: string
          xp_awarded: number
        }
      }
      progression_ensure_profile: {
        Args: { p_timezone: string }
        Returns: {
          created_at: string
          level: number
          timezone: string
          total_xp: number
          updated_at: string
          user_id: string
        }
      }
      progression_fail_goal: {
        Args: { p_description?: string; p_goal_id: string }
        Returns: {
          completed_at: string | null
          completion_xp: number
          created_at: string
          deadline: string | null
          deadline_change_count: number
          deleted_at: string | null
          description: string | null
          failed_at: string | null
          id: string
          started_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
      }
      progression_record_xp: {
        Args: {
          p_action_id?: string
          p_checkin_id?: string
          p_description: string
          p_goal_id?: string
          p_xp_amount: number
        }
        Returns: {
          action_id: string | null
          checkin_id: string | null
          created_at: string
          description: string
          goal_id: string | null
          id: string
          user_id: string
          xp_amount: number
        } | null
      }
      progression_undo_checkin: {
        Args: {
          p_checkin_id: string
          p_description?: string
          p_local_date: string
          p_timezone: string
        }
        Returns: {
          action_id: string
          created_at: string
          goal_id: string
          id: string
          local_date: string
          timezone: string
          user_id: string
          xp_awarded: number
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
