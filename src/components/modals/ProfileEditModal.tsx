import React, { useState } from 'react';
import { User } from '../../types.ts';

interface ProfileEditModalProps {
  currentUser: User;
  onClose: () => void;
  onSave: (updated: Partial<User>) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  currentUser,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [password, setPassword] = useState(currentUser.password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !password.trim()) return;
    onSave({
      name: name.trim(),
      role: role.trim(),
      password: password.trim()
    });
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
          <h3 className="text-base font-extrabold text-slate-900">Edit My Profile</h3>
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
              Employee ID (Fixed)
            </label>
            <input
              type="text"
              readOnly
              value={currentUser.id}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Your Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Designation / Role
            </label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Account Password
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
