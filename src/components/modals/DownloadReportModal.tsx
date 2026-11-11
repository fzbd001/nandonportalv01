import React, { useState } from 'react';
import { ExportTimeframe, User } from '../../types.ts';

interface DownloadReportModalProps {
  staffList: User[];
  onClose: () => void;
  onExportCSV: (timeframe: ExportTimeframe, filterMember: string) => void;
  onDownloadPDF: (timeframe: ExportTimeframe, filterMember: string) => void;
}

export const DownloadReportModal: React.FC<DownloadReportModalProps> = ({
  staffList,
  onClose,
  onExportCSV,
  onDownloadPDF
}) => {
  const [timeframe, setTimeframe] = useState<ExportTimeframe>('daily');
  const [filterMember, setFilterMember] = useState<string>('ALL');

  return (
    <div
      className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl border border-white/80 max-w-lg w-full rounded-3xl p-6 sm:p-7 flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 mb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shadow-md flex-shrink-0">
              <i className="fa-solid fa-file-arrow-down text-rose-500 text-base"></i>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                Download Work Reports
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Export employee deliverables &amp; attendance logs
              </p>
            </div>
          </div>
          {/* Circular close button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 flex items-center justify-center shadow-md border border-slate-100 transition-all flex-shrink-0 cursor-pointer"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div className="space-y-4 pt-1">
          {/* SELECT EXPORT TIMEFRAME */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              SELECT EXPORT TIMEFRAME
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['daily', 'weekly', 'monthly'] as ExportTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`py-2.5 rounded-2xl font-bold text-xs shadow-xs transition-all text-center capitalize cursor-pointer ${
                    timeframe === tf
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* FILTER MEMBER */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              FILTER MEMBER
            </label>
            <div className="relative">
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="w-full bg-white border border-slate-200/90 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 appearance-none shadow-xs cursor-pointer"
              >
                <option value="ALL">All Team Members (Complete Studio)</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <i className="fa-solid fa-chevron-down text-xs"></i>
              </div>
            </div>
          </div>

          {/* Report Format Info Box */}
          <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4 flex flex-col gap-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-800">Available Formats:</span>
              <span className="font-mono font-bold text-rose-600 text-xs">Official PDF &amp; CSV</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              Includes Employee Name, ID, Check-in/out, Total Minutes, Work Updates (tasks count &amp; details), and Absent Days count.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-3 px-5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200/90 shadow-sm transition-all text-center cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 justify-end">
              <button
                type="button"
                onClick={() => onExportCSV(timeframe, filterMember)}
                className="flex-1 sm:flex-initial py-3 px-4 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-file-csv text-xs"></i>
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => onDownloadPDF(timeframe, filterMember)}
                className="flex-1 sm:flex-initial py-3 px-5 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-file-pdf text-xs"></i>
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
