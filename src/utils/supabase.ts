import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  AttendanceLog,
  AttendanceMetaStore,
  ChatMessage,
  DayAttendanceMeta,
  Deliverable,
  User,
  WorkLocation,
  WorkLocationStore
} from '../types.ts';
import { mergeChatMessages } from './storage.ts';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://ifazvnsxtfokswlowjrz.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_mo5Tlfw1anoI0WqL-2wQOA_U2yr6x9c';

const noCacheFetch: typeof fetch = async (input, init) => {
  try {
    return await globalThis.fetch(input, {
      ...init,
      cache: 'no-store'
    });
  } catch {
    return globalThis.fetch(input, init);
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: noCacheFetch
  }
});

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
 * Delete user from Supabase
 */
export async function deleteUserFromSupabase(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
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
    let { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(2000);
    if (error) {
      const fallback = await supabase.from('attendance_logs').select('*');
      data = fallback.data;
      error = fallback.error;
    }
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
    let { data, error } = await supabase
      .from('deliverables')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) {
      const fallback = await supabase.from('deliverables').select('*');
      data = fallback.data;
      error = fallback.error;
    }
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

/**
 * Fetch work locations map (Office / Home logins) from Supabase studio_settings
 */
export async function fetchWorkLocationsFromSupabase(): Promise<WorkLocationStore | null> {
  try {
    const { data, error } = await supabase
      .from('studio_settings')
      .select('value')
      .eq('key', 'work_locations_v1')
      .maybeSingle();
    if (error || !data || !data.value) return null;
    const parsed = JSON.parse(data.value);
    if (parsed && typeof parsed === 'object') {
      return {
        latestByEmp: parsed.latestByEmp && typeof parsed.latestByEmp === 'object' ? parsed.latestByEmp : {},
        byDate: parsed.byDate && typeof parsed.byDate === 'object' ? parsed.byDate : {},
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save work locations map in Supabase studio_settings
 */
export async function saveWorkLocationsInSupabase(store: WorkLocationStore): Promise<boolean> {
  try {
    const { error } = await supabase.from('studio_settings').upsert({
      key: 'work_locations_v1',
      value: JSON.stringify(store),
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch-merge-upsert a single employee's work location so concurrent logins do not overwrite each other
 */
export async function upsertEmployeeWorkLocationInSupabase(
  empId: string,
  date: string,
  loginTime: string,
  location: WorkLocation,
  fallbackStore?: WorkLocationStore
): Promise<WorkLocationStore> {
  const remote = await fetchWorkLocationsFromSupabase();
  const base: WorkLocationStore = remote || fallbackStore || { latestByEmp: {}, byDate: {} };
  const next: WorkLocationStore = {
    latestByEmp: {
      ...base.latestByEmp,
      [empId]: { location, loginTime, date }
    },
    byDate: {
      ...base.byDate,
      [`${empId}__${date}`]: location
    }
  };
  await saveWorkLocationsInSupabase(next);
  return next;
}

/**
 * Fetch attendance metadata (sessions, systemLogout flags, boss re-check-in permissions) from Supabase studio_settings
 */
export async function fetchAttendanceMetaFromSupabase(): Promise<AttendanceMetaStore | null> {
  try {
    const { data, error } = await supabase
      .from('studio_settings')
      .select('value')
      .eq('key', 'attendance_meta_v1')
      .maybeSingle();
    if (error || !data || !data.value) return null;
    const parsed = JSON.parse(data.value);
    if (parsed && typeof parsed === 'object' && parsed.byKey && typeof parsed.byKey === 'object') {
      return { byKey: parsed.byKey };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save attendance metadata store to Supabase studio_settings
 */
export async function saveAttendanceMetaInSupabase(store: AttendanceMetaStore): Promise<boolean> {
  try {
    const { error } = await supabase.from('studio_settings').upsert({
      key: 'attendance_meta_v1',
      value: JSON.stringify(store),
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch-merge-upsert a single employee-day attendance metadata entry safely across devices
 */
export async function updateDayAttendanceMetaInSupabase(
  empId: string,
  date: string,
  updater: (current: DayAttendanceMeta) => DayAttendanceMeta,
  fallbackStore?: AttendanceMetaStore
): Promise<AttendanceMetaStore> {
  const key = `${empId}__${date}`;
  const remote = await fetchAttendanceMetaFromSupabase();
  const base: AttendanceMetaStore = remote || fallbackStore || { byKey: {} };
  const existing: DayAttendanceMeta = base.byKey[key] || { sessions: [] };
  const updatedDay = updater(existing);
  const next: AttendanceMetaStore = {
    byKey: {
      ...base.byKey,
      [key]: updatedDay
    }
  };
  await saveAttendanceMetaInSupabase(next);
  return next;
}

const STUDIO_CHAT_SETTINGS_KEY = 'studio_chat_messages_v1';

/**
 * Fetch Studio Chat group message history from Supabase studio_settings
 */
export async function fetchChatMessagesFromSupabase(): Promise<ChatMessage[] | null> {
  try {
    const { data, error } = await supabase
      .from('studio_settings')
      .select('value')
      .eq('key', STUDIO_CHAT_SETTINGS_KEY)
      .maybeSingle();
    if (error || !data || !data.value) return null;
    const parsed = JSON.parse(data.value);
    if (Array.isArray(parsed)) {
      return mergeChatMessages([], parsed);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch-merge-upsert a new Studio Chat message in Supabase safely across concurrent users
 */
export async function appendChatMessageInSupabase(
  newMessage: ChatMessage,
  fallbackMessages: ChatMessage[] = []
): Promise<ChatMessage[]> {
  const remote = await fetchChatMessagesFromSupabase();
  const base = remote || fallbackMessages;
  const merged = mergeChatMessages(base, [newMessage]);
  try {
    await supabase.from('studio_settings').upsert({
      key: STUDIO_CHAT_SETTINGS_KEY,
      value: JSON.stringify(merged),
      updated_at: new Date().toISOString()
    });
  } catch {
    // offline fallback
  }
  return merged;
}

export interface StudioChatPresenceUser {
  id: string;
  name: string;
  role: string;
  isBoss: boolean;
}

/**
 * Subscribe to the live Studio Chat Realtime WebSocket channel (Broadcast + Presence + DB changes)
 */
export function subscribeToStudioChatChannel(
  currentUser: StudioChatPresenceUser,
  onIncomingMessage: (msg: ChatMessage) => void,
  onRemoteHistoryUpdate: (messages: ChatMessage[]) => void,
  onOnlineUsersChange: (users: StudioChatPresenceUser[]) => void
): RealtimeChannel {
  const channel = supabase.channel('nandan-studio-chat-room', {
    config: {
      broadcast: { self: false },
      presence: { key: currentUser.id }
    }
  });

  channel
    .on('broadcast', { event: 'chat:message' }, ({ payload }) => {
      if (payload && typeof payload === 'object' && typeof payload.id === 'string') {
        onIncomingMessage(payload as ChatMessage);
      }
    })
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'studio_settings',
        filter: `key=eq.${STUDIO_CHAT_SETTINGS_KEY}`
      },
      (payload: any) => {
        try {
          const rawVal = payload?.new?.value;
          if (rawVal) {
            const parsed = JSON.parse(rawVal);
            if (Array.isArray(parsed)) {
              onRemoteHistoryUpdate(mergeChatMessages([], parsed));
            }
          }
        } catch {
          // ignore parse error
        }
      }
    )
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<StudioChatPresenceUser>();
      const onlineMap = new Map<string, StudioChatPresenceUser>();
      Object.values(state).forEach((presences) => {
        presences.forEach((p) => {
          if (p && p.id) {
            onlineMap.set(p.id, {
              id: p.id,
              name: p.name,
              role: p.role,
              isBoss: Boolean(p.isBoss)
            });
          }
        });
      });
      onOnlineUsersChange(Array.from(onlineMap.values()));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            isBoss: currentUser.isBoss
          });
        } catch {
          // ignore presence track error
        }
      }
    });

  return channel;
}

/**
 * Subscribe to live Postgres changes across core portal tables so updates sync immediately on all devices
 */
export function subscribeToStudioDataChanges(onChange: () => void): RealtimeChannel {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const triggerSync = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onChange();
    }, 350);
  };

  const channel = supabase
    .channel('nandan-studio-live-data')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, triggerSync)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deliverables' }, triggerSync)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, triggerSync)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_settings' }, triggerSync)
    .subscribe();

  return channel;
}


