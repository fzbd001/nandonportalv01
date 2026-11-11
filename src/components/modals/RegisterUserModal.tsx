import React, { useState } from 'react';
import { User } from '../../types.ts';

interface RegisterUserModalProps {
  users: User[];
  onClose: () => void;
  onRegister: (newUser: User) => boolean;
}

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({
  users,
  onClose,
  onRegister
}) => {
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('1234');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = empId.trim().toUpperCase();
    if (!cleanId || !name.trim() || !role.trim() || !password.trim()) return;

    if (users.some(u => u.id.toLowerCase() === cleanId.toLowerCase())) {
      setErrorMsg('This Employee ID already exists. Please choose a unique ID.');
      return;
    }

    const newUser: User = {
      id: cleanId,
      name: name.trim(),
      role: role.trim(),
      isBoss: false,
      password: password.trim()
    };

    const success = onRegister(newUser);
    if (success) {
      onClose();
    }
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
          <h3 className="text-base font-extrabold text-slate-900">Register Custom Employee ID</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Custom Employee ID
            </label>
            <input
              type="text"
              required
              value={empId}
              onChange={(e) => {
                setEmpId(e.target.value);
                setErrorMsg('');
              }}
              placeholder="e.g. EMP-105"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tanvir Ahmed"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Designation
            </label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. 3D Animator"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Password
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Default password (e.g. 1234)"
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
              Add Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
