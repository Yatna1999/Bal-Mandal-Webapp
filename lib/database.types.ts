export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RoleT =
  | 'super_admin'
  | 'agresar'
  | 'nirikshak'
  | 'sanchalak'
  | 'sah_sanchalak';

export type SabhaTypeT = 'pakki' | 'kachi';

export type SatsangStatusT = 'satsangi' | 'binsatsangi' | 'gunbhavi';

export type BalakStatusT = 'active' | 'archived' | 'transferred_kishore';

export type SessionStatusT = 'scheduled' | 'held' | 'cancelled';

export type PresabhaT = 'pending' | 'will_come' | 'wont_come' | 'no_response';

export type AttendanceT = 'present' | 'absent';

export type ContactedT = 'mother' | 'father' | 'both' | 'none';

export type MediumT = 'gujarati' | 'english' | 'hindi' | 'other';

export type TaskTypeT =
  | 'prepare_karyakram'
  | 'presabha_followup'
  | 'mark_attendance'
  | 'ahnik_followup'
  | 'aheval';

export type TaskStatusT = 'open' | 'done' | 'auto_closed';

export type NiyamStatusT = 'active' | 'expired' | 'completed' | 'lapsed';

export interface Database {
  public: {
    Tables: {
      cities: {
        Row: {
          id: string;
          name_gu: string;
          name_en: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name_gu: string;
          name_en: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name_gu?: string;
          name_en?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      zones: {
        Row: {
          id: string;
          city_id: string;
          name_gu: string;
          name_en: string;
        };
        Insert: {
          id?: string;
          city_id: string;
          name_gu: string;
          name_en: string;
        };
        Update: {
          id?: string;
          city_id?: string;
          name_gu?: string;
          name_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zones_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          }
        ];
      };
      xetras: {
        Row: {
          id: string;
          zone_id: string;
          name_gu: string;
          name_en: string;
        };
        Insert: {
          id?: string;
          zone_id: string;
          name_gu: string;
          name_en: string;
        };
        Update: {
          id?: string;
          zone_id?: string;
          name_gu?: string;
          name_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "xetras_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          }
        ];
      };
      vistars: {
        Row: {
          id: string;
          xetra_id: string;
          name_gu: string;
          name_en: string;
        };
        Insert: {
          id?: string;
          xetra_id: string;
          name_gu: string;
          name_en: string;
        };
        Update: {
          id?: string;
          xetra_id?: string;
          name_gu?: string;
          name_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vistars_xetra_id_fkey";
            columns: ["xetra_id"];
            isOneToOne: false;
            referencedRelation: "xetras";
            referencedColumns: ["id"];
          }
        ];
      };
      sabhas: {
        Row: {
          id: string;
          vistar_id: string;
          name_gu: string;
          name_en: string;
          sabha_type: SabhaTypeT;
          default_weekday: number;
          default_start_time: string;
          default_end_time: string;
          venue_gu: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vistar_id: string;
          name_gu: string;
          name_en: string;
          sabha_type: SabhaTypeT;
          default_weekday: number;
          default_start_time: string;
          default_end_time: string;
          venue_gu?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vistar_id?: string;
          name_gu?: string;
          name_en?: string;
          sabha_type?: SabhaTypeT;
          default_weekday?: number;
          default_start_time?: string;
          default_end_time?: string;
          venue_gu?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sabhas_vistar_id_fkey";
            columns: ["vistar_id"];
            isOneToOne: false;
            referencedRelation: "vistars";
            referencedColumns: ["id"];
          }
        ];
      };
      standards: {
        Row: {
          code: string;
          label_gu: string;
          label_en: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          label_gu: string;
          label_en: string;
          sort_order: number;
        };
        Update: {
          code?: string;
          label_gu?: string;
          label_en?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      karyakars: {
        Row: {
          id: string;
          vistar_id: string;
          full_name_gu: string;
          full_name_en: string;
          mobile: string;
          role: RoleT;
          is_active: boolean;
          must_change_password: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          vistar_id: string;
          full_name_gu: string;
          full_name_en: string;
          mobile: string;
          role: RoleT;
          is_active?: boolean;
          must_change_password?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vistar_id?: string;
          full_name_gu?: string;
          full_name_en?: string;
          mobile?: string;
          role?: RoleT;
          is_active?: boolean;
          must_change_password?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "karyakars_vistar_id_fkey";
            columns: ["vistar_id"];
            isOneToOne: false;
            referencedRelation: "vistars";
            referencedColumns: ["id"];
          }
        ];
      };
      karyakar_sabhas: {
        Row: {
          karyakar_id: string;
          sabha_id: string;
        };
        Insert: {
          karyakar_id: string;
          sabha_id: string;
        };
        Update: {
          karyakar_id?: string;
          sabha_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "karyakar_sabhas_karyakar_id_fkey";
            columns: ["karyakar_id"];
            isOneToOne: false;
            referencedRelation: "karyakars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "karyakar_sabhas_sabha_id_fkey";
            columns: ["sabha_id"];
            isOneToOne: false;
            referencedRelation: "sabhas";
            referencedColumns: ["id"];
          }
        ];
      };
      balako: {
        Row: {
          id: string;
          vistar_id: string;
          full_name_gu: string;
          full_name_en: string;
          photo_path: string | null;
          dob: string;
          standard_code: string;
          medium: MediumT;
          school_gu: string;
          school_en: string;
          address_gu: string;
          satsang_status: SatsangStatusT;
          mother_name_gu: string;
          mother_mobile: string;
          father_name_gu: string;
          father_mobile: string;
          status: BalakStatusT;
          archive_reason_gu: string | null;
          archived_at: string | null;
          archived_by: string | null;
          search_blob: string | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vistar_id: string;
          full_name_gu: string;
          full_name_en: string;
          photo_path?: string | null;
          dob: string;
          standard_code: string;
          medium: MediumT;
          school_gu: string;
          school_en: string;
          address_gu: string;
          satsang_status: SatsangStatusT;
          mother_name_gu: string;
          mother_mobile: string;
          father_name_gu: string;
          father_mobile: string;
          status?: BalakStatusT;
          archive_reason_gu?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
          search_blob?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vistar_id?: string;
          full_name_gu?: string;
          full_name_en?: string;
          photo_path?: string | null;
          dob?: string;
          standard_code?: string;
          medium?: MediumT;
          school_gu?: string;
          school_en?: string;
          address_gu?: string;
          satsang_status?: SatsangStatusT;
          mother_name_gu?: string;
          mother_mobile?: string;
          father_name_gu?: string;
          father_mobile?: string;
          status?: BalakStatusT;
          archive_reason_gu?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
          search_blob?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "balako_vistar_id_fkey";
            columns: ["vistar_id"];
            isOneToOne: false;
            referencedRelation: "vistars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "balako_standard_code_fkey";
            columns: ["standard_code"];
            isOneToOne: false;
            referencedRelation: "standards";
            referencedColumns: ["code"];
          }
        ];
      };
      balak_sabhas: {
        Row: {
          balak_id: string;
          sabha_id: string;
          is_primary: boolean;
          joined_on: string;
        };
        Insert: {
          balak_id: string;
          sabha_id: string;
          is_primary?: boolean;
          joined_on?: string;
        };
        Update: {
          balak_id?: string;
          sabha_id?: string;
          is_primary?: boolean;
          joined_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "balak_sabhas_balak_id_fkey";
            columns: ["balak_id"];
            isOneToOne: false;
            referencedRelation: "balako";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "balak_sabhas_sabha_id_fkey";
            columns: ["sabha_id"];
            isOneToOne: false;
            referencedRelation: "sabhas";
            referencedColumns: ["id"];
          }
        ];
      };
      sabha_sessions: {
        Row: {
          id: string;
          sabha_id: string;
          session_date: string;
          start_time: string;
          end_time: string;
          sabha_type: SabhaTypeT;
          status: SessionStatusT;
          cancel_reason_gu: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          karyakram_text: string | null;
          notes_text: string | null;
          aheval_done: boolean;
          aheval_done_by: string | null;
          aheval_done_at: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sabha_id: string;
          session_date: string;
          start_time: string;
          end_time: string;
          sabha_type: SabhaTypeT;
          status?: SessionStatusT;
          cancel_reason_gu?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          karyakram_text?: string | null;
          notes_text?: string | null;
          aheval_done?: boolean;
          aheval_done_by?: string | null;
          aheval_done_at?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sabha_id?: string;
          session_date?: string;
          start_time?: string;
          end_time?: string;
          sabha_type?: SabhaTypeT;
          status?: SessionStatusT;
          cancel_reason_gu?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          karyakram_text?: string | null;
          notes_text?: string | null;
          aheval_done?: boolean;
          aheval_done_by?: string | null;
          aheval_done_at?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sabha_sessions_sabha_id_fkey";
            columns: ["sabha_id"];
            isOneToOne: false;
            referencedRelation: "sabhas";
            referencedColumns: ["id"];
          }
        ];
      };
      session_followup_karyakars: {
        Row: {
          session_id: string;
          karyakar_id: string;
        };
        Insert: {
          session_id: string;
          karyakar_id: string;
        };
        Update: {
          session_id?: string;
          karyakar_id?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          session_id: string;
          balak_id: string;
          presabha_status: PresabhaT;
          presabha_contacted: ContactedT;
          presabha_by: string | null;
          presabha_at: string | null;
          attendance_status: AttendanceT | null;
          marked_by: string | null;
          marked_at: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          balak_id: string;
          presabha_status?: PresabhaT;
          presabha_contacted?: ContactedT;
          presabha_by?: string | null;
          presabha_at?: string | null;
          attendance_status?: AttendanceT | null;
          marked_by?: string | null;
          marked_at?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          balak_id?: string;
          presabha_status?: PresabhaT;
          presabha_contacted?: ContactedT;
          presabha_by?: string | null;
          presabha_at?: string | null;
          attendance_status?: AttendanceT | null;
          marked_by?: string | null;
          marked_at?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ahnik_items: {
        Row: {
          id: string;
          code: string;
          label_gu: string;
          label_en: string;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          label_gu: string;
          label_en: string;
          sort_order: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          label_gu?: string;
          label_en?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      ahnik_weeks: {
        Row: {
          id: string;
          balak_id: string;
          week_start_date: string;
          captured_at_session: string | null;
          captured_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          balak_id: string;
          week_start_date: string;
          captured_at_session?: string | null;
          captured_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          balak_id?: string;
          week_start_date?: string;
          captured_at_session?: string | null;
          captured_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ahnik_entries: {
        Row: {
          ahnik_week_id: string;
          ahnik_item_id: string;
          done: boolean;
        };
        Insert: {
          ahnik_week_id: string;
          ahnik_item_id: string;
          done?: boolean;
        };
        Update: {
          ahnik_week_id?: string;
          ahnik_item_id?: string;
          done?: boolean;
        };
        Relationships: [];
      };
      niyams: {
        Row: {
          id: string;
          balak_id: string;
          title_gu: string;
          start_date: string;
          duration_months: number;
          end_date: string | null;
          status: NiyamStatusT;
          notes_gu: string | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          balak_id: string;
          title_gu: string;
          start_date: string;
          duration_months: number;
          end_date?: string | null;
          status?: NiyamStatusT;
          notes_gu?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          balak_id?: string;
          title_gu?: string;
          start_date?: string;
          duration_months?: number;
          end_date?: string | null;
          status?: NiyamStatusT;
          notes_gu?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          session_id: string;
          sabha_id: string;
          task_type: TaskTypeT;
          opens_at: string;
          due_at: string;
          status: TaskStatusT;
          completed_at: string | null;
          completed_by: string | null;
          escalated_at: string | null;
          last_reminder_at: string | null;
          reminder_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          sabha_id: string;
          task_type: TaskTypeT;
          opens_at: string;
          due_at: string;
          status?: TaskStatusT;
          completed_at?: string | null;
          completed_by?: string | null;
          escalated_at?: string | null;
          last_reminder_at?: string | null;
          reminder_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          sabha_id?: string;
          task_type?: TaskTypeT;
          opens_at?: string;
          due_at?: string;
          status?: TaskStatusT;
          completed_at?: string | null;
          completed_by?: string | null;
          escalated_at?: string | null;
          last_reminder_at?: string | null;
          reminder_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          karyakar_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          last_success_at: string | null;
          failure_count: number;
        };
        Insert: {
          id?: string;
          karyakar_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          last_success_at?: string | null;
          failure_count?: number;
        };
        Update: {
          id?: string;
          karyakar_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
          last_success_at?: string | null;
          failure_count?: number;
        };
        Relationships: [];
      };
      inapp_notifications: {
        Row: {
          id: string;
          karyakar_id: string;
          kind: string;
          title_gu: string;
          body_gu: string;
          link_url: string | null;
          task_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          karyakar_id: string;
          kind: string;
          title_gu: string;
          body_gu: string;
          link_url?: string | null;
          task_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          karyakar_id?: string;
          kind?: string;
          title_gu?: string;
          body_gu?: string;
          link_url?: string | null;
          task_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          table_name: string;
          record_id: string;
          action: string;
          changed_fields: string[] | null;
          actor_id: string | null;
          actor_name_snapshot: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          table_name: string;
          record_id: string;
          action: string;
          changed_fields?: string[] | null;
          actor_id?: string | null;
          actor_name_snapshot?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          table_name?: string;
          record_id?: string;
          action?: string;
          changed_fields?: string[] | null;
          actor_id?: string | null;
          actor_name_snapshot?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_vistar_balak_count: {
        Row: {
          vistar_id: string | null;
          total_balako: number | null;
        };
        Relationships: [];
      };
      v_sabha_balak_count: {
        Row: {
          sabha_id: string | null;
          vistar_id: string | null;
          sankhya: number | null;
        };
        Relationships: [];
      };
      v_attendance_rate: {
        Row: {
          session_id: string | null;
          sabha_id: string | null;
          session_date: string | null;
          present_count: number | null;
          absent_count: number | null;
          rate: number | null;
        };
        Relationships: [];
      };
      v_karyakar_accountability: {
        Row: {
          karyakar_id: string | null;
          month: string | null;
          tasks_total: number | null;
          on_time: number | null;
          pct: number | null;
        };
        Relationships: [];
      };
      v_consecutive_absent: {
        Row: {
          balak_id: string | null;
          sabha_id: string | null;
          streak: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      auth_karyakar: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["karyakars"]["Row"][];
      };
      auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: RoleT;
      };
      auth_vistar: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_vistar_scope: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      can_cancel_session: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      my_sabha_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      can_see_balak: {
        Args: { p_balak: string };
        Returns: boolean;
      };
      can_touch_sabha: {
        Args: { p_sabha: string };
        Returns: boolean;
      };
    };
    Enums: {
      role_t: RoleT;
      sabha_type_t: SabhaTypeT;
      satsang_status_t: SatsangStatusT;
      balak_status_t: BalakStatusT;
      session_status_t: SessionStatusT;
      presabha_t: PresabhaT;
      attendance_t: AttendanceT;
      contacted_t: ContactedT;
      medium_t: MediumT;
      task_type_t: TaskTypeT;
      task_status_t: TaskStatusT;
      niyam_status_t: NiyamStatusT;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
