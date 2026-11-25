import React from 'react';
import { AttendanceLog, AttendanceMetaStore, Deliverable, User, WorkLocationStore } from '../../types.ts';
import {
  findActiveOrTodayLog,
  formatSessionLabel,
  getDayAttendanceMeta,
  getTodayDateString,
  getWorkLocationForDate
} from '../../utils/storage.ts';

interface InspectModalProps {
  user: User;
  deliverables: Deliverable[];
  attendanceLogs: AttendanceLog[];
  workLocations: WorkLocationStore;
  attendanceMeta: AttendanceMetaStore;
  onToggleReCheckInPermission?: (empId: string, allow: boolean) => void;
  onClose: () => void;
}

export const InspectModal: React.FC<InspectModalProps> = ({
  user,
  deliverables,
  attendanceLogs,
  workLocations,
  attendanceMeta,
  onToggleReCheckInPermission,
  onClose
}) => {
  const today = getTodayDateString();
  const todayLog = findActiveOrTodayLog(attendanceLogs, user.id, today);
  const effectiveDate = todayLog?.date || today;
  const todayMeta = getDayAttendanceMeta(attendanceMeta, user.id, effectiveDate);
  const todayLoc =
    getWorkLocationForDate(workLocations, user.id, effectiveDate, false) ||
    (todayLog ? (todayMeta?.sessions?.[0]?.location || getWorkLocationForDate(workLocations, user.id, effectiveDate, true)) : null);
  const isTodaySystemLogout = Boolean(todayMeta?.systemLogout && !todayLog?.isCheckedIn);
  const hasCheckedOutToday = Boolean(
    todayLog &&
    !todayLog.isCheckedIn &&
    (todayLog.checkOutTime || todayLog.totalMinutes > 0 || (todayMeta?.sessions?.length ?? 0) > 0 || todayMeta?.systemLogout)
  );
  const canGrantReCheckIn = Boolean(
    onToggleReCheckInPermission && (todayLoc || 'Office') === 'Office' && hasCheckedOutToday && !todayLog?.isCheckedIn
  );
  const isReCheckInAllowed = Boolean(todayMeta?.reCheckInAllowed);

  const staffTasks = deliverables.filter(d => d.empId === user.id);
  const staffLogs = attendanceLogs
    .filter(a => a.empId === user.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div
      className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl border border-white/80 max-w-2xl w-full rounded-3xl p-6 sm:p-7 flex flex-col shadow-2xl relative max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {user.name}'s Shift Deliverables
              </h3>
              {todayLoc && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    todayLoc === 'Home'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  <i className={`fa-solid ${todayLoc === 'Home' ? 'fa-house-laptop text-indigo-500' : 'fa-building text-rose-400'}`}></i>
                  From {todayLoc}
                </span>
              )}
              {isTodaySystemLogout && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-300">
                  <i className="fa-solid fa-power-off text-[9px]"></i> System Logout
                </span>
              )}
              {todayLog?.isCheckedIn && isReCheckInAllowed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <i className="fa-solid fa-unlock-keyhole text-[9px]"></i> Boss Resumed Check-In
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 flex-wrap mt-1">
              <p className="text-xs font-medium text-slate-500">
                {user.role} • ID: {user.id}
              </p>
              {canGrantReCheckIn && onToggleReCheckInPermission && (
                <button
                  type="button"
                  onClick={() => onToggleReCheckInPermission(user.id, true)}
                  title="Immediately restore employee to Checked In status with accumulated daily shift time"
                  className="px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-300 hover:bg-emerald-600 hover:text-white hover:border-transparent"
                >
                  <i className="fa-solid fa-unlock-keyhole text-[9px]"></i>
                  <span>Boss Permission: Resume Check-In</span>
                </button>
              )}
            </div>
          </div>
          {/* Round White Close Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 flex items-center justify-center shadow-md border border-slate-100 transition-all flex-shrink-0 cursor-pointer"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Deliverables List Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[50vh]">
          {staffTasks.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <i className="fa-regular fa-clipboard text-2xl mb-1 text-slate-300"></i>
              <p className="text-xs font-semibold">No deliverables recorded yet for today</p>
            </div>
          ) : (
            staffTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-900 text-white tracking-wider">
                    {task.category}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      task.progress >= 100 ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  >
                    {task.progress}%
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{task.title}</h4>
                {task.notes && (
                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                    {task.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* 5-Day Attendance History inside Inspect Modal */}
        <div className="mt-5 pt-4 border-t border-slate-200/80">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
            Past 5 Days Attendance History
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/70">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Location</th>
                  <th className="py-2.5 px-3 text-center">Check in</th>
                  <th className="py-2.5 px-3 text-center">Check out</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400 text-xs">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  staffLogs.map((log) => {
                    const rowMeta = getDayAttendanceMeta(attendanceMeta, user.id, log.date);
                    const logLoc =
                      getWorkLocationForDate(workLocations, user.id, log.date, false) ||
                      rowMeta?.sessions?.[0]?.location ||
                      (log.date === today ? getWorkLocationForDate(workLocations, user.id, log.date, true) : null);
                    const isSysLogout = Boolean(rowMeta?.systemLogout && !log.isCheckedIn);

                    let timeTxt = null;
                    if (log.isCheckedIn) {
                      timeTxt = <span className="text-amber-600 font-bold">In Progress</span>;
                    } else if (log.totalMinutes > 0) {
                      const hrs = Math.floor(log.totalMinutes / 60);
                      const mins = log.totalMinutes % 60;
                      timeTxt = hrs > 0 ? `${log.totalMinutes}m (${hrs}h ${mins}m)` : `${log.totalMinutes} mins`;
                    } else {
                      timeTxt = '—';
                    }

                    return (
                      <tr key={log.id} className="align-top">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-700">
                            {log.dateFormatted || log.date}
                          </div>
                          {rowMeta?.sessions && rowMeta.sessions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rowMeta.sessions.map((sess, idx) => (
                                <span
                                  key={sess.id}
                                  className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${
                                    sess.isSystemLogout
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : !sess.checkOutTime
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {formatSessionLabel(sess, idx)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {logLoc === 'Office' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                              <i className="fa-solid fa-building text-rose-500 text-[9px]"></i> Office
                            </span>
                          ) : logLoc === 'Home' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              <i className="fa-solid fa-house-laptop text-indigo-500 text-[9px]"></i> Home
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {rowMeta?.sessions && rowMeta.sessions.length > 0
                            ? rowMeta.sessions[0].checkInTime
                            : (log.checkInTime || '—')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="font-mono text-slate-600">{log.checkOutTime || '—'}</div>
                          {isSysLogout && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-50 text-rose-600 border border-rose-200">
                              System Logout
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">{timeTxt}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
