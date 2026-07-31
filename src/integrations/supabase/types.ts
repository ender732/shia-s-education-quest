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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          bot_name: string | null
          created_at: string
          event_name: string
          id: string
          is_bot: boolean
          path: string | null
          properties: Json
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          bot_name?: string | null
          created_at?: string
          event_name: string
          id?: string
          is_bot?: boolean
          path?: string | null
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          bot_name?: string | null
          created_at?: string
          event_name?: string
          id?: string
          is_bot?: boolean
          path?: string | null
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          bot_name: string | null
          id: string
          ip_hash: string | null
          is_bot: boolean
          landing_path: string | null
          language: string | null
          last_seen_at: string
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          started_at: string
          timezone_offset: number | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          bot_name?: string | null
          id?: string
          ip_hash?: string | null
          is_bot?: boolean
          landing_path?: string | null
          language?: string | null
          last_seen_at?: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          started_at?: string
          timezone_offset?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          bot_name?: string | null
          id?: string
          ip_hash?: string | null
          is_bot?: boolean
          landing_path?: string | null
          language?: string | null
          last_seen_at?: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          started_at?: string
          timezone_offset?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      assigned_books: {
        Row: {
          assigned_by: string | null
          author: string | null
          created_at: string
          id: string
          pdf_url: string | null
          prompt: string | null
          student_may_delete: boolean
          title: string
        }
        Insert: {
          assigned_by?: string | null
          author?: string | null
          created_at?: string
          id?: string
          pdf_url?: string | null
          prompt?: string | null
          student_may_delete?: boolean
          title: string
        }
        Update: {
          assigned_by?: string | null
          author?: string | null
          created_at?: string
          id?: string
          pdf_url?: string | null
          prompt?: string | null
          student_may_delete?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assigned_books_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reports: {
        Row: {
          ai_feedback: Json | null
          ai_score: string | null
          book_id: string | null
          chapter_or_topic: string | null
          id: string
          report_text: string
          student_id: string
          submitted_at: string
          xp_awarded: number
        }
        Insert: {
          ai_feedback?: Json | null
          ai_score?: string | null
          book_id?: string | null
          chapter_or_topic?: string | null
          id?: string
          report_text: string
          student_id: string
          submitted_at?: string
          xp_awarded?: number
        }
        Update: {
          ai_feedback?: Json | null
          ai_score?: string | null
          book_id?: string | null
          chapter_or_topic?: string | null
          id?: string
          report_text?: string
          student_id?: string
          submitted_at?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_reports_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "assigned_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          activity_date: string
          best_score: number | null
          id: string
          seconds_spent: number
          subject_id: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          best_score?: number | null
          id?: string
          seconds_spent?: number
          subject_id?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          best_score?: number | null
          id?: string
          seconds_spent?: number
          subject_id?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_verified_at: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          id: string
          last_active_date: string | null
          level: number
          link_code: string
          link_email_sent_at: string | null
          parent_contact_email: string | null
          role: string
          streak_days: number
          xp_points: number
        }
        Insert: {
          age_verified_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id: string
          last_active_date?: string | null
          level?: number
          link_code?: string
          link_email_sent_at?: string | null
          parent_contact_email?: string | null
          role?: string
          streak_days?: number
          xp_points?: number
        }
        Update: {
          age_verified_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          last_active_date?: string | null
          level?: number
          link_code?: string
          link_email_sent_at?: string | null
          parent_contact_email?: string | null
          role?: string
          streak_days?: number
          xp_points?: number
        }
        Relationships: []
      }
      subjects: {
        Row: {
          description: string | null
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      task_progress: {
        Row: {
          answers: Json
          completed_at: string
          correct_count: number
          id: string
          score: number
          task_id: string
          total_count: number
          user_id: string
          xp_awarded: number
        }
        Insert: {
          answers?: Json
          completed_at?: string
          correct_count?: number
          id?: string
          score?: number
          task_id: string
          total_count?: number
          user_id: string
          xp_awarded?: number
        }
        Update: {
          answers?: Json
          completed_at?: string
          correct_count?: number
          id?: string
          score?: number
          task_id?: string
          total_count?: number
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_completed: boolean
          subject_id: string | null
          title: string
          unit_tag: string | null
          xp_reward: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          subject_id?: string | null
          title: string
          unit_tag?: string | null
          xp_reward?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          subject_id?: string | null
          title?: string
          unit_tag?: string | null
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      age_years_from_dob: { Args: { _dob: string }; Returns: number }
      get_analytics_bots: { Args: { _days?: number }; Returns: Json }
      get_analytics_daily: { Args: { _days?: number }; Returns: Json }
      get_analytics_overview: { Args: { _days?: number }; Returns: Json }
      get_analytics_recent_events: { Args: { _limit?: number }; Returns: Json }
      get_analytics_referrers: {
        Args: { _days?: number; _limit?: number }
        Returns: Json
      }
      get_analytics_top_pages: {
        Args: { _days?: number; _limit?: number }
        Returns: Json
      }
      get_daily_leaderboard: {
        Args: { _day?: string }
        Returns: {
          best_score: number
          display_name: string
          rank: number
          total_seconds: number
          user_id: string
        }[]
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      is_linked_student: { Args: { _student_id: string }; Returns: boolean }
      is_parent: { Args: { _uid: string }; Returns: boolean }
      link_student_by_code: { Args: { _code: string }; Returns: string }
      today_et: { Args: never; Returns: string }
      track_analytics: {
        Args: {
          _bot_name?: string
          _event_name: string
          _ip_hash?: string
          _is_bot?: boolean
          _landing_path?: string
          _language?: string
          _path?: string
          _properties?: Json
          _referrer?: string
          _screen_height?: number
          _screen_width?: number
          _session_id?: string
          _timezone_offset?: number
          _user_agent?: string
          _utm_campaign?: string
          _utm_content?: string
          _utm_medium?: string
          _utm_source?: string
          _utm_term?: string
          _visitor_id: string
        }
        Returns: string
      }
      upsert_daily_score: {
        Args: {
          _activity_date?: string
          _score: number
          _subject_id?: string
          _task_id: string
        }
        Returns: undefined
      }
      upsert_daily_seconds: {
        Args: {
          _activity_date?: string
          _seconds: number
          _subject_id?: string
          _task_id: string
        }
        Returns: undefined
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
A new version of Supabase CLI is available: v2.110.0 (currently installed v2.102.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
