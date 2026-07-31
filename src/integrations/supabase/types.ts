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
      assigned_books: {
        Row: {
          assigned_by: string | null
          author: string | null
          created_at: string
          id: string
          pdf_url: string | null
          prompt: string | null
          title: string
        }
        Insert: {
          assigned_by?: string | null
          author?: string | null
          created_at?: string
          id?: string
          pdf_url?: string | null
          prompt?: string | null
          title: string
        }
        Update: {
          assigned_by?: string | null
          author?: string | null
          created_at?: string
          id?: string
          pdf_url?: string | null
          prompt?: string | null
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
      parent_student_links: {
        Row: {
          id: string
          parent_id: string
          student_id: string
          created_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          student_id: string
          created_at?: string
        }
        Update: {
          id?: string
          parent_id?: string
          student_id?: string
          created_at?: string
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
      task_progress: {
        Row: {
          id: string
          user_id: string
          task_id: string
          score: number
          correct_count: number
          total_count: number
          xp_awarded: number
          answers: Json
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          score?: number
          correct_count?: number
          total_count?: number
          xp_awarded?: number
          answers?: Json
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          score?: number
          correct_count?: number
          total_count?: number
          xp_awarded?: number
          answers?: Json
          completed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          id: string
          user_id: string
          activity_date: string
          task_id: string
          subject_id: string | null
          seconds_spent: number
          best_score: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_date: string
          task_id: string
          subject_id?: string | null
          seconds_spent?: number
          best_score?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_date?: string
          task_id?: string
          subject_id?: string | null
          seconds_spent?: number
          best_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "daily_activity_subject_id_fkey"
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
      is_linked_student: { Args: { _student_id: string }; Returns: boolean }
      is_parent: { Args: { _uid: string }; Returns: boolean }
      link_student_by_code: { Args: { _code: string }; Returns: string }
      today_et: { Args: Record<string, never>; Returns: string }
      upsert_daily_seconds: {
        Args: {
          _task_id: string
          _seconds: number
          _subject_id?: string | null
          _activity_date?: string | null
        }
        Returns: undefined
      }
      upsert_daily_score: {
        Args: {
          _task_id: string
          _score: number
          _subject_id?: string | null
          _activity_date?: string | null
        }
        Returns: undefined
      }
      get_daily_leaderboard: {
        Args: { _day?: string | null }
        Returns: {
          rank: number
          user_id: string
          display_name: string
          total_seconds: number
          best_score: number | null
        }[]
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
