import { AttendanceLog, Deliverable, User } from '../types.ts';

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
};

export function getTodayDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateEnglish(dateObj: Date): string {
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const year = dateObj.getFullYear();
  return `${day} ${month}, ${year}`;
}

export function formatTime12h(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

export function generateInitialAttendance(): AttendanceLog[] {
  const seeded: AttendanceLog[] = [];
  const now = new Date();
  const staffMembers = INITIAL_USERS.filter(u => !u.isBoss);

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
      const d = new Date(now);
      d.setDate(now.getDate() - shift.daysAgo);
      const dateStr = getTodayDateString(d);

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
