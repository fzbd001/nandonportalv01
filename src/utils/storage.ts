import {
  AttendanceLog,
  AttendanceMetaStore,
  ChatMessage,
  DayAttendanceMeta,
  Deliverable,
  User,
  WorkLocation,
  WorkLocationStore,
  WorkSession
} from '../types.ts';

export const INITIAL_USERS: User[] = [
  { id: "boss123", name: "Nil Utpal", role: "Creative Director & Boss", isBoss: true, password: "boss123" },
  { id: "EMP-101", name: "Foyez", role: "Graphic designer", isBoss: false, password: "1234" },
  { id: "EMP-102", name: "Alom", role: "Editor-in-chief assistant", isBoss: false, password: "1234" },
  { id: "EMP-103", name: "Shimanto", role: "Motion Animator", isBoss: false, password: "1234" },
  { id: "EMP-104", name: "Belal", role: "Social Media Strategist & Manager", isBoss: false, password: "1234" }
];

export const STORAGE_KEYS = {
  USERS: 'nandan_users_v6',
  ACTIVE_USER: 'nandan_active_user_v6',
  ATTENDANCE: 'nandan_attendance_v6',
  DELIVERABLES: 'nandan_deliverables_v6',
  LOGO: 'nandan_custom_logo_v6',
  READ_NOTIFS: 'nandan_read_notifs_v6',
  ANNOUNCEMENT: 'nandan_studio_announcement_v6',
  WORK_LOCATIONS: 'nandan_work_locations_v6',
  ATTENDANCE_META: 'nandan_attendance_meta_v6',
  ACTIVE_SESSION_LOCATION: 'nandan_active_session_location_v6',
  CHAT_MESSAGES: 'nandan_studio_chat_v6',
  CHAT_LAST_READ: 'nandan_studio_chat_last_read_v6',
};

export const MAX_CHAT_HISTORY = 250;

export function mergeChatMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  existing.forEach((m) => {
    if (m && m.id) byId.set(m.id, m);
  });
  incoming.forEach((m) => {
    if (m && m.id) byId.set(m.id, m);
  });
  return Array.from(byId.values())
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-MAX_CHAT_HISTORY);
}

export const OFFICE_MAX_SHIFT_MINUTES = 9 * 60; // 9 hours (540 mins)
export const OFFICE_MAX_SHIFT_MS = OFFICE_MAX_SHIFT_MINUTES * 60 * 1000;

export const EMPTY_WORK_LOCATIONS: WorkLocationStore = {
  latestByEmp: {},
  byDate: {},
};

export const EMPTY_ATTENDANCE_META: AttendanceMetaStore = {
  byKey: {},
};

export function getAttendanceMetaKey(empId: string, date: string): string {
  return `${empId}__${date}`;
}

export function getDayAttendanceMeta(
  store: AttendanceMetaStore | undefined,
  empId: string,
  date: string
): DayAttendanceMeta | null {
  if (!store || !store.byKey) return null;
  return store.byKey[getAttendanceMetaKey(empId, date)] || null;
}

export function formatDurationShort(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins === 0) return `${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function formatSessionLabel(session: WorkSession, index: number): string {
  const prefix = `S${index + 1}`;
  if (!session.checkOutTime) {
    return `${prefix}: ${session.checkInTime}–Active`;
  }
  const dur = formatDurationShort(session.minutes);
  const suffix = session.isSystemLogout ? ' [System Logout]' : '';
  return `${prefix}: ${session.checkInTime}–${session.checkOutTime} (${dur})${suffix}`;
}

export function formatSessionsSummary(sessions: WorkSession[] | undefined): string {
  if (!sessions || sessions.length === 0) return '';
  return sessions.map((s, idx) => formatSessionLabel(s, idx)).join(', ');
}

export function getWorkLocationForDate(
  store: WorkLocationStore | undefined,
  empId: string,
  date: string,
  allowLatestFallback = false
): WorkLocation | null {
  if (!store) return null;
  const dateKey = `${empId}__${date}`;
  if (store.byDate && store.byDate[dateKey]) {
    return store.byDate[dateKey];
  }
  const latest = store.latestByEmp?.[empId];
  if (latest && (latest.date === date || allowLatestFallback)) {
    return latest.location;
  }
  return null;
}

export function getPersistentWorkLocation(
  store: WorkLocationStore | undefined,
  empId: string,
  date: string,
  sessionLocation?: WorkLocation | null
): WorkLocation | null {
  const dateKey = `${empId}__${date}`;
  if (store?.byDate && store.byDate[dateKey]) {
    return store.byDate[dateKey];
  }
  if (sessionLocation === 'Home' || sessionLocation === 'Office') {
    return sessionLocation;
  }
  const latest = store?.latestByEmp?.[empId];
  if (latest?.location === 'Home' || latest?.location === 'Office') {
    return latest.location;
  }
  return null;
}

export const DEFAULT_ANNOUNCEMENT =
  'Welcome to NANDAN Broadcast & Creative Media — Please check in on arrival and keep your daily deliverables updated.';

export function parseAnnouncements(raw: string | null | undefined): string[] {
  if (!raw) return [DEFAULT_ANNOUNCEMENT];
  const trimmed = raw.trim();
  if (!trimmed) return [DEFAULT_ANNOUNCEMENT];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .map((item) => String(item).replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (cleaned.length > 0) return cleaned;
      }
    } catch {
      // fallback to plain string parsing
    }
  }

  // Also support manual separator if pasted with || or newlines
  const splitItems = trimmed
    .split(/\s*\|\|\s*|\n+/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return splitItems.length > 0 ? splitItems : [DEFAULT_ANNOUNCEMENT];
}

export function serializeAnnouncements(items: string[]): string {
  const cleaned = items
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return JSON.stringify(cleaned.length > 0 ? cleaned : [DEFAULT_ANNOUNCEMENT]);
}

export const STUDIO_TIMEZONE = 'Asia/Dhaka';

export function getTodayDateString(d = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: STUDIO_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fallback below
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateEnglish(dateObj: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: STUDIO_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).formatToParts(dateObj);
    const day = parts.find((p) => p.type === 'day')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const year = parts.find((p) => p.type === 'year')?.value;
    if (day && month && year) {
      return `${day} ${month}, ${year}`;
    }
  } catch {
    // fallback below
  }
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const year = dateObj.getFullYear();
  return `${day} ${month}, ${year}`;
}

export function formatTime12h(date: Date): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: STUDIO_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
    return formatted.replace(/\s+/g, ' ').trim().toUpperCase();
  } catch {
    // fallback below
  }
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

export function formatStudioClockHeader(date = new Date()): string {
  const timeStr = formatTime12h(date);
  try {
    const dayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: STUDIO_TIMEZONE,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(date);
    return `${timeStr} • ${dayStr} (BDT)`;
  } catch {
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${timeStr} • ${dayStr} (BDT)`;
  }
}

export interface StudioDaySlot {
  daysAgo: number;
  dateStr: string;
  dayName: string;
  dayNum: number;
  monthShort: string;
  shortLabel: string;
  fullLabel: string;
  isToday: boolean;
  dateObj: Date;
}

/**
 * Generates the last N calendar days anchored strictly to Studio Timezone (Asia/Dhaka),
 * ordered oldest -> today (matching heatmap & report windows globally across all countries).
 */
export function getLastNDaysStudioDates(count: number, baseDate = new Date()): StudioDaySlot[] {
  const todayStr = getTodayDateString(baseDate);
  const [y, m, d] = todayStr.split('-').map((n) => parseInt(n, 10));

  return Array.from({ length: count }, (_, idx) => {
    const daysAgo = count - 1 - idx;
    // 06:00 UTC === 12:00 PM Asia/Dhaka (noon — completely immune to DST or boundary drift)
    const noonUtc = new Date(Date.UTC(y, m - 1, d - daysAgo, 6, 0, 0));
    const dateStr = getTodayDateString(noonUtc);
    const dayName = new Intl.DateTimeFormat('en-US', {
      timeZone: STUDIO_TIMEZONE,
      weekday: 'short'
    }).format(noonUtc);
    const monthShort = new Intl.DateTimeFormat('en-US', {
      timeZone: STUDIO_TIMEZONE,
      month: 'short'
    }).format(noonUtc);
    const dayNum = parseInt(dateStr.split('-')[2], 10);
    const isToday = daysAgo === 0;

    return {
      daysAgo,
      dateStr,
      dayName,
      dayNum,
      monthShort,
      shortLabel: isToday ? 'Today' : dayName,
      fullLabel: isToday ? `Today (${monthShort} ${dayNum})` : `${dayName}, ${monthShort} ${dayNum}`,
      isToday,
      dateObj: noonUtc
    };
  });
}

/**
 * Finds an employee's currently active live shift (within the last 36 hours, even across midnight
 * or legacy local-timezone records), or falls back to today's Studio Date attendance log.
 */
export function findActiveOrTodayLog(
  attendanceLogs: AttendanceLog[],
  empId: string,
  todayStr: string = getTodayDateString()
): AttendanceLog | undefined {
  const nowMs = Date.now();
  const maxActiveAgeMs = 36 * 60 * 60 * 1000;

  const activeLogs = attendanceLogs
    .filter((a) => {
      if (a.empId !== empId || !a.isCheckedIn) return false;
      if (a.date === todayStr) return true;
      if (a.checkInTimestamp && nowMs - a.checkInTimestamp <= maxActiveAgeMs) return true;
      return false;
    })
    .sort((a, b) => (b.checkInTimestamp || 0) - (a.checkInTimestamp || 0));

  if (activeLogs.length > 0) {
    return activeLogs[0];
  }

  return attendanceLogs.find((a) => a.empId === empId && a.date === todayStr);
}

export function generateInitialAttendance(): AttendanceLog[] {
  const seeded: AttendanceLog[] = [];
  const staffMembers = INITIAL_USERS.filter(u => !u.isBoss);
  const last7Slots = getLastNDaysStudioDates(7);

  staffMembers.forEach((staff, staffIdx) => {
    // Foyez has an active shift today, others have realistic history
    const isFirstActive = staffIdx === 0;

    const mockShifts = [
      { daysAgo: 0, in: isFirstActive ? "03:14 PM" : null, out: null, mins: 0, inProg: isFirstActive },
      { daysAgo: 1, in: "05:52 PM", out: "08:00 AM", mins: 607, inProg: false },
      { daysAgo: 2, in: "02:42 PM", out: "10:12 PM", mins: 450, inProg: false },
      { daysAgo: 3, in: "03:09 PM", out: "11:29 PM", mins: 500, inProg: false },
      { daysAgo: 4, in: "12:23 PM", out: "08:28 PM", mins: 485, inProg: false },
      { daysAgo: 5, in: "11:53 AM", out: "08:35 PM", mins: 522, inProg: false },
      { daysAgo: 6, in: "10:15 AM", out: "06:45 PM", mins: 510, inProg: false }
    ];

    mockShifts.forEach(shift => {
      const slot = last7Slots.find((s) => s.daysAgo === shift.daysAgo);
      const d = slot ? slot.dateObj : new Date();
      const dateStr = slot ? slot.dateStr : getTodayDateString(d);

      seeded.push({
        id: `att-${staff.id}-${dateStr}`,
        empId: staff.id,
        staffName: staff.name,
        date: dateStr,
        dateFormatted: formatDateEnglish(d),
        checkInTime: shift.in,
        checkInTimestamp: d.getTime() - (shift.daysAgo * 86400000),
        checkOutTime: shift.out,
        isCheckedIn: shift.inProg,
        totalMinutes: shift.mins
      });
    });
  });

  return seeded;
}

export function generateInitialDeliverables(): Deliverable[] {
  const today = getTodayDateString();
  return [
    {
      id: "del-1",
      empId: "EMP-101",
      category: "Graphic Design",
      title: "Eid Special Promo Card Export",
      notes: "1080x1350 Instagram & Facebook feeds with studio branding",
      progress: 100,
      completed: true,
      timestamp: "11:15 AM",
      date: today
    },
    {
      id: "del-2",
      empId: "EMP-101",
      category: "Daily Weather Card",
      title: "Dhaka & Regional Weather Broadcast Overlay",
      notes: "High-res PNG and animated lower third assets",
      progress: 60,
      completed: false,
      timestamp: "03:30 PM",
      date: today
    },
    {
      id: "del-3",
      empId: "EMP-102",
      category: "News Edit",
      title: "Documentary Script & Teleprompter Final Polish",
      notes: "Approved by creative director Nil Utpal",
      progress: 100,
      completed: true,
      timestamp: "11:30 AM",
      date: today
    },
    {
      id: "del-4",
      empId: "EMP-103",
      category: "2D / 3D Animation",
      title: "NANDAN Studio Opening 3D Ident Motion",
      notes: "Cinema 4D render queued, sound sync completed",
      progress: 80,
      completed: false,
      timestamp: "01:45 PM",
      date: today
    },
    {
      id: "del-5",
      empId: "EMP-104",
      category: "Social Media Management",
      title: "Weekly Analytics Review & Viral Clip Re-cuts",
      notes: "Engagement up 24% on TikTok and YouTube Shorts",
      progress: 45,
      completed: false,
      timestamp: "02:10 PM",
      date: today
    }
  ];
}
