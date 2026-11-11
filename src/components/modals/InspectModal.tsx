import React from 'react';
import { AttendanceLog, Deliverable, User } from '../../types.ts';

interface InspectModalProps {
  user: User;
  deliverables: Deliverable[];
  attendanceLogs: AttendanceLog[];
  onClose: () => void;
}

export const InspectModal: React.FC<InspectModalProps> = ({
  user,
  deliverables,
  attendanceLogs,
  onClose
}) => {
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
        className="bg-white/95 backdrop-blur-2xl border border-white/80 max-w-xl w-full rounded-3xl p-6 sm:p-7 flex flex-col shadow-2xl relative max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {user.name}'s Shift Deliverables
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {user.role} • ID: {user.id}
            </p>
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
                  <th className="py-2.5 px-3 text-center">Check in</th>
                  <th className="py-2.5 px-3 text-center">Check out</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  staffLogs.map((log) => {
                    let timeTxt = null;
                    if (log.isCheckedIn) {
                      timeTxt = <span className="text-amber-600 font-bold">In Progress</span>;
                    } else if (log.totalMinutes > 0) {
                      timeTxt = `${log.totalMinutes} mins`;
                    } else {
                      timeTxt = '—';
                    }

                    return (
                      <tr key={log.id}>
                        <td className="py-2 px-3 font-semibold text-slate-700">
                          {log.dateFormatted || log.date}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">
                          {log.checkInTime || '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">
                          {log.checkOutTime || '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">{timeTxt}</td>
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
