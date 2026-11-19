export interface User {
  id: string;
  name: string;
  role: string;
  isBoss: boolean;
  password: string;
}

export interface AttendanceLog {
  id: string;
  empId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  dateFormatted: string;
  checkInTime: string | null;
  checkInTimestamp: number;
  checkOutTime: string | null;
  isCheckedIn: boolean;
  totalMinutes: number;
}

export interface Deliverable {
  id: string;
  empId: string;
  category: string;
  title: string;
  notes?: string;
  progress: number;
  completed: boolean;
  timestamp: string;
  date: string; // YYYY-MM-DD
}

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  icon: string;
  iconBg: string;
  isRead?: boolean;
  taskId?: string;
}

export type ExportTimeframe = 'daily' | 'weekly' | 'monthly';

export type WorkLocation = 'Office' | 'Home';

export interface WorkLocationRecord {
  location: WorkLocation;
  loginTime: string;
  date: string; // YYYY-MM-DD
}

export interface WorkLocationStore {
  latestByEmp: Record<string, WorkLocationRecord>;
  byDate: Record<string, WorkLocation>; // key: `${empId}__${date}`
}

export interface WorkSession {
  id: string;
  checkInTime: string;
  checkInTimestamp: number;
  checkOutTime: string | null;
  minutes: number;
  location: WorkLocation;
  isSystemLogout?: boolean;
}

export interface DayAttendanceMeta {
  sessions: WorkSession[];
  systemLogout?: boolean;
  systemLogoutTime?: string;
  reCheckInAllowed?: boolean;
  reCheckInGrantedAt?: string;
}

export interface AttendanceMetaStore {
  byKey: Record<string, DayAttendanceMeta>; // key: `${empId}__${date}`
}

export const CREATIVE_CATEGORIES = [
  'Video Editing',
  'Graphic Design',
  'Social Media Content',
  'Social Media Management',
  'Social Media News Card',
  '2D / 3D Animation',
  'Daily Weather Card',
  'Photo Card (Total Numbers)',
  'Portal Update (Total Numbers)',
  'News Edit',
  'Pending Job Next',
] as const;
