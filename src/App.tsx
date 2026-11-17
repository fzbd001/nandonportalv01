import React, { useEffect, useState } from 'react';
import { Header } from './components/Header.tsx';
import { UpdateTicker } from './components/UpdateTicker.tsx';
import { StaffView } from './components/StaffView.tsx';
import { BossRadarView } from './components/BossRadarView.tsx';
import { LoginModal } from './components/modals/LoginModal.tsx';
import { InspectModal } from './components/modals/InspectModal.tsx';
import { AssignDirectiveModal } from './components/modals/AssignDirectiveModal.tsx';
import { ProfileEditModal } from './components/modals/ProfileEditModal.tsx';
import { RegisterUserModal } from './components/modals/RegisterUserModal.tsx';
import { PermanentLogoModal } from './components/modals/PermanentLogoModal.tsx';
import { DownloadReportModal } from './components/modals/DownloadReportModal.tsx';
import { AttendanceLog, Deliverable, ExportTimeframe, NotificationItem, User, WorkLocation, WorkLocationStore } from './types.ts';
import {
  checkSupabaseStatus,
  deleteDeliverableFromSupabase,
  deleteUserFromSupabase,
  fetchAttendanceFromSupabase,
  fetchDeliverablesFromSupabase,
  fetchStudioAnnouncementFromSupabase,
  fetchStudioLogoFromSupabase,
  fetchUsersFromSupabase,
  fetchWorkLocationsFromSupabase,
  saveStudioAnnouncementInSupabase,
  saveStudioLogoInSupabase,
  SupabaseStatus,
  upsertAttendanceInSupabase,
  upsertDeliverableInSupabase,
  upsertEmployeeWorkLocationInSupabase,
  upsertUserInSupabase
} from './utils/supabase.ts';
import {
  DEFAULT_ANNOUNCEMENT,
  EMPTY_WORK_LOCATIONS,
  formatDateEnglish,
  formatTime12h,
  generateInitialAttendance,
  generateInitialDeliverables,
  getTodayDateString,
  getWorkLocationForDate,
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
        if (Array.isArray(parsed) && parsed.length > 0) {
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

  const [announcement, setAnnouncement] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENT) || DEFAULT_ANNOUNCEMENT;
  });

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.READ_NOTIFS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [workLocations, setWorkLocations] = useState<WorkLocationStore>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WORK_LOCATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            latestByEmp: parsed.latestByEmp && typeof parsed.latestByEmp === 'object' ? parsed.latestByEmp : {},
            byDate: parsed.byDate && typeof parsed.byDate === 'object' ? parsed.byDate : {},
          };
        }
      }
    } catch {
      // ignore
    }
    return EMPTY_WORK_LOCATIONS;
  });

  // Modals state
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
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
        const [dbUsers, dbLogs, dbDeliv, dbLogo, dbAnnouncement, dbWorkLocations] = await Promise.all([
          fetchUsersFromSupabase(),
          fetchAttendanceFromSupabase(),
          fetchDeliverablesFromSupabase(),
          fetchStudioLogoFromSupabase(),
          fetchStudioAnnouncementFromSupabase(),
          fetchWorkLocationsFromSupabase()
        ]);
        if (dbUsers && dbUsers.length > 0) setUsers(dbUsers);
        if (dbLogs && dbLogs.length > 0) setAttendanceLogs(dbLogs);
        if (dbDeliv && dbDeliv.length > 0) setDeliverables(dbDeliv);
        if (dbLogo !== null) setSavedLogo(dbLogo);
        if (dbAnnouncement) {
          setAnnouncement(dbAnnouncement);
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENT, dbAnnouncement);
        }
        if (dbWorkLocations) {
          setWorkLocations(dbWorkLocations);
          localStorage.setItem(STORAGE_KEYS.WORK_LOCATIONS, JSON.stringify(dbWorkLocations));
        }
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    refreshSupabaseStatus();

    const syncLiveUpdates = async () => {
      const [latestAnnouncement, latestLocations, latestLogs] = await Promise.all([
        fetchStudioAnnouncementFromSupabase(),
        fetchWorkLocationsFromSupabase(),
        fetchAttendanceFromSupabase()
      ]);
      if (latestAnnouncement) {
        setAnnouncement(latestAnnouncement);
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENT, latestAnnouncement);
      }
      if (latestLocations) {
        setWorkLocations(latestLocations);
        localStorage.setItem(STORAGE_KEYS.WORK_LOCATIONS, JSON.stringify(latestLocations));
      }
      if (latestLogs && latestLogs.length > 0) {
        setAttendanceLogs(latestLogs);
      }
    };

    const interval = setInterval(syncLiveUpdates, 30000);
    window.addEventListener('focus', syncLiveUpdates);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncLiveUpdates);
    };
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WORK_LOCATIONS, JSON.stringify(workLocations));
  }, [workLocations]);

  // Sync browser tab favicon with saved studio logo or default NANDAN icon
  useEffect(() => {
    const iconLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (iconLink) {
      iconLink.href = savedLogo || './favicon.png';
    }
  }, [savedLogo]);

  // Notifications generator
  const notifications: NotificationItem[] = [];
  if (currentUser) {
    deliverables.forEach((task) => {
      if (task.title.includes('[DIRECTOR DIRECTIVE]')) {
        if (currentUser.isBoss || task.empId === currentUser.id) {
          const assignedStaff = users.find((u) => u.id === task.empId);
          notifications.unshift({
            id: `notif-${task.id}`,
            taskId: task.id,
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
      notifications.unshift({
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
          dateFormatted: formatDateEnglish(now),
          totalMinutes: 0
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
          const startMs = log.checkInTimestamp || now.getTime();
          const diffMs = Math.max(0, now.getTime() - startMs);
          const elapsedMins = Math.max(1, Math.round(diffMs / 60000));
          const updatedLog: AttendanceLog = {
            ...log,
            isCheckedIn: false,
            checkOutTime: timeStr,
            totalMinutes: elapsedMins
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

  // Boss Directive handler (supports assigning one or multiple categories at once)
  const handleAssignDirective = async (
    empId: string,
    categories: string[],
    title: string,
    instructions: string
  ) => {
    const now = new Date();
    const baseTs = now.getTime();
    const timeStr = formatTime12h(now);
    const today = getTodayDateString(now);

    const newTasks: Deliverable[] = categories.map((cat, idx) => ({
      id: `del-${baseTs}-${idx}`,
      empId,
      category: cat,
      title: title.trim() ? `[DIRECTOR DIRECTIVE] ${title.trim()}` : `[DIRECTOR DIRECTIVE] ${cat}`,
      notes: instructions,
      progress: 0,
      completed: false,
      timestamp: timeStr,
      date: today
    }));

    setDeliverables((prev) => [...newTasks, ...prev]);
    playChime();

    await Promise.all(
      newTasks.map(async (task) => {
        upsertDeliverableInSupabase(task);
        try {
          await fetch('/api/deliverables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
          });
        } catch {
          // offline fallback
        }
      })
    );
  };

  // Auth handlers
  const handleLogin = (empId: string, passwordInput: string, workLocation: WorkLocation): boolean => {
    const user = users.find(
      (u) =>
        u.id.toLowerCase() === empId.toLowerCase() ||
        (u.isBoss && (empId.toLowerCase() === 'boss123' || empId.toLowerCase() === 'boss-01'))
    );
    if (!user) return false;

    const isValid = user.password === passwordInput;

    if (isValid) {
      const today = getTodayDateString();
      const loginTime = formatTime12h(new Date());
      const nextStore: WorkLocationStore = {
        latestByEmp: {
          ...workLocations.latestByEmp,
          [user.id]: { location: workLocation, loginTime, date: today }
        },
        byDate: {
          ...workLocations.byDate,
          [`${user.id}__${today}`]: workLocation
        }
      };
      setWorkLocations(nextStore);
      upsertEmployeeWorkLocationInSupabase(user.id, today, loginTime, workLocation, nextStore)
        .then((merged) => setWorkLocations(merged))
        .catch(() => {
          // offline fallback
        });
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

  // Update an employee's password (Boss)
  const handleUpdateEmployeePassword = (userId: string, newPassword: string) => {
    let updatedUser: User | undefined;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedUser = { ...u, password: newPassword };
          return updatedUser;
        }
        return u;
      })
    );
    playChime();

    if (updatedUser) {
      upsertUserInSupabase(updatedUser);
      fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      }).catch(() => {
        // offline fallback
      });
    }
  };

  // Delete an employee account (Boss)
  const handleDeleteEmployee = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId || u.isBoss));
    playChime();
    deleteUserFromSupabase(userId);

    fetch(`/api/users/${userId}`, {
      method: 'DELETE'
    }).catch(() => {
      // offline fallback
    });
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

  // Studio announcement ticker handler (Boss)
  const handleSaveAnnouncement = async (newText: string) => {
    setAnnouncement(newText);
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENT, newText);
    await saveStudioAnnouncementInSupabase(newText);
    playChime();
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

  const handleNotificationClick = (item: NotificationItem) => {
    // 1. Mark as read
    handleMarkSingleRead(item.id);

    // 2. Switch to staff view where Today's Deliverables is displayed
    setCurrentViewMode('staff');

    // 3. Smoothly scroll to Today's Deliverables section or specific task card
    setTimeout(() => {
      if (item.taskId) {
        const specificTask = document.getElementById(`deliverable-${item.taskId}`);
        if (specificTask) {
          specificTask.scrollIntoView({ behavior: 'smooth', block: 'center' });
          specificTask.classList.add('ring-4', 'ring-rose-500', 'ring-offset-2', 'bg-rose-50/80', 'transition-all', 'duration-500');
          setTimeout(() => {
            specificTask.classList.remove('ring-4', 'ring-rose-500', 'ring-offset-2', 'bg-rose-50/80');
          }, 3000);
          return;
        }
      }

      const section = document.getElementById('todays-deliverables-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        section.classList.add('ring-4', 'ring-rose-400', 'ring-offset-2', 'transition-all', 'duration-500');
        setTimeout(() => {
          section.classList.remove('ring-4', 'ring-rose-400', 'ring-offset-2');
        }, 2500);
      }
    }, 120);
  };

  // Export handlers
  const handleExportCSV = (timeframe: ExportTimeframe, filterMember: string) => {
    executeExportCSV(users, attendanceLogs, deliverables, filterMember, timeframe, workLocations);
    playChime();
    setIsDownloadModalOpen(false);
  };

  const handleDownloadPDF = (timeframe: ExportTimeframe, filterMember: string) => {
    generateAndPrintPDFReport(users, attendanceLogs, deliverables, filterMember, timeframe, savedLogo, workLocations);
    playChime();
    setIsDownloadModalOpen(false);
  };

  // Current user's today attendance log & 5-day logs
  const todayStr = getTodayDateString();
  const currentUserTodayLog = currentUser
    ? attendanceLogs.find((a) => a.empId === currentUser.id && a.date === todayStr)
    : undefined;
  const currentUserTodayWorkLocation = currentUser
    ? getWorkLocationForDate(workLocations, currentUser.id, todayStr)
    : null;

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
            onNotificationClick={handleNotificationClick}
          />

          <UpdateTicker
            announcement={announcement}
            isBoss={currentUser.isBoss}
            onSaveAnnouncement={handleSaveAnnouncement}
          />

          <main className="w-full max-w-7xl mx-auto flex flex-col gap-6">
            {currentViewMode === 'staff' ? (
              <StaffView
                currentUser={currentUser}
                todayLog={currentUserTodayLog}
                todayWorkLocation={currentUserTodayWorkLocation}
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
                workLocations={workLocations}
                onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
                onOpenAssignModal={() => setIsAssignModalOpen(true)}
                onOpenTeamIdsModal={() => setIsRegisterModalOpen(true)}
                onInspectUser={(u) => setInspectingUser(u)}
              />
            )}
          </main>
        </>
      ) : (
        <LoginModal
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
          onUpdatePassword={handleUpdateEmployeePassword}
          onDeleteUser={handleDeleteEmployee}
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
          workLocations={workLocations}
          onClose={() => setInspectingUser(null)}
        />
      )}
    </div>
  );
}
