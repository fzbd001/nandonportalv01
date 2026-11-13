import { createClient } from '@supabase/supabase-js';
import { AttendanceLog, Deliverable, User } from '../types.ts';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://ifazvnsxtfokswlowjrz.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_mo5Tlfw1anoI0WqL-2wQOA_U2yr6x9c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SupabaseStatus {
  connected: boolean;
  tablesReady: boolean;
  message?: string;
}

/**
 * Checks whether Supabase is reachable and the required tables are created
 */
export async function checkSupabaseStatus(): Promise<SupabaseStatus> {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('not find')) {
        return {
          connected: true,
          tablesReady: false,
          message: 'Connected to Supabase, but SQL tables are not yet created.'
        };
      }
      return {
        connected: false,
        tablesReady: false,
        message: error.message
      };
    }
    return {
      connected: true,
      tablesReady: true,
      message: `Connected to Supabase. ${data ? data.length : 0} user records detected.`
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      tablesReady: false,
      message: msg
    };
  }
}

/**
 * Fetch all users from Supabase with fallback
 */
export async function fetchUsersFromSupabase(): Promise<User[] | null> {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error || !data) return null;
    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      isBoss: Boolean(item.is_boss),
      password: item.password
    }));
  } catch {
    return null;
  }
}

/**
 * Save / Upsert user in Supabase
 */
export async function upsertUserInSupabase(user: User): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      role: user.role,
      is_boss: user.isBoss,
      password: user.password
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch attendance logs from Supabase with fallback
 */
export async function fetchAttendanceFromSupabase(): Promise<AttendanceLog[] | null> {
  try {
    const { data, error } = await supabase.from('attendance_logs').select('*');
    if (error || !data) return null;
    return data.map((item: any) => ({
      id: item.id,
      empId: item.emp_id,
      staffName: item.staff_name,
      date: item.date,
      dateFormatted: item.date_formatted,
      checkInTime: item.check_in_time,
      checkInTimestamp: Number(item.check_in_timestamp) || 0,
      checkOutTime: item.check_out_time,
      isCheckedIn: Boolean(item.is_checked_in),
      totalMinutes: Number(item.total_minutes) || 0
    }));
  } catch {
    return null;
  }
}

/**
 * Upsert attendance log in Supabase
 */
export async function upsertAttendanceInSupabase(log: AttendanceLog): Promise<boolean> {
  try {
    const { error } = await supabase.from('attendance_logs').upsert({
      id: log.id,
      emp_id: log.empId,
      staff_name: log.staffName,
      date: log.date,
      date_formatted: log.dateFormatted,
      check_in_time: log.checkInTime,
      check_in_timestamp: log.checkInTimestamp,
      check_out_time: log.checkOutTime,
      is_checked_in: log.isCheckedIn,
      total_minutes: log.totalMinutes
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch deliverables from Supabase
 */
export async function fetchDeliverablesFromSupabase(): Promise<Deliverable[] | null> {
  try {
    const { data, error } = await supabase.from('deliverables').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map((item: any) => ({
      id: item.id,
      empId: item.emp_id,
      category: item.category,
      title: item.title,
      notes: item.notes || '',
      progress: Number(item.progress) || 0,
      completed: Boolean(item.completed),
      timestamp: item.timestamp,
      date: item.date
    }));
  } catch {
    return null;
  }
}

/**
 * Upsert deliverable in Supabase
 */
export async function upsertDeliverableInSupabase(deliverable: Deliverable): Promise<boolean> {
  try {
    const { error } = await supabase.from('deliverables').upsert({
      id: deliverable.id,
      emp_id: deliverable.empId,
      category: deliverable.category,
      title: deliverable.title,
      notes: deliverable.notes,
      progress: deliverable.progress,
      completed: deliverable.completed,
      timestamp: deliverable.timestamp,
      date: deliverable.date
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete deliverable from Supabase
 */
export async function deleteDeliverableFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('deliverables').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Save studio logo in Supabase
 */
export async function saveStudioLogoInSupabase(logoDataUrl: string | null): Promise<boolean> {
  try {
    if (!logoDataUrl) {
      await supabase.from('studio_settings').delete().eq('key', 'studio_logo');
      return true;
    }
    const { error } = await supabase.from('studio_settings').upsert({
      key: 'studio_logo',
      value: logoDataUrl,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch studio logo from Supabase
 */
export async function fetchStudioLogoFromSupabase(): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('studio_settings').select('value').eq('key', 'studio_logo').maybeSingle();
    if (error || !data) return null;
    return data.value;
  } catch {
    return null;
  }
}

/**
 * Save studio announcement ticker text in Supabase
 */
export async function saveStudioAnnouncementInSupabase(text: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('studio_settings').upsert({
      key: 'studio_announcement',
      value: text,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch studio announcement ticker text from Supabase
 */
export async function fetchStudioAnnouncementFromSupabase(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('studio_settings')
      .select('value')
      .eq('key', 'studio_announcement')
      .maybeSingle();
    if (error || !data) return null;
    return data.value;
  } catch {
    return null;
  }
}
