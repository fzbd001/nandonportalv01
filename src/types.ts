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
}

export type ExportTimeframe = 'daily' | 'weekly' | 'monthly';

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
