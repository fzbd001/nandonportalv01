import React, { useState } from 'react';
import { CREATIVE_CATEGORIES, User } from '../../types.ts';

interface AssignDirectiveModalProps {
  staffList: User[];
  onClose: () => void;
  onAssign: (empId: string, category: string, title: string, instructions: string) => void;
}

export const AssignDirectiveModal: React.FC<AssignDirectiveModalProps> = ({
  staffList,
  onClose,
  onAssign
}) => {
  const [targetUserId, setTargetUserId] = useState(staffList[0]?.id || '');
  const [category, setCategory] = useState<string>(CREATIVE_CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetUserId) return;
    onAssign(targetUserId, category, title.trim(), instructions.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-md w-full rounded-3xl p-6 sm:p-7 flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-extrabold text-slate-900">Assign Job Directive (Boss)</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Assign To Employee
            </label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Creative Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              {CREATIVE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Directive / Project Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Urgent YouTube Thumbnail & Banner Revision"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Boss Special Instructions
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Reference link, deadline, export specs..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer transition-all"
            >
              Dispatch Directive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
