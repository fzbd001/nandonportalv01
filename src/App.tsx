import React, { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
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
import { StudioChatModal } from './components/modals/StudioChatModal.tsx';
import {
  AttendanceLog,
  AttendanceMetaStore,
  ChatMessage,
  DayAttendanceMeta,
  Deliverable,
  ExportTimeframe,
  NotificationItem,
  User,
  WorkLocation,
  WorkLocationStore,
  WorkSession
} from './types.ts';
import {
  appendChatMessageInSupabase,
  checkSupabaseStatus,
  deleteDeliverableFromSupabase,
  deleteUserFromSupabase,
  fetchAttendanceFromSupabase,
  fetchAttendanceMetaFromSupabase,
  fetchChatMessagesFromSupabase,
  fetchDeliverablesFromSupabase,
  fetchStudioAnnouncementFromSupabase,
  fetchStudioLogoFromSupabase,
  fetchUsersFromSupabase,
  fetchWorkLocationsFromSupabase,
  saveStudioAnnouncementInSupabase,
  saveStudioLogoInSupabase,
  StudioChatPresenceUser,
  subscribeToStudioChatChannel,
  subscribeToStudioDataChanges,
  supabase,
  SupabaseStatus,
  updateDayAttendanceMetaInSupabase,
  upsertAttendanceInSupabase,
  upsertDeliverableInSupabase,
  upsertEmployeeWorkLocationInSupabase,
  upsertUserInSupabase
} from './utils/supabase.ts';
import {
  DEFAULT_ANNOUNCEMENT,
  EMPTY_ATTENDANCE_META,
  EMPTY_WORK_LOCATIONS,
  findActiveOrTodayLog,
  formatDateEnglish,
  formatTime12h,
  generateInitialAttendance,
  generateInitialDeliverables,
  getAttendanceMetaKey,
  getDayAttendanceMeta,
  getPersistentWorkLocation,
  getTodayDateString,
  INITIAL_USERS,
  mergeChatMessages,
  OFFICE_MAX_SHIFT_MINUTES,
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

  const [activeSessionLocation, setActiveSessionLocation] = useState<WorkLocation | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_LOCATION);
      if (stored === 'Home' || stored === 'Office') {
        return stored;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [currentDateStr, setCurrentDateStr] = useState<string>(() => getTodayDateString());

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

  const [attendanceMeta, setAttendanceMeta] = useState<AttendanceMetaStore>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_META);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.byKey && typeof parsed.byKey === 'object') {
          return { byKey: parsed.byKey };
        }
      }
    } catch {
      // ignore
    }
    return EMPTY_ATTENDANCE_META;
  });

  const [systemLogoutNotice, setSystemLogoutNotice] = useState<string | null>(null);

  // Studio Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return mergeChatMessages([], parsed);
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [chatLastReadByUser, setChatLastReadByUser] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_LAST_READ);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [onlineChatUsers, setOnlineChatUsers] = useState<StudioChatPresenceUser[]>([]);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const isChatModalOpenRef = useRef(false);

  useEffect(() => {
    isChatModalOpenRef.current = isChatModalOpen;
  }, [isChatModalOpen]);

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
        const [dbUsers, dbLogs, dbDeliv, dbLogo, dbAnnouncement, dbWorkLocations, dbAttendanceMeta, dbChatMessages] = await Promise.all([
          fetchUsersFromSupabase(),
          fetchAttendanceFromSupabase(),
          fetchDeliverablesFromSupabase(),
          fetchStudioLogoFromSupabase(),
          fetchStudioAnnouncementFromSupabase(),
          fetchWorkLocationsFromSupabase(),
          fetchAttendanceMetaFromSupabase(),
          fetchChatMessagesFromSupabase()
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
        if (dbAttendanceMeta) {
          setAttendanceMeta(dbAttendanceMeta);
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE_META, JSON.stringify(dbAttendanceMeta));
        }
        if (dbChatMessages) {
          setChatMessages((prev) => mergeChatMessages(prev, dbChatMessages));
        }
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    refreshSupabaseStatus();

    const syncLiveUpdates = async () => {
      try {
        const [
          latestUsers,
          latestAnnouncement,
          latestLocations,
          latestLogs,
          latestMeta,
          latestChat,
          latestDeliverables,
          latestLogo
        ] = await Promise.all([
          fetchUsersFromSupabase(),
          fetchStudioAnnouncementFromSupabase(),
          fetchWorkLocationsFromSupabase(),
          fetchAttendanceFromSupabase(),
          fetchAttendanceMetaFromSupabase(),
          fetchChatMessagesFromSupabase(),
          fetchDeliverablesFromSupabase(),
          fetchStudioLogoFromSupabase()
        ]);
        if (latestUsers && latestUsers.length > 0) {
          setUsers(latestUsers);
        }
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
        if (latestMeta) {
          setAttendanceMeta(latestMeta);
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE_META, JSON.stringify(latestMeta));
        }
        if (latestChat) {
          setChatMessages((prev) => mergeChatMessages(prev, latestChat));
        }
        if (latestDeliverables && latestDeliverables.length > 0) {
          setDeliverables(latestDeliverables);
        }
        if (latestLogo !== null) {
          setSavedLogo(latestLogo);
          localStorage.setItem(STORAGE_KEYS.LOGO, latestLogo);
        }
      } catch {
        // offline fallback
      }
    };

    const checkDateRollover = () => {
      const latestDate = getTodayDateString();
      setCurrentDateStr((prev) => (prev === latestDate ? prev : latestDate));
    };

    const liveDataChannel = subscribeToStudioDataChanges(() => {
      checkDateRollover();
      syncLiveUpdates();
    });

    const interval = setInterval(() => {
      checkDateRollover();
      syncLiveUpdates();
    }, 10000);
    const onFocusSync = () => {
      checkDateRollover();
      syncLiveUpdates();
    };
    const onVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        checkDateRollover();
        syncLiveUpdates();
      }
    };
    window.addEventListener('focus', onFocusSync);
    window.addEventListener('online', onFocusSync);
    document.addEventListener('visibilitychange', onVisibilitySync);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(liveDataChannel);
      window.removeEventListener('focus', onFocusSync);
      window.removeEventListener('online', onFocusSync);
      document.removeEventListener('visibilitychange', onVisibilitySync);
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_META, JSON.stringify(attendanceMeta));
  }, [attendanceMeta]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAT_LAST_READ, JSON.stringify(chatLastReadByUser));
  }, [chatLastReadByUser]);

  // Real-time WebSocket subscription for Studio Chat (Broadcast + Presence + DB changes)
  useEffect(() => {
    if (!currentUser) {
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
      setOnlineChatUsers([]);
      setIsChatModalOpen(false);
      return;
    }

    const channel = subscribeToStudioChatChannel(
      {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        isBoss: currentUser.isBoss
      },
      (incomingMsg) => {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) return prev;
          return mergeChatMessages(prev, [incomingMsg]);
        });
        if (incomingMsg.senderId !== currentUser.id) {
          playChime();
          if (isChatModalOpenRef.current) {
            setChatLastReadByUser((prev) => ({
              ...prev,
              [currentUser.id]: Math.max(Date.now(), incomingMsg.createdAt)
            }));
          }
        }
      },
      (remoteMsgs) => {
        setChatMessages((prev) => mergeChatMessages(prev, remoteMsgs));
      },
      (onlineUsersList) => {
        setOnlineChatUsers(onlineUsersList);
      }
    );

    chatChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (chatChannelRef.current === channel) {
        chatChannelRef.current = null;
      }
    };
  }, [currentUser?.id, currentUser?.name, currentUser?.role, currentUser?.isBoss]);

  // 9-Hour Office Auto Check-Out & Auto System Logout Watcher
  useEffect(() => {
    const enforceOfficeNineHourRule = () => {
      const today = getTodayDateString();
      const nowMs = Date.now();

      const overdueEntries = attendanceLogs
        .map((log) => {
          if (!log.isCheckedIn || !log.checkInTimestamp) return null;
          const staffUser = users.find((u) => u.id === log.empId);
          if (staffUser?.isBoss) return null;

          const targetDate = log.date || today;
          const dayMeta = getDayAttendanceMeta(attendanceMeta, log.empId, targetDate);
          const openSession = dayMeta?.sessions?.find((s) => !s.checkOutTime);
          const sessionLocHint = currentUser?.id === log.empId ? activeSessionLocation : null;
          const effectiveLoc =
            openSession?.location ||
            getPersistentWorkLocation(workLocations, log.empId, targetDate, sessionLocHint) ||
            'Office';
          if (effectiveLoc !== 'Office') return null;

          const priorMins = log.totalMinutes || 0;
          const alreadyHitSystemLogout =
            Boolean(dayMeta?.systemLogout) || priorMins >= OFFICE_MAX_SHIFT_MINUTES;
          const allowedSessionMinutes = alreadyHitSystemLogout
            ? OFFICE_MAX_SHIFT_MINUTES
            : Math.max(1, OFFICE_MAX_SHIFT_MINUTES - priorMins);
          const allowedSessionMs = allowedSessionMinutes * 60 * 1000;

          if (nowMs - log.checkInTimestamp < allowedSessionMs) return null;
          return { log, targetDate, allowedSessionMinutes, allowedSessionMs };
        })
        .filter((entry): entry is { log: AttendanceLog; targetDate: string; allowedSessionMinutes: number; allowedSessionMs: number } => Boolean(entry));

      if (overdueEntries.length === 0) return;

      const updatedLogMap = new Map<string, AttendanceLog>();
      const nextMetaByKey: Record<string, DayAttendanceMeta> = { ...attendanceMeta.byKey };
      let shouldLogoutCurrentUser = false;

      overdueEntries.forEach(({ log, targetDate, allowedSessionMinutes, allowedSessionMs }) => {
        const autoOutMs = log.checkInTimestamp + allowedSessionMs;
        const autoOutTimeStr = formatTime12h(new Date(autoOutMs));
        const key = getAttendanceMetaKey(log.empId, targetDate);
        const existingMeta = nextMetaByKey[key] || { sessions: [] };

        let updatedSessions: WorkSession[];
        const openIdx = existingMeta.sessions.findIndex((s) => !s.checkOutTime);
        if (openIdx >= 0) {
          updatedSessions = existingMeta.sessions.map((s, idx) =>
            idx === openIdx
              ? {
                  ...s,
                  checkOutTime: autoOutTimeStr,
                  minutes: allowedSessionMinutes,
                  isSystemLogout: true
                }
              : s
          );
        } else {
          updatedSessions = [
            ...existingMeta.sessions,
            {
              id: `sess-sys-${autoOutMs}`,
              checkInTime: log.checkInTime || formatTime12h(new Date(log.checkInTimestamp)),
              checkInTimestamp: log.checkInTimestamp,
              checkOutTime: autoOutTimeStr,
              minutes: allowedSessionMinutes,
              location: 'Office',
              isSystemLogout: true
            }
          ];
        }

        const totalMinutes = updatedSessions.reduce((sum, s) => sum + (s.minutes || 0), 0);

        const nextDayMeta: DayAttendanceMeta = {
          ...existingMeta,
          sessions: updatedSessions,
          systemLogout: true,
          systemLogoutTime: autoOutTimeStr,
          reCheckInAllowed: false
        };
        nextMetaByKey[key] = nextDayMeta;

        const updatedLog: AttendanceLog = {
          ...log,
          isCheckedIn: false,
          checkOutTime: autoOutTimeStr,
          totalMinutes
        };
        updatedLogMap.set(log.id, updatedLog);

        upsertAttendanceInSupabase(updatedLog);
        updateDayAttendanceMetaInSupabase(
          log.empId,
          targetDate,
          () => nextDayMeta,
          { byKey: nextMetaByKey }
        ).catch(() => {
          // offline fallback
        });

        fetch('/api/attendance/check-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empId: log.empId })
        }).catch(() => {
          // offline fallback
        });

        if (currentUser && !currentUser.isBoss && currentUser.id === log.empId) {
          shouldLogoutCurrentUser = true;
        }
      });

      setAttendanceLogs((prev) => prev.map((l) => updatedLogMap.get(l.id) || l));
      setAttendanceMeta({ byKey: nextMetaByKey });

      if (shouldLogoutCurrentUser) {
        setSystemLogoutNotice(
          'System Logout: Your 9-hour Office shift limit was reached, so the system automatically checked you out and logged you out. Boss permission is required to check in again today.'
        );
        setActiveSessionLocation(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_LOCATION);
        setCurrentUser(null);
      }
    };

    enforceOfficeNineHourRule();
    const timer = setInterval(enforceOfficeNineHourRule, 5000);
    return () => clearInterval(timer);
  }, [attendanceLogs, attendanceMeta, workLocations, users, currentUser, activeSessionLocation]);

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
    const myLog = findActiveOrTodayLog(attendanceLogs, currentUser.id, todayStr);
    if (myLog && myLog.isCheckedIn) {
      notifications.unshift({
        id: `notif-checkin-${currentUser.id}-${myLog.date}`,
        title: 'Shift Active',
        desc: `You checked in at ${myLog.checkInTime}. Creative operations running.`,
        time: myLog.checkInTime || 'Today',
        icon: 'fa-circle-check',
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200'
      });
    }
  }

  // Boss handler: grant permission & immediately resume Office employee into Checked-In state
  // (Employee does NOT need to click Check-In again; total daily time keeps accumulating until final Check-Out)
  const handleToggleReCheckInPermission = (empId: string, allow: boolean) => {
    const today = getTodayDateString();
    const key = getAttendanceMetaKey(empId, today);
    const now = new Date();
    const nowTs = now.getTime();
    const timeStr = formatTime12h(now);

    const activeOrToday = findActiveOrTodayLog(attendanceLogs, empId, today);
    const existingLog = attendanceLogs.find((a) => a.empId === empId && a.date === today);
    const staffUser = users.find((u) => u.id === empId);
    const existingMeta = attendanceMeta.byKey[key] || { sessions: [] };

    if (!allow) {
      const targetDate = activeOrToday?.date || today;
      const targetKey = getAttendanceMetaKey(empId, targetDate);
      const targetMeta = attendanceMeta.byKey[targetKey] || { sessions: [] };
      const updatedDay: DayAttendanceMeta = {
        ...targetMeta,
        reCheckInAllowed: false,
        reCheckInGrantedAt: undefined
      };
      const nextStore: AttendanceMetaStore = {
        byKey: {
          ...attendanceMeta.byKey,
          [targetKey]: updatedDay
        }
      };
      setAttendanceMeta(nextStore);
      updateDayAttendanceMetaInSupabase(
        empId,
        targetDate,
        (cur) => ({
          ...cur,
          reCheckInAllowed: false,
          reCheckInGrantedAt: undefined
        }),
        nextStore
      )
        .then((merged) => setAttendanceMeta(merged))
        .catch(() => {
          // offline fallback
        });
      return;
    }

    // If employee is already checked in, just ensure permission marker is set
    if (activeOrToday?.isCheckedIn || existingLog?.isCheckedIn) {
      return;
    }

    const todayLoc: WorkLocation = getPersistentWorkLocation(workLocations, empId, today) || 'Office';

    // Preserve all completed sessions from earlier today so daily total time adds up cleanly
    let existingSessions: WorkSession[] = existingMeta.sessions ? [...existingMeta.sessions] : [];
    if (existingSessions.length === 0 && existingLog && existingLog.checkInTime && existingLog.checkOutTime) {
      existingSessions = [
        {
          id: `sess-legacy-${existingLog.id}`,
          checkInTime: existingLog.checkInTime,
          checkInTimestamp: existingLog.checkInTimestamp || nowTs,
          checkOutTime: existingLog.checkOutTime,
          minutes: existingLog.totalMinutes || 0,
          location: todayLoc,
          isSystemLogout: Boolean(existingMeta.systemLogout)
        }
      ];
    }

    const priorCompletedMins =
      existingSessions.length > 0
        ? existingSessions.reduce((sum, s) => sum + (s.checkOutTime ? (s.minutes || 0) : 0), 0)
        : (existingLog ? (existingLog.totalMinutes || 0) : 0);

    const resumedSession: WorkSession = {
      id: `sess-${nowTs}`,
      checkInTime: timeStr,
      checkInTimestamp: nowTs,
      checkOutTime: null,
      minutes: 0,
      location: todayLoc
    };

    const nextDayMeta: DayAttendanceMeta = {
      ...existingMeta,
      sessions: [...existingSessions, resumedSession],
      reCheckInAllowed: true,
      reCheckInGrantedAt: timeStr
    };

    const nextMetaStore: AttendanceMetaStore = {
      byKey: {
        ...attendanceMeta.byKey,
        [key]: nextDayMeta
      }
    };
    setAttendanceMeta(nextMetaStore);

    let resumedLog: AttendanceLog;
    if (!existingLog) {
      resumedLog = {
        id: `att-${nowTs}`,
        empId,
        staffName: staffUser ? staffUser.name : empId,
        date: today,
        dateFormatted: formatDateEnglish(now),
        checkInTime: timeStr,
        checkInTimestamp: nowTs,
        checkOutTime: null,
        isCheckedIn: true,
        totalMinutes: priorCompletedMins
      };
      setAttendanceLogs((prev) => [resumedLog, ...prev]);
    } else {
      resumedLog = {
        ...existingLog,
        isCheckedIn: true,
        checkInTime: timeStr,
        checkInTimestamp: nowTs,
        checkOutTime: null,
        dateFormatted: formatDateEnglish(now),
        totalMinutes: priorCompletedMins
      };
      setAttendanceLogs((prev) =>
        prev.map((a) => (a.empId === empId && a.date === today ? resumedLog : a))
      );
    }

    playChime();
    upsertAttendanceInSupabase(resumedLog);
    updateDayAttendanceMetaInSupabase(
      empId,
      today,
      () => nextDayMeta,
      nextMetaStore
    )
      .then((merged) => setAttendanceMeta(merged))
      .catch(() => {
        // offline fallback
      });

    fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empId })
    }).catch(() => {
      // offline fallback
    });
  };

  // Attendance handlers
  const handleCheckIn = async () => {
    if (!currentUser) return;
    const today = getTodayDateString();
    const activeOrToday = findActiveOrTodayLog(attendanceLogs, currentUser.id, today);
    if (activeOrToday?.isCheckedIn) return;
    const existing = attendanceLogs.find((a) => a.empId === currentUser.id && a.date === today);
    if (existing?.isCheckedIn) return;

    const todayLoc: WorkLocation =
      getPersistentWorkLocation(workLocations, currentUser.id, today, activeSessionLocation) || 'Office';
    const dayMeta = getDayAttendanceMeta(attendanceMeta, currentUser.id, today);

    const hasCheckedOutBeforeToday = Boolean(
      existing &&
      !existing.isCheckedIn &&
      (existing.checkOutTime ||
        existing.totalMinutes > 0 ||
        (dayMeta?.sessions?.length ?? 0) > 0 ||
        dayMeta?.systemLogout)
    );

    // Office rule: employees cannot self re-check-in after checking out;
    // Boss clicking "Resume Check-In" directly restores them to Checked-In status.
    if (!currentUser.isBoss && todayLoc === 'Office' && hasCheckedOutBeforeToday) {
      return;
    }

    const now = new Date();
    const nowTs = now.getTime();
    const timeStr = formatTime12h(now);
    const metaKey = getAttendanceMetaKey(currentUser.id, today);

    // Persist today's work location (Home/Office) on every day's Check-In so multi-day
    // browser sessions without re-login always save & display the original login mode
    const existingDateLoc = workLocations.byDate?.[`${currentUser.id}__${today}`];
    const existingLatest = workLocations.latestByEmp?.[currentUser.id];
    if (existingDateLoc !== todayLoc || !existingLatest || existingLatest.date !== today || existingLatest.location !== todayLoc) {
      const preservedLoginTime =
        existingLatest && existingLatest.date === today && existingLatest.loginTime
          ? existingLatest.loginTime
          : timeStr;
      const nextWorkLocStore: WorkLocationStore = {
        latestByEmp: {
          ...workLocations.latestByEmp,
          [currentUser.id]: { location: todayLoc, loginTime: preservedLoginTime, date: today }
        },
        byDate: {
          ...workLocations.byDate,
          [`${currentUser.id}__${today}`]: todayLoc
        }
      };
      setWorkLocations(nextWorkLocStore);
      upsertEmployeeWorkLocationInSupabase(
        currentUser.id,
        today,
        preservedLoginTime,
        todayLoc,
        nextWorkLocStore
      )
        .then((merged) => setWorkLocations(merged))
        .catch(() => {
          // offline fallback
        });
    }

    // Preserve prior completed sessions today (for Home multiple check-in or Boss-approved Office re-check-in)
    let existingSessions: WorkSession[] = dayMeta?.sessions ? [...dayMeta.sessions] : [];
    if (existingSessions.length === 0 && existing && existing.checkInTime && existing.checkOutTime) {
      existingSessions = [
        {
          id: `sess-legacy-${existing.id}`,
          checkInTime: existing.checkInTime,
          checkInTimestamp: existing.checkInTimestamp || nowTs,
          checkOutTime: existing.checkOutTime,
          minutes: existing.totalMinutes || 0,
          location: todayLoc,
          isSystemLogout: Boolean(dayMeta?.systemLogout)
        }
      ];
    }

    const priorCompletedMins =
      existingSessions.length > 0
        ? existingSessions.reduce((sum, s) => sum + (s.checkOutTime ? (s.minutes || 0) : 0), 0)
        : (existing && !existing.isCheckedIn ? (existing.totalMinutes || 0) : 0);

    const newSession: WorkSession = {
      id: `sess-${nowTs}`,
      checkInTime: timeStr,
      checkInTimestamp: nowTs,
      checkOutTime: null,
      minutes: 0,
      location: todayLoc
    };

    const nextDayMeta: DayAttendanceMeta = {
      ...(dayMeta || { sessions: [] }),
      sessions: [...existingSessions, newSession],
      reCheckInAllowed: false // consume one-time Boss permission upon check-in
    };

    const nextMetaStore: AttendanceMetaStore = {
      byKey: {
        ...attendanceMeta.byKey,
        [metaKey]: nextDayMeta
      }
    };
    setAttendanceMeta(nextMetaStore);

    let targetLog: AttendanceLog;
    if (!existing) {
      targetLog = {
        id: `att-${nowTs}`,
        empId: currentUser.id,
        staffName: currentUser.name,
        date: today,
        dateFormatted: formatDateEnglish(now),
        checkInTime: timeStr,
        checkInTimestamp: nowTs,
        checkOutTime: null,
        isCheckedIn: true,
        totalMinutes: 0
      };
      setAttendanceLogs((prev) => [targetLog, ...prev]);
    } else {
      targetLog = {
        ...existing,
        isCheckedIn: true,
        checkInTime: timeStr,
        checkInTimestamp: nowTs,
        checkOutTime: null,
        dateFormatted: formatDateEnglish(now),
        totalMinutes: priorCompletedMins
      };
      setAttendanceLogs((prev) =>
        prev.map((a) => (a.empId === currentUser.id && a.date === today ? targetLog : a))
      );
    }

    upsertAttendanceInSupabase(targetLog);
    updateDayAttendanceMetaInSupabase(
      currentUser.id,
      today,
      () => nextDayMeta,
      nextMetaStore
    )
      .then((merged) => setAttendanceMeta(merged))
      .catch(() => {
        // offline fallback
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
    const candidateLog = findActiveOrTodayLog(attendanceLogs, currentUser.id, today);
    const activeLog = candidateLog?.isCheckedIn
      ? candidateLog
      : attendanceLogs.find((log) => log.empId === currentUser.id && log.isCheckedIn);
    if (!activeLog) return;

    const logDate = activeLog.date || today;
    const now = new Date();
    const nowTs = now.getTime();
    const timeStr = formatTime12h(now);
    const startMs = activeLog.checkInTimestamp || nowTs;
    const sessionMins = Math.max(1, Math.round(Math.max(0, nowTs - startMs) / 60000));

    const todayLoc: WorkLocation =
      getPersistentWorkLocation(workLocations, currentUser.id, logDate, activeSessionLocation) || 'Office';
    const metaKey = getAttendanceMetaKey(currentUser.id, logDate);
    const existingMeta = attendanceMeta.byKey[metaKey] || { sessions: [] };

    let updatedSessions: WorkSession[];
    const openIdx = existingMeta.sessions.findIndex((s) => !s.checkOutTime);
    if (openIdx >= 0) {
      updatedSessions = existingMeta.sessions.map((s, idx) =>
        idx === openIdx
          ? {
              ...s,
              checkOutTime: timeStr,
              minutes: sessionMins
            }
          : s
      );
    } else {
      updatedSessions = [
        ...existingMeta.sessions,
        {
          id: `sess-${nowTs}`,
          checkInTime: activeLog.checkInTime || timeStr,
          checkInTimestamp: startMs,
          checkOutTime: timeStr,
          minutes: sessionMins,
          location: todayLoc
        }
      ];
    }

    const accumulatedTotalMinutes = updatedSessions.reduce((sum, s) => sum + (s.minutes || 0), 0);

    const nextDayMeta: DayAttendanceMeta = {
      ...existingMeta,
      sessions: updatedSessions,
      reCheckInAllowed: false
    };
    const nextMetaStore: AttendanceMetaStore = {
      byKey: {
        ...attendanceMeta.byKey,
        [metaKey]: nextDayMeta
      }
    };
    setAttendanceMeta(nextMetaStore);

    const updatedLog: AttendanceLog = {
      ...activeLog,
      isCheckedIn: false,
      checkOutTime: timeStr,
      totalMinutes: accumulatedTotalMinutes
    };

    setAttendanceLogs((prev) =>
      prev.map((log) => (log.id === activeLog.id ? updatedLog : log))
    );

    upsertAttendanceInSupabase(updatedLog);
    updateDayAttendanceMetaInSupabase(
      currentUser.id,
      logDate,
      () => nextDayMeta,
      nextMetaStore
    )
      .then((merged) => setAttendanceMeta(merged))
      .catch(() => {
        // offline fallback
      });

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

  // Helper to check if employee deliverables are locked (checked out / not checked in)
  const isCurrentEmployeeCheckedIn = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.isBoss) return true;
    const today = getTodayDateString();
    const myTodayLog = findActiveOrTodayLog(attendanceLogs, currentUser.id, today);
    return Boolean(myTodayLog?.isCheckedIn);
  };

  // Deliverables handlers (locked for employees who are checked out / not checked in)
  const handleSubmitDeliverable = async (category: string, title: string, notes: string, progress: number) => {
    if (!currentUser || !isCurrentEmployeeCheckedIn()) return;
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
    if (!isCurrentEmployeeCheckedIn()) return;
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
    if (!isCurrentEmployeeCheckedIn()) return;
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
    if (!isCurrentEmployeeCheckedIn()) return;
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
      setActiveSessionLocation(workLocation);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_LOCATION, workLocation);
      upsertEmployeeWorkLocationInSupabase(user.id, today, loginTime, workLocation, nextStore)
        .then((merged) => setWorkLocations(merged))
        .catch(() => {
          // offline fallback
        });
      setSystemLogoutNotice(null);
      setCurrentUser(user);
      playChime();
      return true;
    }
    return false;
  };

  const handleSignOut = () => {
    setActiveSessionLocation(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_LOCATION);
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

  // Studio Chat handlers
  const markChatAsReadForCurrentUser = (messagesRefList: ChatMessage[] = chatMessages) => {
    if (!currentUser) return;
    const latestTs =
      messagesRefList.length > 0
        ? Math.max(Date.now(), messagesRefList[messagesRefList.length - 1].createdAt)
        : Date.now();
    setChatLastReadByUser((prev) => ({
      ...prev,
      [currentUser.id]: latestTs
    }));
  };

  const handleOpenChatModal = () => {
    setIsChatModalOpen(true);
    markChatAsReadForCurrentUser(chatMessages);
    fetchChatMessagesFromSupabase()
      .then((remote) => {
        if (remote) {
          setChatMessages((prev) => {
            const merged = mergeChatMessages(prev, remote);
            markChatAsReadForCurrentUser(merged);
            return merged;
          });
        }
      })
      .catch(() => {
        // offline fallback
      });
  };

  const handleSendChatMessage = (text: string) => {
    if (!currentUser) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const now = new Date();
    const nowTs = now.getTime();
    const newMsg: ChatMessage = {
      id: `chat-${nowTs}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      isBoss: currentUser.isBoss,
      text: trimmed,
      time: formatTime12h(now),
      date: getTodayDateString(now),
      dateLabel: formatDateEnglish(now),
      createdAt: nowTs
    };

    // Optimistic local state update (idempotent by id)
    setChatMessages((prev) => mergeChatMessages(prev, [newMsg]));
    setChatLastReadByUser((prev) => ({
      ...prev,
      [currentUser.id]: nowTs
    }));

    // Instant live WebSocket broadcast via Supabase Realtime channel
    if (chatChannelRef.current) {
      chatChannelRef.current
        .send({
          type: 'broadcast',
          event: 'chat:message',
          payload: newMsg
        })
        .catch(() => {
          // ignore transient broadcast error
        });
    }

    // Authoritative persistence in Supabase
    appendChatMessageInSupabase(newMsg, chatMessages)
      .then((merged) => setChatMessages((prev) => mergeChatMessages(prev, merged)))
      .catch(() => {
        // offline fallback
      });

    // Express API sync fallback
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg)
    }).catch(() => {
      // static / offline fallback
    });
  };

  const currentUserChatLastRead = currentUser ? (chatLastReadByUser[currentUser.id] || 0) : 0;
  const unreadChatCount =
    currentUser && !isChatModalOpen
      ? chatMessages.filter(
          (m) => m.senderId !== currentUser.id && m.createdAt > currentUserChatLastRead
        ).length
      : 0;

  // Export handlers
  const handleExportCSV = (timeframe: ExportTimeframe, filterMember: string) => {
    executeExportCSV(users, attendanceLogs, deliverables, filterMember, timeframe, workLocations, attendanceMeta);
    playChime();
    setIsDownloadModalOpen(false);
  };

  const handleDownloadPDF = (timeframe: ExportTimeframe, filterMember: string) => {
    generateAndPrintPDFReport(users, attendanceLogs, deliverables, filterMember, timeframe, savedLogo, workLocations, attendanceMeta);
    playChime();
    setIsDownloadModalOpen(false);
  };

  // Current user's today attendance log & 5-day logs (synced to canonical Studio Timezone BDT)
  const todayStr = currentDateStr;
  const currentUserTodayLog = currentUser
    ? findActiveOrTodayLog(attendanceLogs, currentUser.id, todayStr)
    : undefined;
  const effectiveUserDate = currentUserTodayLog?.date || todayStr;
  const currentUserTodayWorkLocation = currentUser
    ? getPersistentWorkLocation(workLocations, currentUser.id, effectiveUserDate, activeSessionLocation)
    : null;
  const currentUserTodayMeta = currentUser
    ? getDayAttendanceMeta(attendanceMeta, currentUser.id, effectiveUserDate)
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
            onOpenChatModal={handleOpenChatModal}
            unreadChatCount={unreadChatCount}
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
                todayMeta={currentUserTodayMeta}
                attendanceMeta={attendanceMeta}
                workLocations={workLocations}
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
                attendanceMeta={attendanceMeta}
                onToggleReCheckInPermission={handleToggleReCheckInPermission}
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
          systemLogoutNotice={systemLogoutNotice}
          onDismissNotice={() => setSystemLogoutNotice(null)}
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
          attendanceMeta={attendanceMeta}
          onToggleReCheckInPermission={handleToggleReCheckInPermission}
          onClose={() => setInspectingUser(null)}
        />
      )}

      {isChatModalOpen && currentUser && (
        <StudioChatModal
          currentUser={currentUser}
          users={users}
          messages={chatMessages}
          onlineUsers={onlineChatUsers}
          onSendMessage={handleSendChatMessage}
          onClose={() => {
            markChatAsReadForCurrentUser(chatMessages);
            setIsChatModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
