import React, { useEffect, useState } from 'react';
import { AttendanceLog, CREATIVE_CATEGORIES, Deliverable, User } from '../types.ts';

interface StaffViewProps {
  currentUser: User;
  todayLog: AttendanceLog | undefined;
  staff5DayLogs: AttendanceLog[];
  deliverables: Deliverable[];
  onCheckIn: () => void;
  onCheckOut: () => void;
  onSubmitDeliverable: (category: string, title: string, notes: string, progress: number) => void;
  onAdjustProgress: (taskId: string, delta: number) => void;
  onToggleCompleted: (taskId: string) => void;
  onDeleteDeliverable: (taskId: string) => void;
}

export const StaffView: React.FC<StaffViewProps> = ({
  currentUser,
  todayLog,
  staff5DayLogs,
  deliverables,
  onCheckIn,
  onCheckOut,
  onSubmitDeliverable,
  onAdjustProgress,
  onToggleCompleted,
  onDeleteDeliverable
}) => {
  const [taskCategory, setTaskCategory] = useState<string>(CREATIVE_CATEGORIES[0]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskProgress, setTaskProgress] = useState(25);
  const [activeDurationText, setActiveDurationText] = useState('0h 00m active duty');

  const isCheckedIn = Boolean(todayLog?.isCheckedIn);

  // Live timer for active shift
  useEffect(() => {
    if (!isCheckedIn || !todayLog?.checkInTimestamp) {
      if (todayLog && todayLog.totalMinutes > 0) {
        const hrs = Math.floor(todayLog.totalMinutes / 60);
        const mins = todayLog.totalMinutes % 60;
        if (hrs > 0) {
          setActiveDurationText(`${hrs}h ${String(mins).padStart(2, '0')}m completed`);
        } else {
          setActiveDurationText(`${mins} min completed`);
        }
      } else {
        setActiveDurationText('0h 00m active duty');
      }
      return;
    }

    const updateTimer = () => {
      const diffMs = Math.max(0, Date.now() - todayLog.checkInTimestamp);
      const totalMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMins / 60);
      const remMins = totalMins % 60;
      if (hours > 0) {
        setActiveDurationText(`${hours}h ${String(remMins).padStart(2, '0')}m active duty`);
      } else {
        setActiveDurationText(`${remMins} min active duty`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn, todayLog]);

  const userTasks = deliverables.filter(d => d.empId === currentUser.id);
  const completedCount = userTasks.filter(t => t.progress >= 100).length;
  const avgProgress = userTasks.length > 0
    ? Math.round(userTasks.reduce((sum, t) => sum + t.progress, 0) / userTasks.length)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onSubmitDeliverable(taskCategory, taskTitle.trim(), taskNotes.trim(), taskProgress);
    setTaskTitle('');
    setTaskNotes('');
    setTaskProgress(25);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Card: Attendance & Live Shift Control */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* User info with avatar badge */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white flex items-center justify-center text-xl shadow-md">
              <i className="fa-solid fa-photo-film"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {currentUser.name}
                </h2>
                <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                  {currentUser.id}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">{currentUser.role}</p>
            </div>
          </div>

          {/* Controls: Duty Status Pill + Check In + Check Out */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
                isCheckedIn ? 'duty-pill-active' : 'duty-pill-inactive'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              ></span>
              <span>{isCheckedIn ? 'On Active Duty' : 'Checked Out'}</span>
            </div>
            <button
              onClick={onCheckIn}
              disabled={isCheckedIn}
              className="btn-pill-checkin px-6 py-2.5 text-xs sm:text-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-right-to-bracket text-xs"></i> Check In
            </button>
            <button
              onClick={onCheckOut}
              disabled={!isCheckedIn}
              className="btn-pill-checkout px-6 py-2.5 text-xs sm:text-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i> Check Out
            </button>
          </div>
        </div>

        {/* Attendance Metrics Grid (4 Stat Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-1">
          <div className="stat-card rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">CHECKED IN</span>
            <span className="text-base sm:text-lg font-mono font-bold text-slate-800 mt-1">
              {todayLog?.checkInTime || '--:--'}
            </span>
          </div>
          <div className="stat-card rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">CHECKED OUT</span>
            <span className="text-base sm:text-lg font-mono font-bold text-slate-800 mt-1">
              {todayLog?.checkOutTime || '--:--'}
            </span>
          </div>
          <div className="stat-card rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">SHIFT STATUS</span>
            <span className="text-base sm:text-lg font-bold text-rose-600 mt-1 truncate">
              {activeDurationText}
            </span>
          </div>
          <div className="stat-card rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">DAILY VELOCITY</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {completedCount} Done
              </span>
            </div>
            <span className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {avgProgress}%
            </span>
          </div>
        </div>
      </section>

      {/* Deliverables Section (Form & List) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Log Daily Deliverable Form */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-sm shadow-sm">
                +
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Log Daily Deliverable</h3>
                <p className="text-[11px] text-slate-500 font-medium">Track projects &amp; daily work progress</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  NANDAN Creative Category
                </label>
                <div className="relative">
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full bg-white/90 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  >
                    {CREATIVE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Project / Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Daily Weather Card Update & Export"
                  className="w-full bg-white/90 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Work Notes / Revisions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Asset links, render status, review notes..."
                  className="w-full bg-white/90 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40 placeholder-slate-400 resize-none"
                ></textarea>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Initial Completion %
                  </label>
                  <span className="text-xs font-mono font-bold text-rose-600">{taskProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={taskProgress}
                  onChange={(e) => setTaskProgress(parseInt(e.target.value) || 0)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-paper-plane text-xs"></i> Submit Deliverable
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Today's Deliverables List */}
        <div id="todays-deliverables-section" className="lg:col-span-7 glass-panel rounded-3xl p-5 sm:p-6 flex flex-col transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Today's Deliverables</h3>
              <p className="text-[11px] text-slate-500 font-medium">Your private shift tasks &amp; director directives</p>
            </div>
            <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full">
              {userTasks.length} Deliverable{userTasks.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
            {userTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <i className="fa-regular fa-clipboard text-3xl mb-2 text-slate-300"></i>
                <p className="text-xs font-semibold">No deliverables logged today.</p>
                <p className="text-[11px] text-slate-400">Use the form on the left to add your first work item.</p>
              </div>
            ) : (
              userTasks.map((task) => (
                <div
                  key={task.id}
                  id={`deliverable-${task.id}`}
                  className="p-4 rounded-2xl bg-white/90 border border-slate-200/90 shadow-sm flex flex-col gap-2.5 transition-all hover:shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-900 text-white tracking-wider">
                        {task.category}
                      </span>
                      {task.title.startsWith('[DIRECTOR DIRECTIVE]') && (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          DIRECTIVE
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">{task.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-mono font-bold ${
                          task.progress >= 100 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {task.progress}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h4>
                    {task.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                        {task.notes}
                      </p>
                    )}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${
                        task.progress >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                          : 'bg-gradient-to-r from-rose-500 to-rose-600'
                      } transition-all duration-300`}
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onAdjustProgress(task.id, -10)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        -10%
                      </button>
                      <button
                        onClick={() => onAdjustProgress(task.id, 10)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        +10%
                      </button>
                      <button
                        onClick={() => onAdjustProgress(task.id, 25)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        +25%
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleCompleted(task.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                          task.progress >= 100
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                        } transition-all cursor-pointer`}
                      >
                        <i className="fa-solid fa-check text-[10px] mr-1"></i>{' '}
                        {task.progress >= 100 ? 'Done' : 'Mark Done'}
                      </button>
                      <button
                        onClick={() => onDeleteDeliverable(task.id)}
                        className="text-slate-400 hover:text-rose-600 text-xs px-1 transition-colors cursor-pointer"
                        title="Delete Task"
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 5-Day Attendance Log Section (Staff View) */}
      <section className="glass-panel rounded-3xl p-5 sm:p-7 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              5-Day Attendance Log
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Recent shift check-in, check-out history and duration
            </p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-full w-fit">
            Past 5 Shifts Log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wider font-bold text-slate-400">
                <th className="py-3.5 px-4 font-bold">Staff / Date</th>
                <th className="py-3.5 px-4 font-bold text-center">Check in</th>
                <th className="py-3.5 px-4 font-bold text-center">Check out</th>
                <th className="py-3.5 px-4 font-bold text-right">Time</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {staff5DayLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                    No recent shift logs recorded yet.
                  </td>
                </tr>
              ) : (
                staff5DayLogs.map((log) => {
                  let timeBadge = null;
                  if (log.isCheckedIn) {
                    timeBadge = (
                      <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                        In Progress
                      </span>
                    );
                  } else if (log.totalMinutes > 0) {
                    const hrs = Math.floor(log.totalMinutes / 60);
                    const mins = log.totalMinutes % 60;
                    const hrsText = hrs > 0 ? ` (${hrs}h ${mins}m)` : '';
                    timeBadge = (
                      <span className="font-mono text-slate-700 font-semibold text-xs">
                        {log.totalMinutes} mins{hrsText}
                      </span>
                    );
                  } else {
                    timeBadge = <span className="text-slate-400 font-mono text-xs">—</span>;
                  }

                  return (
                    <tr key={log.id} className="hover:bg-white/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm">{currentUser.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {log.dateFormatted || log.date}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-700">
                        {log.checkInTime || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-700">
                        {log.checkOutTime || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">{timeBadge}</td>
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
