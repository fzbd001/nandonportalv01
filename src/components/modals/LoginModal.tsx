import React, { useState } from 'react';
import { User } from '../../types.ts';

interface LoginModalProps {
  users: User[];
  savedLogo: string | null;
  onOpenLogoModal: () => void;
  onLogin: (empId: string, password: string) => boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  users,
  savedLogo,
  onOpenLogoModal,
  onLogin
}) => {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const boss = users.find(u => u.isBoss) || users[0];
  const staffMembers = users.filter(u => !u.isBoss);

  const handleSelectQuickUser = (user: User) => {
    setEmpId(user.id);
    setPassword(user.password);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId.trim()) return;
    const ok = onLogin(empId.trim(), password.trim());
    if (!ok) {
      setErrorMsg('Invalid Employee ID or password. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="glass-panel max-w-md w-full rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl relative">
        {/* Studio Emblem */}
        <div
          className="nandan-logo-badge mb-3 w-14 h-14"
          onClick={onOpenLogoModal}
          title="Click to upload/change Logo"
        >
          {savedLogo ? (
            <img src={savedLogo} alt="NANDAN" className="w-full h-full object-cover rounded-[22%]" />
          ) : (
            <span className="text-white font-extrabold text-xs tracking-wider select-none">NANDAN</span>
          )}
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">NANDAN STUDIO</h2>
        <p className="text-xs text-slate-500 font-semibold mb-6">
          Broadcast &amp; Creative Media • Portal Sign In
        </p>

        {/* Quick Switch User Account */}
        <div className="w-full mb-5">
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
            QUICK SWITCH USER ACCOUNT
          </label>

          {/* Boss Card at Top */}
          {boss && (
            <button
              type="button"
              onClick={() => handleSelectQuickUser(boss)}
              className="w-full mb-2 px-3.5 py-2 rounded-xl bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/70 text-left flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-rose-900">{boss.name}</span>
                <span className="text-[10px] font-semibold text-rose-500">(Boss)</span>
              </div>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md text-slate-600 border border-rose-100 font-bold">
                {boss.id}
              </span>
            </button>
          )}

          {/* Employees in 1 single horizontal row */}
          <div className="grid grid-cols-4 gap-1.5">
            {staffMembers.slice(0, 4).map((staff) => (
              <button
                key={staff.id}
                type="button"
                onClick={() => handleSelectQuickUser(staff)}
                className="py-1.5 px-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-center transition-all cursor-pointer"
                title={`${staff.name} (${staff.id})`}
              >
                <div className="text-[11px] font-bold text-slate-800 truncate">{staff.name}</div>
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="w-full mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Employee ID
            </label>
            <input
              type="text"
              required
              value={empId}
              onChange={(e) => {
                setEmpId(e.target.value);
                setErrorMsg('');
              }}
              placeholder="e.g. EMP-101 or boss123"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40 font-mono"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 text-xs">
                <i className="fa-solid fa-key"></i>
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Login</span> <i className="fa-solid fa-arrow-right text-xs"></i>
          </button>
        </form>
      </div>
    </div>
  );
};
