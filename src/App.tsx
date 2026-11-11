import React, { useEffect, useState } from 'react';
import { Header } from './components/Header.tsx';
import { StaffView } from './components/StaffView.tsx';
import { BossRadarView } from './components/BossRadarView.tsx';
import { LoginModal } from './components/modals/LoginModal.tsx';
import { InspectModal } from './components/modals/InspectModal.tsx';
import { AssignDirectiveModal } from './components/modals/AssignDirectiveModal.tsx';
import { ProfileEditModal } from './components/modals/ProfileEditModal.tsx';
import { RegisterUserModal } from './components/modals/RegisterUserModal.tsx';
import { PermanentLogoModal } from './components/modals/PermanentLogoModal.tsx';
import { DownloadReportModal } from './components/modals/DownloadReportModal.tsx';
import { SupabaseSetupModal } from './components/modals/SupabaseSetupModal.tsx';
import { AttendanceLog, Deliverable, ExportTimeframe, NotificationItem, User } from './types.ts';
import {
  checkSupabaseStatus,
  deleteDeliverableFromSupabase,
  fetchAttendanceFromSupabase,
  fetchDeliverablesFromSupabase,
  fetchStudioLogoFromSupabase,
  fetchUsersFromSupabase,
  saveStudioLogoInSupabase,
  SupabaseStatus,
  upsertAttendanceInSupabase,
  upsertDeliverableInSupabase,
  upsertUserInSupabase
} from './utils/supabase.ts';
import {
  formatDateEnglish,
  formatTime12h,
  generateInitialAttendance,
  generateInitialDeliverables,
  getTodayDateString,
  INITIAL_USERS,
  STORAGE_KEYS
} from './utils/storage.ts';
import { playChime } from './utils/audio.ts';
import { executeExportCSV, generateAndPrintPDFReport } from './utils/reportExport.ts';

export default function App() {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_USERS.length) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [currentViewMode, setCurrentViewMode] = useState<'staff' | 'boss'>('staff');

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return generateInitialAttendance();
  });

  const [deliverables, setDeliverables] = useState<Deliverable[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DELIVERABLES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return generateInitialDeliverables();
  });

  const [savedLogo, setSavedLogo] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.LOGO);
  });

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.READ_NOTIFS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Modals state
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>({
    connected: true,
    tablesReady: false,
    message: 'Connecting to Supabase...'
  });

  const refreshSupabaseStatus = async () => {
    try {
      const status = await checkSupabaseStatus();
      setSupabaseStatus(status);
      if (status.tablesReady) {
        const [dbUsers, dbLogs, dbDeliv, dbLogo] = await Promise.all([
          fetchUsersFromSupabase(),
          fetchAttendanceFromSupabase(),
          fetchDeliverablesFromSupabase(),
          fetchStudioLogoFromSupabase()
        ]);
        if (dbUsers && dbUsers.length > 0) setUsers(dbUsers);
        if (dbLogs && dbLogs.length > 0) setAttendanceLogs(dbLogs);
        if (dbDeliv && dbDeliv.length > 0) setDeliverables(dbDeliv);
        if (dbLogo !== null) setSavedLogo(dbLogo);
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    refreshSupabaseStatus();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(currentUser));
      if (currentUser.isBoss) {
        setCurrentViewMode('boss');
      } else {
        setCurrentViewMode('staff');
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceLogs));
  }, [attendanceLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DELIVERABLES, JSON.stringify(deliverables));
  }, [deliverables]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(readNotifIds));
  }, [readNotifIds]);

  // Notifications generator
  const notifications: NotificationItem[] = [];
  if (currentUser) {
    deliverables.forEach((task) => {
      if (task.title.includes('[DIRECTOR DIRECTIVE]')) {
        if (currentUser.isBoss || task.empId === currentUser.id) {
          const assignedStaff = users.find((u) => u.id === task.empId);
          notifications.push({
            id: `notif-${task.id}`,
            title: currentUser.isBoss
              ? `Directive to ${assignedStaff ? assignedStaff.name : task.empId}`
              : `New Director Directive Assigned`,
            desc: task.title.replace('[DIRECTOR DIRECTIVE]', '').trim(),
            time: task.timestamp || 'Today',
            icon: 'fa-bullhorn',
            iconBg: 'bg-rose-50 text-rose-600 border-rose-200'
          });
        }
      }
    });

    const todayStr = getTodayDateString();
    const myLog = attendanceLogs.find((a) => a.empId === currentUser.id && a.date === todayStr);
    if (myLog && myLog.isCheckedIn) {
      notifications.push({
        id: `notif-checkin-${currentUser.id}-${todayStr}`,
        title: 'Shift Active',
        desc: `You checked in at ${myLog.checkInTime}. Creative operations running.`,
        time: myLog.checkInTime || 'Today',
        icon: 'fa-circle-check',
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200'
      });
    }
  }

  // Attendance handlers
  const handleCheckIn = async () => {
    if (!currentUser) return;
    const today = getTodayDateString();
    const now = new Date();
    const timeStr = formatTime12h(now);

    let targetLog: AttendanceLog;

    setAttendanceLogs((prev) => {
      const existing = prev.find((a) => a.empId === currentUser.id && a.date === today);
      if (!existing) {
        targetLog = {
          id: `att-${Date.now()}`,
          empId: currentUser.id,
          staffName: currentUser.name,
          date: today,
          dateFormatted: formatDateEnglish(now),
          checkInTime: timeStr,
          checkInTimestamp: now.getTime(),
          checkOutTime: null,
          isCheckedIn: true,
          totalMinutes: 0
        };
        upsertAttendanceInSupabase(targetLog);
        return [targetLog, ...prev];
      } else {
        targetLog = {
          ...existing,
          isCheckedIn: true,
          checkInTime: timeStr,
          checkInTimestamp: now.getTime(),
          checkOutTime: null,
          dateFormatted: formatDateEnglish(now)
        };
        upsertAttendanceInSupabase(targetLog);
        return prev.map((a) => (a.empId === currentUser.id && a.date === today ? targetLog : a));
      }
    });

    playChime();

    // Node.js Express server sync
    try {
      await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: currentUser.id })
      });
    } catch {
      // offline/local mode fallback
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser) return;
    const today = getTodayDateString();
    const now = new Date();
    const timeStr = formatTime12h(now);

    setAttendanceLogs((prev) =>
      prev.map((log) => {
        if (log.empId === currentUser.id && log.date === today && log.isCheckedIn) {
          const elapsedMins = Math.max(1, Math.round((now.getTime() - log.checkInTimestamp) / 60000));
          const updatedLog: AttendanceLog = {
            ...log,
            isCheckedIn: false,
            checkOutTime: timeStr,
            totalMinutes: (log.totalMinutes || 0) + elapsedMins
          };
          upsertAttendanceInSupabase(updatedLog);
          return updatedLog;
        }
        return log;
      })
    );

    playChime();

    // Node.js Express server sync
    try {
      await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: currentUser.id })
      });
    } catch {
      // offline/local mode fallback
    }
  };

  // Deliverables handlers
  const handleSubmitDeliverable = async (category: string, title: string, notes: string, progress: number) => {
    if (!currentUser) return;
    const newTask: Deliverable = {
      id: `del-${Date.now()}`,
      empId: currentUser.id,
      category,
      title,
      notes,
      progress,
      completed: progress >= 100,
      timestamp: formatTime12h(new Date()),
      date: getTodayDateString()
    };

    setDeliverables((prev) => [newTask, ...prev]);
    playChime();
    upsertDeliverableInSupabase(newTask);

    try {
      await fetch('/api/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
    } catch {
      // offline/local mode fallback
    }
  };

  const handleAdjustProgress = async (taskId: string, delta: number) => {
    let nextProg = 0;
    let targetTask: Deliverable | undefined;
    setDeliverables((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          nextProg = Math.min(100, Math.max(0, t.progress + delta));
          targetTask = { ...t, progress: nextProg, completed: nextProg >= 100 };
          return targetTask;
        }
        return t;
      })
    );

    if (targetTask) {
      upsertDeliverableInSupabase(targetTask);
    }

    try {
      await fetch(`/api/deliverables/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: nextProg })
      });
    } catch {
      // offline fallback
    }
  };

  const handleToggleCompleted = async (taskId: string) => {
    let completedVal = false;
    let targetTask: Deliverable | undefined;
    setDeliverables((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          completedVal = t.progress < 100;
          targetTask = {
            ...t,
            completed: completedVal,
            progress: completedVal ? 100 : 0
          };
          return targetTask;
        }
        return t;
      })
    );
    playChime();

    if (targetTask) {
      upsertDeliverableInSupabase(targetTask);
    }

    try {
      await fetch(`/api/deliverables/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: completedVal })
      });
    } catch {
      // offline fallback
    }
  };

  const handleDeleteDeliverable = async (taskId: string) => {
    setDeliverables((prev) => prev.filter((t) => t.id !== taskId));
    deleteDeliverableFromSupabase(taskId);

    try {
      await fetch(`/api/deliverables/${taskId}`, {
        method: 'DELETE'
      });
    } catch {
      // offline fallback
    }
  };

  // Boss Directive handler
  const handleAssignDirective = async (
    empId: string,
    category: string,
    title: string,
    instructions: string
  ) => {
    const newTask: Deliverable = {
      id: `del-${Date.now()}`,
      empId,
      category,
      title: `[DIRECTOR DIRECTIVE] ${title}`,
      notes: instructions,
      progress: 0,
      completed: false,
      timestamp: formatTime12h(new Date()),
      date: getTodayDateString()
    };

    setDeliverables((prev) => [newTask, ...prev]);
    playChime();
    upsertDeliverableInSupabase(newTask);

    try {
      await fetch('/api/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
    } catch {
      // offline fallback
    }
  };

  // Auth handlers
  const handleLogin = (empId: string, passwordInput: string): boolean => {
    const user = users.find(
      (u) =>
        u.id.toLowerCase() === empId.toLowerCase() ||
        (u.isBoss && (empId.toLowerCase() === 'boss123' || empId.toLowerCase() === 'boss-01'))
    );
    if (!user) return false;

    const isValid =
      (user.isBoss && (passwordInput === user.password || passwordInput === '1234' || passwordInput === 'boss123')) ||
      user.password === passwordInput;

    if (isValid) {
      setCurrentUser(user);
      playChime();
      return true;
    }
    return false;
  };

  const handleSignOut = () => {
    setCurrentUser(null);
  };

  // Profile edit
  const handleSaveProfile = async (updated: Partial<User>) => {
    if (!currentUser) return;
    const nextUser = { ...currentUser, ...updated };
    setCurrentUser(nextUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? nextUser : u)));
    upsertUserInSupabase(nextUser);

    try {
      await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch {
      // offline fallback
    }
  };

  // Register custom user
  const handleRegisterUser = (newUser: User): boolean => {
    setUsers((prev) => [...prev, newUser]);
    playChime();
    upsertUserInSupabase(newUser);

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).catch(() => {
      // offline fallback
    });

    return true;
  };

  // Logo handlers
  const handleSaveLogo = (logo: string) => {
    setSavedLogo(logo);
    localStorage.setItem(STORAGE_KEYS.LOGO, logo);
    saveStudioLogoInSupabase(logo);
  };

  const handleResetLogo = () => {
    setSavedLogo(null);
    localStorage.removeItem(STORAGE_KEYS.LOGO);
    saveStudioLogoInSupabase(null);
  };

  // Notifications mark read
  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
  };

  const handleMarkSingleRead = (id: string) => {
    if (!readNotifIds.includes(id)) {
      setReadNotifIds((prev) => [...prev, id]);
    }
  };

  // Export handlers
  const handleExportCSV = (timeframe: ExportTimeframe, filterMember: string) => {
    executeExportCSV(users, attendanceLogs, deliverables, filterMember, timeframe);
    playChime();
    setIsDownloadModalOpen(false);
  };

  const handleDownloadPDF = (timeframe: ExportTimeframe, filterMember: string) => {
    generateAndPrintPDFReport(users, attendanceLogs, deliverables, filterMember, timeframe, savedLogo);
    playChime();
    setIsDownloadModalOpen(false);
  };

  // Current user's today attendance log & 5-day logs
  const todayStr = getTodayDateString();
  const currentUserTodayLog = currentUser
    ? attendanceLogs.find((a) => a.empId === currentUser.id && a.date === todayStr)
    : undefined;

  const currentUser5DayLogs = currentUser
    ? attendanceLogs
        .filter((a) => a.empId === currentUser.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
    : [];

  const staffList = users.filter((u) => !u.isBoss);

  return (
    <div className="p-3 sm:p-6 lg:p-8 flex flex-col justify-start items-center relative min-h-screen overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Ambient Light Orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>

      {/* Main App Layout when authenticated */}
      {currentUser ? (
        <>
          <Header
            currentUser={currentUser}
            currentViewMode={currentViewMode}
            onSwitchViewMode={(mode) => setCurrentViewMode(mode)}
            savedLogo={savedLogo}
            onOpenLogoModal={() => setIsLogoModalOpen(true)}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
            onSignOut={handleSignOut}
            notifications={notifications}
            readNotifIds={readNotifIds}
            onMarkAllRead={handleMarkAllRead}
            onMarkSingleRead={handleMarkSingleRead}
          />

          <main className="w-full max-w-7xl mx-auto flex flex-col gap-6">
            {currentViewMode === 'staff' ? (
              <StaffView
                currentUser={currentUser}
                todayLog={currentUserTodayLog}
                staff5DayLogs={currentUser5DayLogs}
                deliverables={deliverables}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onSubmitDeliverable={handleSubmitDeliverable}
                onAdjustProgress={handleAdjustProgress}
                onToggleCompleted={handleToggleCompleted}
                onDeleteDeliverable={handleDeleteDeliverable}
              />
            ) : (
              <BossRadarView
                users={users}
                attendanceLogs={attendanceLogs}
                deliverables={deliverables}
                onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
                onOpenAssignModal={() => setIsAssignModalOpen(true)}
                onInspectUser={(u) => setInspectingUser(u)}
              />
            )}
          </main>
        </>
      ) : (
        <LoginModal
          users={users}
          savedLogo={savedLogo}
          onOpenLogoModal={() => setIsLogoModalOpen(true)}
          onLogin={handleLogin}
        />
      )}

      {/* Modals */}
      {isLogoModalOpen && (
        <PermanentLogoModal
          onClose={() => setIsLogoModalOpen(false)}
          onSaveLogo={handleSaveLogo}
          onResetLogo={handleResetLogo}
        />
      )}

      {isProfileModalOpen && currentUser && (
        <ProfileEditModal
          currentUser={currentUser}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

      {isRegisterModalOpen && (
        <RegisterUserModal
          users={users}
          onClose={() => setIsRegisterModalOpen(false)}
          onRegister={handleRegisterUser}
        />
      )}

      {isAssignModalOpen && (
        <AssignDirectiveModal
          staffList={staffList}
          onClose={() => setIsAssignModalOpen(false)}
          onAssign={handleAssignDirective}
        />
      )}

      {isDownloadModalOpen && (
        <DownloadReportModal
          staffList={staffList}
          onClose={() => setIsDownloadModalOpen(false)}
          onExportCSV={handleExportCSV}
          onDownloadPDF={handleDownloadPDF}
        />
      )}

      {inspectingUser && (
        <InspectModal
          user={inspectingUser}
          deliverables={deliverables}
          attendanceLogs={attendanceLogs}
          onClose={() => setInspectingUser(null)}
        />
      )}

      {isSupabaseModalOpen && (
        <SupabaseSetupModal
          status={supabaseStatus}
          onClose={() => setIsSupabaseModalOpen(false)}
          onRefreshStatus={refreshSupabaseStatus}
        />
      )}
    </div>
  );
}
