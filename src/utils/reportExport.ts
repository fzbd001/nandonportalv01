import {
  AttendanceLog,
  AttendanceMetaStore,
  Deliverable,
  ExportTimeframe,
  User,
  WorkLocationStore
} from '../types.ts';
import {
  findActiveOrTodayLog,
  formatDateEnglish,
  formatDurationShort,
  formatSessionsSummary,
  getDayAttendanceMeta,
  getLastNDaysStudioDates,
  getTodayDateString,
  getWorkLocationForDate
} from './storage.ts';

function formatTaskDateLabel(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    const [y, m, d] = parts;
    return formatDateEnglish(new Date(Date.UTC(y, m - 1, d, 6, 0, 0)));
  }
  return dateStr;
}

export interface DailySessionReportRow {
  date: string;
  dateLabel: string;
  location: string;
  sessionsSummary: string;
  systemLogout: boolean;
  totalMinutes: number;
}

export interface StaffPeriodStats {
  checkIn: string;
  checkOut: string;
  workLocation: string;
  logoutStatus: string;
  hasSystemLogout: boolean;
  sessionsSummary: string;
  dailySessionRows: DailySessionReportRow[];
  totalMinutes: number;
  daysAbsent: number;
  totalTasks: number;
  completedTasks: number;
  tasks: Deliverable[];
}

export function calculateStaffPeriodStats(
  attendanceLogs: AttendanceLog[],
  deliverables: Deliverable[],
  empId: string,
  timeframe: ExportTimeframe,
  workLocations?: WorkLocationStore,
  attendanceMeta?: AttendanceMetaStore
): StaffPeriodStats {
  const today = getTodayDateString();
  const numDays = timeframe === 'daily' ? 1 : (timeframe === 'weekly' ? 7 : 30);
  const now = new Date();

  // Gather target dates in timeframe anchored strictly to Studio Timezone (Asia/Dhaka)
  const targetDates = getLastNDaysStudioDates(numDays, now)
    .map((slot) => slot.dateStr)
    .reverse();

  const todayLog = findActiveOrTodayLog(attendanceLogs, empId, today);
  const relevantLogs = attendanceLogs.filter(
    (a) => a.empId === empId && (targetDates.includes(a.date) || (todayLog && a.id === todayLog.id))
  );

  // Present dates vs absent count
  const attendedDates = new Set(relevantLogs.map(l => l.date));
  if (todayLog) {
    attendedDates.add(today);
  }
  let absentCount = 0;
  targetDates.forEach(dateStr => {
    if (!attendedDates.has(dateStr)) {
      absentCount++;
    }
  });

  const resolveLocForDate = (dateStr: string, logForDate?: AttendanceLog) => {
    const direct = getWorkLocationForDate(workLocations, empId, dateStr, false);
    if (direct) return direct;
    const metaForDate = getDayAttendanceMeta(attendanceMeta, empId, dateStr);
    if (metaForDate?.sessions?.[0]?.location) return metaForDate.sessions[0].location;
    if (logForDate && dateStr === today) {
      return getWorkLocationForDate(workLocations, empId, dateStr, true);
    }
    return null;
  };

  // Compute work location summary for period
  let workLocation = 'Not Signed In';
  if (timeframe === 'daily') {
    const loc = resolveLocForDate(today, todayLog);
    workLocation = loc === 'Office' ? 'From Office' : loc === 'Home' ? 'From Home' : 'Not Signed In';
  } else {
    let officeDays = 0;
    let homeDays = 0;
    targetDates.forEach((dateStr) => {
      const logForDate = relevantLogs.find((l) => l.date === dateStr);
      const loc = resolveLocForDate(dateStr, logForDate);
      if (loc === 'Office') officeDays++;
      if (loc === 'Home') homeDays++;
    });
    if (officeDays > 0 && homeDays > 0) {
      workLocation = `Office (${officeDays}d), Home (${homeDays}d)`;
    } else if (officeDays > 0) {
      workLocation = `From Office (${officeDays}d)`;
    } else if (homeDays > 0) {
      workLocation = `From Home (${homeDays}d)`;
    } else {
      workLocation = 'Not Recorded';
    }
  }

  // Compute sessions & system logout status across targetDates
  let systemLogoutDays = 0;
  const dailySessionRows: DailySessionReportRow[] = [];

  targetDates.forEach((dateStr) => {
    const logForDate = relevantLogs.find((l) => l.date === dateStr);
    const metaForDate = getDayAttendanceMeta(attendanceMeta, empId, dateStr);
    const locForDate = resolveLocForDate(dateStr, logForDate);
    const isSysOut = Boolean(metaForDate?.systemLogout);
    if (isSysOut) systemLogoutDays++;

    let summary = formatSessionsSummary(metaForDate?.sessions);
    if (!summary && logForDate && logForDate.checkInTime) {
      if (logForDate.isCheckedIn) {
        summary = `S1: ${logForDate.checkInTime}–Active`;
      } else if (logForDate.checkOutTime) {
        summary = `S1: ${logForDate.checkInTime}–${logForDate.checkOutTime} (${formatDurationShort(logForDate.totalMinutes || 0)})${isSysOut ? ' [System Logout]' : ''}`;
      }
    }

    if (summary || isSysOut) {
      const dateLabel = logForDate?.dateFormatted || dateStr;
      dailySessionRows.push({
        date: dateStr,
        dateLabel,
        location: locForDate === 'Office' ? 'Office' : locForDate === 'Home' ? 'Home' : '—',
        sessionsSummary: summary || (isSysOut ? 'System Logout' : '—'),
        systemLogout: isSysOut,
        totalMinutes: logForDate?.totalMinutes || 0
      });
    }
  });

  const todayMeta = getDayAttendanceMeta(attendanceMeta, empId, today);
  const todaySystemLogout = Boolean(todayMeta?.systemLogout && !todayLog?.isCheckedIn);

  let logoutStatus = 'Normal';
  if (timeframe === 'daily') {
    if (todaySystemLogout) {
      logoutStatus = 'System Logout';
    } else if (todayLog?.isCheckedIn) {
      logoutStatus = 'Active Duty';
    } else if (todayLog?.checkOutTime) {
      logoutStatus = 'Manual Check-Out';
    } else {
      logoutStatus = 'Not Checked In';
    }
  } else {
    logoutStatus = systemLogoutDays > 0 ? `System Logout (${systemLogoutDays}d)` : 'Normal';
  }

  const sessionsSummary =
    timeframe === 'daily'
      ? (dailySessionRows[0]?.sessionsSummary || 'No sessions')
      : (dailySessionRows.length > 0
          ? dailySessionRows.map((r) => `${r.dateLabel}: ${r.sessionsSummary}`).join(' | ')
          : 'No sessions');

  const totalMins = relevantLogs.reduce((acc, l) => {
    if (l.isCheckedIn && l.checkInTimestamp) {
      const liveMins = Math.max(0, Math.round((now.getTime() - l.checkInTimestamp) / 60000));
      return acc + (l.totalMinutes || 0) + liveMins;
    }
    return acc + (l.totalMinutes || 0);
  }, 0);

  const relevantTasks = deliverables
    .filter(d => d.empId === empId && targetDates.includes(d.date))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const completedCount = relevantTasks.filter(t => t.progress >= 100).length;

  const checkInDisplay =
    todayMeta?.sessions && todayMeta.sessions.length > 0
      ? todayMeta.sessions[0].checkInTime
      : (todayLog ? (todayLog.checkInTime || '--:--') : '--:--');

  const checkOutBase = todayLog ? (todayLog.checkOutTime || '--:--') : '--:--';
  const checkOutDisplay = todaySystemLogout
    ? `${todayMeta?.systemLogoutTime || checkOutBase} (System Logout)`
    : checkOutBase;

  return {
    checkIn: checkInDisplay,
    checkOut: checkOutDisplay,
    workLocation,
    logoutStatus,
    hasSystemLogout: timeframe === 'daily' ? todaySystemLogout : systemLogoutDays > 0,
    sessionsSummary,
    dailySessionRows,
    totalMinutes: totalMins,
    daysAbsent: absentCount,
    totalTasks: relevantTasks.length,
    completedTasks: completedCount,
    tasks: relevantTasks
  };
}

export function executeExportCSV(
  users: User[],
  attendanceLogs: AttendanceLog[],
  deliverables: Deliverable[],
  filterMember: string,
  timeframe: ExportTimeframe,
  workLocations?: WorkLocationStore,
  attendanceMeta?: AttendanceMetaStore
) {
  const today = getTodayDateString();
  let targetUsers = users.filter(u => !u.isBoss);
  if (filterMember !== 'ALL') {
    targetUsers = targetUsers.filter(u => u.id === filterMember);
  }

  let csv = "Employee Name,Employee ID,Designation,Period,Work Location,Check In,Check Out,Logout Status,Shift Sessions Breakdown,Total Minutes,Total Hours,Days Absent,Tasks Count,Completed Tasks,Deliverables Breakdown\n";

  targetUsers.forEach(staff => {
    const stats = calculateStaffPeriodStats(attendanceLogs, deliverables, staff.id, timeframe, workLocations, attendanceMeta);
    const tasksSummary =
      stats.tasks
        .map((t) => {
          const datePart = formatTaskDateLabel(t.date);
          const timePart = t.timestamp ? ` ${t.timestamp}` : '';
          return `[${datePart}${timePart}] ${t.category}: ${t.title} (${t.progress}%)`;
        })
        .join('; ') || 'No tasks';
    const cleanTasks = tasksSummary.replace(/"/g, '""');
    const cleanSessions = stats.sessionsSummary.replace(/"/g, '""');

    csv += `"${staff.name}","${staff.id}","${staff.role}","${timeframe.toUpperCase()}","${stats.workLocation}","${stats.checkIn}","${stats.checkOut}","${stats.logoutStatus}","${cleanSessions}","${stats.totalMinutes}","${(stats.totalMinutes / 60).toFixed(1)}","${stats.daysAbsent}","${stats.totalTasks}","${stats.completedTasks}","${cleanTasks}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `NANDAN_Studio_${timeframe.toUpperCase()}_Staff_Report_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return text.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m] || m;
  });
}

export function generateAndPrintPDFReport(
  users: User[],
  attendanceLogs: AttendanceLog[],
  deliverables: Deliverable[],
  filterMember: string,
  timeframe: ExportTimeframe,
  savedLogo: string | null,
  workLocations?: WorkLocationStore,
  attendanceMeta?: AttendanceMetaStore
) {
  const timeframeTitle = timeframe.charAt(0).toUpperCase() + timeframe.slice(1);

  let targetUsers = users.filter(u => !u.isBoss);
  if (filterMember !== 'ALL') {
    targetUsers = targetUsers.filter(u => u.id === filterMember);
  }

  const logoHtml = savedLogo
    ? `<img src="${savedLogo}" style="width:48px; height:48px; border-radius:10px; object-fit:cover;">`
    : `<div style="width:48px; height:48px; border-radius:10px; background:#e11d48; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px;">NANDAN</div>`;

  const staffCardsHtml = targetUsers.map(staff => {
    const stats = calculateStaffPeriodStats(attendanceLogs, deliverables, staff.id, timeframe, workLocations, attendanceMeta);
    const hours = Math.floor(stats.totalMinutes / 60);
    const mins = stats.totalMinutes % 60;
    const formattedTime = `${stats.totalMinutes} mins (${hours}h ${mins}m)`;
    const isHomeReport = stats.workLocation.includes('Home');
    const isOfficeReport = stats.workLocation.includes('Office');

    const sessionsHtml = stats.dailySessionRows.length > 0 ? `
      <div style="margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
        <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Shift Sessions Breakdown:</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${stats.dailySessionRows.map(row => `
            <div style="font-size: 11px; color: #1e293b; display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
              <span style="font-weight: 700; color: #0f172a; min-width: 78px;">${escapeHtml(row.dateLabel)}</span>
              <span style="font-family: monospace; font-size: 10.5px; color: #334155;">${escapeHtml(row.sessionsSummary)}</span>
              ${row.systemLogout ? `<span style="background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 999px;">System Logout</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const taskRowsHtml = stats.tasks.length > 0 ? stats.tasks.map((t, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
        <td style="padding: 6px 10px; color: #64748b; width: 25px;">${idx + 1}.</td>
        <td style="padding: 6px 10px; white-space: nowrap;">
          <div style="font-weight: 700; color: #0f172a; font-size: 10.5px;">${escapeHtml(formatTaskDateLabel(t.date))}</div>
          ${t.timestamp ? `<div style="font-family: monospace; color: #64748b; font-size: 9px; margin-top: 1px;">${escapeHtml(t.timestamp)}</div>` : ''}
        </td>
        <td style="padding: 6px 10px; font-weight: 600; color: #0f172a;">${escapeHtml(t.title)}</td>
        <td style="padding: 6px 10px; color: #475569;"><span style="background:#0f172a; color:#fff; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:bold;">${escapeHtml(t.category)}</span></td>
        <td style="padding: 6px 10px; text-align: center; font-weight: bold; color: ${t.progress >= 100 ? '#059669' : '#e11d48'};">${t.progress}%</td>
        <td style="padding: 6px 10px; color: #64748b; font-size: 10px;">${escapeHtml(t.notes || '—')}</td>
      </tr>
    `).join('') : `<tr><td colspan="6" style="padding: 10px; text-align: center; color: #94a3b8; font-size: 11px; font-style: italic;">No specific deliverable tasks logged for this timeframe</td></tr>`;

    return `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 20px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">${escapeHtml(staff.name)}</h3>
            <p style="margin: 3px 0 0; font-size: 11px; color: #64748b; font-weight: 600;">${escapeHtml(staff.role)} &bull; <span style="font-family: monospace; color:#0f172a; background:#f1f5f9; padding: 1px 5px; border-radius:4px;">${staff.id}</span></p>
          </div>
          <div style="text-align: right; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
            ${stats.hasSystemLogout ? `
              <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 800; background:#fff1f2; color:#e11d48; border:1px solid #fda4af;">
                ${escapeHtml(stats.logoutStatus)}
              </span>
            ` : ''}
            <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 800; ${isHomeReport && !isOfficeReport ? 'background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe;' : isOfficeReport ? 'background:#0f172a; color:#ffffff; border:1px solid #0f172a;' : 'background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1;'}">
              ${escapeHtml(stats.workLocation)}
            </span>
            <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 800; ${stats.daysAbsent === 0 ? 'background:#ecfdf5; color:#059669; border:1px solid #a7f3d0;' : 'background:#fff1f2; color:#e11d48; border:1px solid #fecdd3;'}">
              ${stats.daysAbsent === 0 ? '100% Attendance' : `${stats.daysAbsent} Days Absent`}
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
          <div style="background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Work Location</div>
            <div style="font-size: 12px; font-weight: 800; color: ${isHomeReport && !isOfficeReport ? '#4338ca' : '#0f172a'}; margin-top: 2px;">${escapeHtml(stats.workLocation)}</div>
          </div>
          <div style="background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Check In</div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b; font-family: monospace; margin-top: 2px;">${escapeHtml(stats.checkIn)}</div>
          </div>
          <div style="background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Check Out / Status</div>
            <div style="font-size: 11.5px; font-weight: 700; color: ${stats.hasSystemLogout ? '#e11d48' : '#1e293b'}; font-family: monospace; margin-top: 2px;">${escapeHtml(stats.checkOut)}</div>
          </div>
          <div style="background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Total Minutes</div>
            <div style="font-size: 12px; font-weight: 800; color: #e11d48; font-family: monospace; margin-top: 2px;">${formattedTime}</div>
          </div>
          <div style="background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Work Updates</div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${stats.completedTasks}/${stats.totalTasks} Tasks</div>
          </div>
          <div style="background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Absent Status</div>
            <div style="font-size: 12px; font-weight: 800; color: ${stats.daysAbsent > 0 ? '#e11d48' : '#059669'}; margin-top: 2px;">${stats.daysAbsent} Day${stats.daysAbsent === 1 ? '' : 's'}</div>
          </div>
        </div>

        ${sessionsHtml}

        <div style="margin-top: 10px;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Tasks & Project Deliverables Breakdown:</div>
          <table style="width: 100%; border-collapse: collapse; text-align: left; background: #fafafa; border: 1px solid #f1f5f9; border-radius: 6px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; font-size: 9px; text-transform: uppercase; font-weight: bold;">
                <th style="padding: 6px 10px;">#</th>
                <th style="padding: 6px 10px;">Date</th>
                <th style="padding: 6px 10px;">Task Title</th>
                <th style="padding: 6px 10px;">Category</th>
                <th style="padding: 6px 10px; text-align: center;">Completion</th>
                <th style="padding: 6px 10px;">Notes / Review</th>
              </tr>
            </thead>
            <tbody>
              ${taskRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NANDAN Studio - Staff Performance Report (${timeframeTitle})</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          color: #0f172a;
          background: #fff;
          margin: 0;
          padding: 0;
        }
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${logoHtml}
          <div>
            <h1 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.5px;">NANDAN STUDIO</h1>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748b; font-weight: 600;">Broadcast & Creative Media &bull; Staff Performance & Attendance Audit</p>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="background: #0f172a; color: #fff; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 6px; display: inline-block;">
            ${timeframeTitle.toUpperCase()} REPORT
          </div>
          <div style="font-size: 10px; color: #64748b; font-weight: 600; margin-top: 4px;">Generated: ${formatDateEnglish(new Date())} (Studio Time BDT)</div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
        <div>
          <span style="font-weight: 800; color: #0f172a;">REPORT SCOPE:</span>
          <span style="color: #475569; margin-left: 5px;">${filterMember === 'ALL' ? 'Complete Creative Studio Team' : 'Individual Staff Member'}</span>
        </div>
        <div>
          <span style="font-weight: 800; color: #0f172a;">TIMEFRAME:</span>
          <span style="color: #e11d48; font-weight: 700; margin-left: 5px;">${timeframeTitle} Review</span>
        </div>
        <div>
          <span style="font-weight: 800; color: #0f172a;">DIRECTOR:</span>
          <span style="color: #475569; margin-left: 5px;">Nil Utpal</span>
        </div>
      </div>

      <div>
        ${staffCardsHtml}
      </div>

      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #64748b;">
        <div>
          <p style="margin: 0; font-weight: 600;">NANDAN Studio Performance Intelligence Engine</p>
          <p style="margin: 2px 0 0;">This document is an authentic summary of shift attendance logs and work deliverables.</p>
        </div>
        <div style="text-align: center; width: 180px;">
          <div style="border-bottom: 1px solid #0f172a; margin-bottom: 4px; height: 35px;"></div>
          <div style="font-weight: 800; color: #0f172a;">Director's Signature</div>
          <div style="color: #94a3b8; font-size: 9px;">Creative Management</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=950,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    // If popups are blocked in iframe, render inside an invisible iframe or trigger print directly
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);
    
    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 500);
    }
  }
}
