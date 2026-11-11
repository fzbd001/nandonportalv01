import React, { useState } from 'react';
import { AttendanceLog, Deliverable, User } from '../types.ts';
import { getTodayDateString } from '../utils/storage.ts';

interface BossRadarViewProps {
  users: User[];
  attendanceLogs: AttendanceLog[];
  deliverables: Deliverable[];
  onOpenDownloadModal: () => void;
  onOpenAssignModal: () => void;
  onInspectUser: (user: User) => void;
}

export const BossRadarView: React.FC<BossRadarViewProps> = ({
  users,
  attendanceLogs,
  deliverables,
  onOpenDownloadModal,
  onOpenAssignModal,
  onInspectUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const today = getTodayDateString();

  const staffList = users.filter(u => !u.isBoss);

  // Stats calculation
  let activeDutyCount = 0;
  staffList.forEach(s => {
    const log = attendanceLogs.find(a => a.empId === s.id && a.date === today);
    if (log && log.isCheckedIn) activeDutyCount++;
  });

  const todayTasks = deliverables.filter(d => d.date === today);
  const completedTasksCount = todayTasks.filter(d => d.progress >= 100).length;
  const inProgressTasksCount = todayTasks.filter(d => d.progress < 100).length;

  // Filtered staff list based on search
  const filteredStaff = staffList.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
           s.role.toLowerCase().includes(q) ||
           s.id.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Boss Top Operations Console Card */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Director Live Operations Console
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              Real-time attendance radar, workflow monitoring &amp; confidential task delegation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenDownloadModal}
              className="px-4 py-2.5 rounded-full bg-white/90 border border-slate-200/90 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-file-arrow-down text-rose-500 text-xs"></i> Download Report
            </button>
            <button
              onClick={onOpenAssignModal}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-bold hover:shadow-lg hover:shadow-rose-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-paper-plane text-xs"></i> Assign Job Directive
            </button>
          </div>
        </div>

        {/* 4 Boss Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-1">
          <div className="stat-card rounded-2xl p-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">TEAM CREATIVES</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {staffList.length} Staff
            </div>
          </div>
          <div className="stat-card rounded-2xl p-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">CURRENTLY ON DUTY</span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
              {activeDutyCount} Active
            </div>
          </div>
          <div className="stat-card rounded-2xl p-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">DELIVERABLES IN PROGRESS</span>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-500 mt-1">
              {inProgressTasksCount} Tasks
            </div>
          </div>
          <div className="stat-card rounded-2xl p-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">100% COMPLETED TODAY</span>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1">
              {completedTasksCount} Completed
            </div>
          </div>
        </div>
      </section>

      {/* Team Attendance & Live Deliverable Progress Table with SHIFT TIME Column */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Team Attendance &amp; Live Deliverable Progress
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time check-in logs, check-out status, and task velocity
            </p>
          </div>
          {/* Clean Search Pill Bar */}
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creative or role..."
              className="w-full bg-white/90 border border-slate-200/90 rounded-full pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 shadow-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wider font-bold text-slate-400">
                <th className="py-3.5 px-4 font-bold">CREATIVE</th>
                <th className="py-3.5 px-4 font-bold text-center">PRESENCE STATUS</th>
                <th className="py-3.5 px-4 font-bold text-center">CHECK IN</th>
                <th className="py-3.5 px-4 font-bold text-center">CHECK OUT</th>
                <th className="py-3.5 px-4 font-bold text-center">SHIFT TIME</th>
                <th className="py-3.5 px-4 font-bold w-48">WORK VELOCITY</th>
                <th className="py-3.5 px-4 font-bold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No creative members match your search.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const log = attendanceLogs.find(a => a.empId === staff.id && a.date === today);
                  const isPresent = Boolean(log?.isCheckedIn);
                  const checkIn = log?.checkInTime || '--:--';
                  const checkOut = log?.checkOutTime || '--:--';

                  let shiftTimeText = '--';
                  if (isPresent && log?.checkInTimestamp) {
                    const diffMs = Math.max(0, Date.now() - log.checkInTimestamp);
                    const mins = Math.floor(diffMs / 60000);
                    const hrs = Math.floor(mins / 60);
                    const remM = mins % 60;
                    shiftTimeText = `${hrs}h ${String(remM).padStart(2, '0')}m live`;
                  } else if (log && log.totalMinutes > 0) {
                    const hrs = Math.floor(log.totalMinutes / 60);
                    const remM = log.totalMinutes % 60;
                    shiftTimeText = `${hrs}h ${String(remM).padStart(2, '0')}m`;
                  }

                  const staffTasks = deliverables.filter(d => d.empId === staff.id);
                  const compTasks = staffTasks.filter(d => d.progress >= 100).length;
                  const totalTasks = staffTasks.length;
                  const avgVelocity = totalTasks > 0
                    ? Math.round(staffTasks.reduce((acc, t) => acc + t.progress, 0) / totalTasks)
                    : 0;

                  return (
                    <tr key={staff.id} className="hover:bg-white/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{staff.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{staff.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> In Office
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-700">
                        {checkIn}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-700">
                        {checkOut}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-center font-mono font-bold text-xs ${
                          isPresent ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {shiftTimeText}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 w-44">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={avgVelocity >= 100 ? 'text-emerald-600 font-extrabold' : 'text-rose-600'}>
                              {avgVelocity}%
                            </span>
                            <span className="text-slate-400 font-normal">
                              {compTasks}/{totalTasks} tasks
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                avgVelocity >= 100
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                                  : 'bg-gradient-to-r from-rose-500 to-rose-600'
                              }`}
                              style={{ width: `${avgVelocity}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onInspectUser(staff)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-transparent transition-all shadow-xs cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
