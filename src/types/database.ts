// Hand-written types mirroring the Supabase Postgres schema
// (see artifacts/tahanan/supabase/migrations). Keep in sync with the SQL.

export type CoupleType = 'partner' | 'cof';

export type CheckinMood =
  | 'great'
  | 'good'
  | 'okay'
  | 'down'
  | 'struggling';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped';
export type TaskPriority = 'low' | 'normal' | 'high';
export type EmergencyStatus = 'active' | 'acknowledged' | 'resolved';

export interface Profile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  fcm_token: string | null;
  is_deactivated: boolean;
  created_at: string;
}

export interface Couple {
  id: string;
  name: string;
  invite_code: string | null;
  created_by: string;
  relationship_start_date: string | null;
  created_at: string;
}

export interface CoupleMember {
  id: string;
  couple_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface RoomMemberSummary {
  user_id: string;
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
}
export interface Cof {
  id: string;
  name: string;
  invite_code: string | null;
  created_by: string;
  created_at: string;
}

export interface CofMember {
  id: string;
  cof_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface DailyCheckin {
  id: string;
  couple_id: string | null;
  cof_id: string | null;
  user_id: string;
  mood: string | null;
  energy_level: number | null;
  health_status: string | null;
  safety_status: string | null;
  note: string | null;
  is_private: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  couple_id: string | null;
  cof_id: string | null;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  event_type: string | null;
  start_time: string;
  end_time: string | null;
  is_private: boolean;
  is_completed: boolean;
  created_at: string;
}

export interface LoveNote {
  id: string;
  couple_id: string | null;
  cof_id: string | null;
  created_by: string;
  recipient_id: string | null;
  title: string | null;
  body: string;
  note_type: string | null;
  open_when: string | null;
  is_favorite: boolean;
  created_at: string;
}

export interface MonthsaryMessage {
  id: string;
  couple_id: string;
  created_by: string;
  recipient_id: string | null;
  title: string | null;
  body: string;
  target_monthsary_date: string;
  completed_at: string | null;
  created_at: string;
}

export interface HealthNote {
  id: string;
  couple_id: string | null;
  cof_id: string | null;
  user_id: string;
  health_type: string | null;
  severity: number | null;
  notes: string | null;
  visible_to_partner: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  couple_id: string | null;
  cof_id: string | null;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
}

export interface EmergencyEvent {
  id: string;
  couple_id: string | null;
  cof_id: string | null;
  triggered_by: string;
  status: EmergencyStatus;
  message: string | null;
  location_note: string | null;
  latitude: number | null;
  longitude: number | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface TrustedContact {
  id: string;
  couple_id: string | null;
  cof_id: string | null;
  created_by: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

// Minimal Database generic shape so `createClient<Database>()` type-checks
// without generating full Supabase CLI types.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      couples: { Row: Couple; Insert: Partial<Couple>; Update: Partial<Couple> };
      couple_members: { Row: CoupleMember; Insert: Partial<CoupleMember>; Update: Partial<CoupleMember> };
      daily_checkins: { Row: DailyCheckin; Insert: Partial<DailyCheckin>; Update: Partial<DailyCheckin> };
      calendar_events: { Row: CalendarEvent; Insert: Partial<CalendarEvent>; Update: Partial<CalendarEvent> };
      love_notes: { Row: LoveNote; Insert: Partial<LoveNote>; Update: Partial<LoveNote> };
      monthsary_messages: {
        Row: MonthsaryMessage;
        Insert: Partial<MonthsaryMessage>;
        Update: Partial<MonthsaryMessage>;
      };
      health_notes: { Row: HealthNote; Insert: Partial<HealthNote>; Update: Partial<HealthNote> };
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> };
      emergency_events: { Row: EmergencyEvent; Insert: Partial<EmergencyEvent>; Update: Partial<EmergencyEvent> };
      trusted_contacts: { Row: TrustedContact; Insert: Partial<TrustedContact>; Update: Partial<TrustedContact> };
    };
  };
}
