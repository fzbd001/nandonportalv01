import React, { useState } from 'react';
import { CREATIVE_CATEGORIES, User } from '../../types.ts';

interface AssignDirectiveModalProps {
  staffList: User[];
  onClose: () => void;
  onAssign: (empId: string, categories: string[], title: string, instructions: string) => void;
}

export const AssignDirectiveModal: React.FC<AssignDirectiveModalProps> = ({
  staffList,
  onClose,
  onAssign
}) => {
  const [targetUserId, setTargetUserId] = useState(staffList[0]?.id || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([CREATIVE_CATEGORIES[0]]);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');

  const allSelected = selectedCategories.length === CREATIVE_CATEGORIES.length;

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  };

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...CREATIVE_CATEGORIES]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || selectedCategories.length === 0) return;
    onAssign(targetUserId, selectedCategories, title.trim(), instructions.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl max-w-lg w-full rounded-3xl p-5 sm:p-6 flex flex-col shadow-2xl border border-white relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Assign Studio Job Directive
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select one or multiple categories to assign at once
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200/80 shadow-xs text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assign To Creative */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              ASSIGN TO CREATIVE
            </label>
            <div className="relative">
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full appearance-none bg-slate-50/90 border border-slate-200/90 rounded-2xl px-4 py-2.5 pr-10 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 cursor-pointer transition-all"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down text-xs text-slate-500 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"></i>
            </div>
          </div>

          {/* Select Categories (Multi-Select Grid) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                SELECT CATEGORIES
              </label>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200/70 px-2.5 py-0.5 rounded-full">
                  {selectedCategories.length} Selected
                </span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-[11px] font-bold text-slate-800 underline hover:text-rose-600 transition-colors cursor-pointer"
                >
                  {allSelected ? 'Clear All' : 'Select All'}
                </button>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-2.5 sm:p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CREATIVE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`w-full rounded-2xl px-3 py-2.5 border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <i className="fa-solid fa-check text-[10px]"></i>}
                      </span>
                      <span className="text-xs font-bold truncate">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Task / Directive Title (Optional) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              TASK / DIRECTIVE TITLE{' '}
              <span className="font-semibold text-slate-400">(OPTIONAL - AUTO-FILLS IF EMPTY)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prime Time Bulletin & Daily Cards"
              className="w-full bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 transition-all"
            />
          </div>

          {/* Director Instructions */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              DIRECTOR INSTRUCTIONS
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Specify deadline, dimensions, or priorities..."
              className="w-full bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 transition-all"
            ></textarea>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!targetUserId || selectedCategories.length === 0}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer transition-all"
            >
              <i className="fa-solid fa-paper-plane text-xs"></i>
              <span>Send Directive</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
