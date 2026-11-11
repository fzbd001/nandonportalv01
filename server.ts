import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ifazvnsxtfokswlowjrz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mo5Tlfw1anoI0WqL-2wQOA_U2yr6x9c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory data store for server-authoritative state
interface User {
  id: string;
  name: string;
  role: string;
  isBoss: boolean;
  password: string;
}

interface AttendanceLog {
  id: string;
  empId: string;
  staffName: string;
  date: string;
  dateFormatted: string;
  checkInTime: string | null;
  checkInTimestamp: number;
  checkOutTime: string | null;
  isCheckedIn: boolean;
  totalMinutes: number;
}

interface Deliverable {
  id: string;
  empId: string;
  category: string;
  title: string;
  notes?: string;
  progress: number;
  completed: boolean;
  timestamp: string;
  date: string;
}

let users: User[] = [
  { id: "boss123", name: "Nil Utpal", role: "Creative Director & Boss", isBoss: true, password: "boss123" },
  { id: "EMP-101", name: "Foyez", role: "Graphic designer", isBoss: false, password: "1234" },
  { id: "EMP-102", name: "Alom", role: "Editor-in-chief assistant", isBoss: false, password: "1234" },
  { id: "EMP-103", name: "Shimanto", role: "Motion Animator", isBoss: false, password: "1234" },
  { id: "EMP-104", name: "Belal", role: "Social Media Strategist & Manager", isBoss: false, password: "1234" }
];

function getTodayDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateEnglish(dateObj: Date): string {
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const year = dateObj.getFullYear();
  return `${day} ${month}, ${year}`;
}

function formatTime12h(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

let attendanceLogs: AttendanceLog[] = [];
let deliverables: Deliverable[] = [];

// Seed initial attendance & deliverables
function seedInitialData() {
  const now = new Date();
  const staff = users.filter(u => !u.isBoss);

  staff.forEach((s, idx) => {
    const isFirst = idx === 0;
    const mockShifts = [
      { daysAgo: 0, in: isFirst ? "03:14 PM" : "09:30 AM", out: isFirst ? null : "06:15 PM", mins: isFirst ? 0 : 525, inProg: isFirst },
      { daysAgo: 1, in: "05:52 PM", out: "08:00 AM", mins: 607, inProg: false },
      { daysAgo: 2, in: "02:42 PM", out: "10:12 PM", mins: 450, inProg: false },
      { daysAgo: 3, in: "03:09 PM", out: "11:29 PM", mins: 500, inProg: false },
      { daysAgo: 4, in: "12:23 PM", out: "08:28 PM", mins: 485, inProg: false },
      { daysAgo: 5, in: "11:53 AM", out: "08:35 PM", mins: 522, inProg: false }
    ];

    mockShifts.forEach(shift => {
      const d = new Date(now);
      d.setDate(now.getDate() - shift.daysAgo);
      const dateStr = getTodayDateString(d);

      attendanceLogs.push({
        id: `att-${s.id}-${dateStr}`,
        empId: s.id,
        staffName: s.name,
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

  const today = getTodayDateString();
  deliverables = [
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

seedInitialData();

// --- REST API Endpoints ---
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'NANDAN Studio Portal API',
    database: 'Supabase PostgreSQL',
    supabaseUrl: SUPABASE_URL,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/supabase/status', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        res.json({
          connected: true,
          tablesReady: false,
          supabaseUrl: SUPABASE_URL,
          message: 'Connected to Supabase, but schema tables need to be created.'
        });
        return;
      }
      res.json({
        connected: false,
        tablesReady: false,
        supabaseUrl: SUPABASE_URL,
        message: error.message
      });
      return;
    }
    res.json({
      connected: true,
      tablesReady: true,
      supabaseUrl: SUPABASE_URL,
      recordCount: data ? data.length : 0,
      message: 'Supabase database connected & operational.'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ connected: false, tablesReady: false, message: msg });
  }
});

// Users
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data && data.length > 0) {
      const supaUsers: User[] = data.map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        isBoss: Boolean(u.is_boss),
        password: u.password
      }));
      res.json(supaUsers);
      return;
    }
  } catch {
    // fallback to memory
  }
  res.json(users);
});

app.post('/api/users', async (req: Request, res: Response) => {
  const { id, name, role, password } = req.body;
  if (!id || !name || !role) {
    res.status(400).json({ error: 'Missing required employee fields' });
    return;
  }
  const cleanId = String(id).trim().toUpperCase();
  if (users.some(u => u.id.toLowerCase() === cleanId.toLowerCase())) {
    res.status(409).json({ error: 'Employee ID already exists' });
    return;
  }
  const newUser: User = {
    id: cleanId,
    name: String(name).trim(),
    role: String(role).trim(),
    isBoss: false,
    password: String(password || '1234').trim()
  };
  users.push(newUser);

  // Sync to Supabase
  try {
    await supabase.from('users').upsert({
      id: newUser.id,
      name: newUser.name,
      role: newUser.role,
      is_boss: newUser.isBoss,
      password: newUser.password
    });
  } catch {
    // ignore
  }

  res.status(201).json(newUser);
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role, password } = req.body;
  const user = users.find(u => u.id.toLowerCase() === id.toLowerCase());
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (name) user.name = String(name).trim();
  if (role) user.role = String(role).trim();
  if (password) user.password = String(password).trim();

  // Sync to Supabase
  try {
    await supabase.from('users').update({
      name: user.name,
      role: user.role,
      password: user.password
    }).eq('id', user.id);
  } catch {
    // ignore
  }

  res.json(user);
});

// Attendance
app.get('/api/attendance', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('attendance_logs').select('*');
    if (!error && data && data.length > 0) {
      const supaLogs: AttendanceLog[] = data.map((a: any) => ({
        id: a.id,
        empId: a.emp_id,
        staffName: a.staff_name,
        date: a.date,
        dateFormatted: a.date_formatted,
        checkInTime: a.check_in_time,
        checkInTimestamp: Number(a.check_in_timestamp) || 0,
        checkOutTime: a.check_out_time,
        isCheckedIn: Boolean(a.is_checked_in),
        totalMinutes: Number(a.total_minutes) || 0
      }));
      res.json(supaLogs);
      return;
    }
  } catch {
    // fallback
  }
  res.json(attendanceLogs);
});

app.post('/api/attendance/check-in', async (req: Request, res: Response) => {
  const { empId } = req.body;
  const user = users.find(u => u.id === empId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const today = getTodayDateString();
  const now = new Date();
  const timeStr = formatTime12h(now);

  let log = attendanceLogs.find(a => a.empId === empId && a.date === today);
  if (!log) {
    log = {
      id: `att-${Date.now()}`,
      empId,
      staffName: user.name,
      date: today,
      dateFormatted: formatDateEnglish(now),
      checkInTime: timeStr,
      checkInTimestamp: now.getTime(),
      checkOutTime: null,
      isCheckedIn: true,
      totalMinutes: 0
    };
    attendanceLogs.unshift(log);
  } else {
    log.isCheckedIn = true;
    log.checkInTime = timeStr;
    log.checkInTimestamp = now.getTime();
    log.checkOutTime = null;
    log.dateFormatted = formatDateEnglish(now);
  }

  // Sync to Supabase
  try {
    await supabase.from('attendance_logs').upsert({
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
  } catch {
    // ignore
  }

  res.json({ message: 'Checked in successfully', log });
});

app.post('/api/attendance/check-out', async (req: Request, res: Response) => {
  const { empId } = req.body;
  const today = getTodayDateString();
  const log = attendanceLogs.find(a => a.empId === empId && a.date === today);
  if (!log || !log.isCheckedIn) {
    res.status(400).json({ error: 'No active check-in found for today' });
    return;
  }

  const now = new Date();
  log.isCheckedIn = false;
  log.checkOutTime = formatTime12h(now);
  const elapsedMinutes = Math.max(1, Math.round((now.getTime() - log.checkInTimestamp) / 60000));
  log.totalMinutes = (log.totalMinutes || 0) + elapsedMinutes;

  // Sync to Supabase
  try {
    await supabase.from('attendance_logs').upsert({
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
  } catch {
    // ignore
  }

  res.json({ message: 'Checked out successfully', log });
});

// Deliverables
app.get('/api/deliverables', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('deliverables').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const supaDeliv: Deliverable[] = data.map((d: any) => ({
        id: d.id,
        empId: d.emp_id,
        category: d.category,
        title: d.title,
        notes: d.notes || '',
        progress: Number(d.progress) || 0,
        completed: Boolean(d.completed),
        timestamp: d.timestamp,
        date: d.date
      }));
      res.json(supaDeliv);
      return;
    }
  } catch {
    // fallback
  }
  res.json(deliverables);
});

app.post('/api/deliverables', async (req: Request, res: Response) => {
  const { empId, category, title, notes, progress } = req.body;
  if (!empId || !title) {
    res.status(400).json({ error: 'Employee ID and Title are required' });
    return;
  }

  const progNum = Math.min(100, Math.max(0, parseInt(progress) || 0));
  const newTask: Deliverable = {
    id: `del-${Date.now()}`,
    empId,
    category: category || 'Creative Deliverable',
    title: String(title).trim(),
    notes: notes ? String(notes).trim() : '',
    progress: progNum,
    completed: progNum >= 100,
    timestamp: formatTime12h(new Date()),
    date: getTodayDateString()
  };

  deliverables.unshift(newTask);

  // Sync to Supabase
  try {
    await supabase.from('deliverables').upsert({
      id: newTask.id,
      emp_id: newTask.empId,
      category: newTask.category,
      title: newTask.title,
      notes: newTask.notes,
      progress: newTask.progress,
      completed: newTask.completed,
      timestamp: newTask.timestamp,
      date: newTask.date
    });
  } catch {
    // ignore
  }

  res.status(201).json(newTask);
});

app.patch('/api/deliverables/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { progress, completed } = req.body;
  const task = deliverables.find(d => d.id === id);
  if (!task) {
    res.status(404).json({ error: 'Deliverable not found' });
    return;
  }

  if (typeof progress === 'number') {
    task.progress = Math.min(100, Math.max(0, progress));
    task.completed = task.progress >= 100;
  } else if (typeof completed === 'boolean') {
    task.completed = completed;
    task.progress = completed ? 100 : 0;
  }

  // Sync to Supabase
  try {
    await supabase.from('deliverables').update({
      progress: task.progress,
      completed: task.completed
    }).eq('id', task.id);
  } catch {
    // ignore
  }

  res.json(task);
});

app.delete('/api/deliverables/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = deliverables.findIndex(d => d.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Deliverable not found' });
    return;
  }
  const deleted = deliverables.splice(index, 1)[0];

  // Sync to Supabase
  try {
    await supabase.from('deliverables').delete().eq('id', id);
  } catch {
    // ignore
  }

  res.json({ message: 'Deleted', task: deleted });
});

// Export CSV endpoint directly from Node.js
app.get('/api/reports/csv', (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as string) || 'daily';
  const filterMember = (req.query.member as string) || 'ALL';
  const today = getTodayDateString();

  let targetUsers = users.filter(u => !u.isBoss);
  if (filterMember !== 'ALL') {
    targetUsers = targetUsers.filter(u => u.id === filterMember);
  }

  let csv = "Employee Name,Employee ID,Designation,Period,Check In,Check Out,Total Minutes,Total Hours,Tasks Count,Completed Tasks\n";

  targetUsers.forEach(staff => {
    const todayLog = attendanceLogs.find(a => a.empId === staff.id && a.date === today);
    const staffTasks = deliverables.filter(d => d.empId === staff.id);
    const completedTasks = staffTasks.filter(t => t.progress >= 100).length;

    const checkIn = todayLog ? (todayLog.checkInTime || '--:--') : '--:--';
    const checkOut = todayLog ? (todayLog.checkOutTime || '--:--') : '--:--';
    const totalMinutes = todayLog ? todayLog.totalMinutes : 0;

    csv += `"${staff.name}","${staff.id}","${staff.role}","${timeframe.toUpperCase()}","${checkIn}","${checkOut}","${totalMinutes}","${(totalMinutes / 60).toFixed(1)}","${staffTasks.length}","${completedTasks}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="NANDAN_Studio_${timeframe}_report_${today}.csv"`);
  res.send(csv);
});

// --- Vite Middleware in Development / Static Files in Production ---
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 NANDAN Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
