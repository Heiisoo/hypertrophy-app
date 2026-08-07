export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  public: {
    Tables: {
      body_measurements: {
        Row: {
          arm_cm: number | null;
          created_at: string;
          id: string;
          measured_at: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
          waist_cm: number | null;
          weight_kg: number | null;
        };
        Insert: {
          arm_cm?: number | null;
          created_at?: string;
          id?: string;
          measured_at?: string;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
          waist_cm?: number | null;
          weight_kg?: number | null;
        };
        Update: {
          arm_cm?: number | null;
          created_at?: string;
          id?: string;
          measured_at?: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
          waist_cm?: number | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          aliases: string[];
          category: string;
          created_at: string;
          equipment: string | null;
          id: string;
          image_url: string | null;
          instructions: string | null;
          name: string;
          primary_muscles: string[];
          video_url: string | null;
        };
        Insert: {
          aliases?: string[];
          category: string;
          created_at?: string;
          equipment?: string | null;
          id: string;
          image_url?: string | null;
          instructions?: string | null;
          name: string;
          primary_muscles?: string[];
          video_url?: string | null;
        };
        Update: {
          aliases?: string[];
          category?: string;
          created_at?: string;
          equipment?: string | null;
          id?: string;
          image_url?: string | null;
          instructions?: string | null;
          name?: string;
          primary_muscles?: string[];
          video_url?: string | null;
        };
        Relationships: [];
      };
      program_days: {
        Row: {
          day_number: number;
          duration_minutes: number;
          focus: string;
          id: string;
          kind: string;
          program_id: string;
          recovery_items: string[];
          short_title: string;
          title: string;
        };
        Insert: {
          day_number: number;
          duration_minutes: number;
          focus?: string;
          id: string;
          kind: string;
          program_id: string;
          recovery_items?: string[];
          short_title: string;
          title: string;
        };
        Update: {
          day_number?: number;
          duration_minutes?: number;
          focus?: string;
          id?: string;
          kind?: string;
          program_id?: string;
          recovery_items?: string[];
          short_title?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'program_days_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      program_exercises: {
        Row: {
          cue: string | null;
          exercise_id: string;
          position: number;
          program_day_id: string;
          rep_range: string;
          rest_seconds: number;
          sets: number;
          target_rir: string;
        };
        Insert: {
          cue?: string | null;
          exercise_id: string;
          position: number;
          program_day_id: string;
          rep_range: string;
          rest_seconds: number;
          sets: number;
          target_rir: string;
        };
        Update: {
          cue?: string | null;
          exercise_id?: string;
          position?: number;
          program_day_id?: string;
          rep_range?: string;
          rest_seconds?: number;
          sets?: number;
          target_rir?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'program_exercises_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'program_exercises_program_day_id_fkey';
            columns: ['program_day_id'];
            isOneToOne: false;
            referencedRelation: 'program_days';
            referencedColumns: ['id'];
          },
        ];
      };
      programs: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          id: string;
          name: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string;
          id: string;
          name: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      user_programs: {
        Row: {
          created_at: string;
          program: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          program: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          program?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          finished_at: string | null;
          id: string;
          notes: string | null;
          program_day_id: string;
          started_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          finished_at?: string | null;
          id: string;
          notes?: string | null;
          program_day_id: string;
          started_at: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          finished_at?: string | null;
          id?: string;
          notes?: string | null;
          program_day_id?: string;
          started_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_sessions_program_day_id_fkey';
            columns: ['program_day_id'];
            isOneToOne: false;
            referencedRelation: 'program_days';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_sets: {
        Row: {
          completed_at: string | null;
          created_at: string;
          exercise_id: string;
          id: string;
          reps: number;
          rir: number;
          session_id: string;
          set_number: number;
          updated_at: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          exercise_id: string;
          id: string;
          reps: number;
          rir: number;
          session_id: string;
          set_number: number;
          updated_at?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          exercise_id?: string;
          id?: string;
          reps?: number;
          rir?: number;
          session_id?: string;
          set_number?: number;
          updated_at?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_sets_session_id_user_id_fkey';
            columns: ['session_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'workout_sessions';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
