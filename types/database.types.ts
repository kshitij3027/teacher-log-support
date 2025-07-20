export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          full_name: string | null;
          email: string;
          bio: string | null;
          phone: string | null;
          school_district: string | null;
          school_name: string | null;
          grade_level: string | null;
          subject_area: string | null;
          years_experience: number | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          full_name?: string | null;
          email: string;
          bio?: string | null;
          phone?: string | null;
          school_district?: string | null;
          school_name?: string | null;
          grade_level?: string | null;
          subject_area?: string | null;
          years_experience?: number | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          full_name?: string | null;
          email?: string;
          bio?: string | null;
          phone?: string | null;
          school_district?: string | null;
          school_name?: string | null;
          grade_level?: string | null;
          subject_area?: string | null;
          years_experience?: number | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      incidents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          category: IncidentCategory;
          severity: IncidentSeverity;
          status: IncidentStatus;
          incident_date: string;
          time_of_incident: string | null;
          location: string | null;
          students_involved: string[] | null;
          witnesses: string[] | null;
          action_taken: string | null;
          follow_up_needed: boolean;
          follow_up_notes: string | null;
          attachments: Json;
          anonymous_sharing_allowed: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          category: IncidentCategory;
          severity: IncidentSeverity;
          status?: IncidentStatus;
          incident_date: string;
          time_of_incident?: string | null;
          location?: string | null;
          students_involved?: string[] | null;
          witnesses?: string[] | null;
          action_taken?: string | null;
          follow_up_needed?: boolean;
          follow_up_notes?: string | null;
          attachments?: Json;
          anonymous_sharing_allowed?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          category?: IncidentCategory;
          severity?: IncidentSeverity;
          status?: IncidentStatus;
          incident_date?: string;
          time_of_incident?: string | null;
          location?: string | null;
          students_involved?: string[] | null;
          witnesses?: string[] | null;
          action_taken?: string | null;
          follow_up_needed?: boolean;
          follow_up_notes?: string | null;
          attachments?: Json;
          anonymous_sharing_allowed?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_display_name_available: {
        Args: {
          name: string;
        };
        Returns: boolean;
      };
      soft_delete_incident: {
        Args: {
          incident_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Enum types for better type safety
export type IncidentCategory =
  | 'classroom_management'
  | 'student_behavior'
  | 'parent_communication'
  | 'academic_performance'
  | 'bullying'
  | 'attendance'
  | 'technology_issues'
  | 'administrative'
  | 'other';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'draft' | 'submitted' | 'resolved' | 'archived';

// Helper types for common operations
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type NewUserProfile =
  Database['public']['Tables']['user_profiles']['Insert'];
export type UpdateUserProfile =
  Database['public']['Tables']['user_profiles']['Update'];

export type Incident = Database['public']['Tables']['incidents']['Row'];
export type NewIncident = Database['public']['Tables']['incidents']['Insert'];
export type UpdateIncident =
  Database['public']['Tables']['incidents']['Update'];

// Client-safe types (without sensitive server data)
export type PublicUserProfile = Omit<
  UserProfile,
  'email' | 'phone' | 'user_id'
>;
export type PublicIncident = Omit<Incident, 'user_id'>;

// Form data types
export type UserProfileFormData = Pick<
  UserProfile,
  | 'display_name'
  | 'full_name'
  | 'bio'
  | 'phone'
  | 'school_district'
  | 'school_name'
  | 'grade_level'
  | 'subject_area'
  | 'years_experience'
>;

export type IncidentFormData = Pick<
  Incident,
  | 'title'
  | 'description'
  | 'category'
  | 'severity'
  | 'incident_date'
  | 'time_of_incident'
  | 'location'
  | 'students_involved'
  | 'witnesses'
  | 'action_taken'
  | 'follow_up_needed'
  | 'follow_up_notes'
  | 'anonymous_sharing_allowed'
>;
