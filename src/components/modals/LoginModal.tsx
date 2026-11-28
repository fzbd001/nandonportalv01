import React, { useState } from 'react';
import { WorkLocation } from '../../types.ts';

interface LoginModalProps {
  savedLogo: string | null;
  systemLogoutNotice?: string | null;
  onDismissNotice?: () => void;
  onOpenLogoModal: () => void;
  onLogin: (empId: string, password: string, workLocation: WorkLocation) => boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  savedLogo,
  systemLogoutNotice,
  onDismissNotice,
  onOpenLogoModal,
  onLogin
}) => {
  const [workLocation, setWorkLocation] = useState<WorkLocation>('Office');
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId.trim() || !password.trim()) return;
    const ok = onLogin(empId.trim(), password.trim(), workLocation);
    if (!ok) {
      setErrorMsg('Invalid ID or password. Please check with your Studio Director.');
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
          <img
            src={savedLogo || './favicon.png'}
            alt="NANDAN"
            className="w-full h-full object-cover rounded-[22%]"
          />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">NANDAN STUDIO</h2>
        <p className="text-xs text-slate-500 font-semibold mb-5">
          Broadcast &amp; Creative Media • Secure Portal Sign In
        </p>

        {systemLogoutNotice && (
          <div className="w-full mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-start gap-2.5 shadow-xs">
            <i className="fa-solid fa-power-off text-rose-600 mt-0.5 flex-shrink-0"></i>
            <div className="flex-1 leading-relaxed">{systemLogoutNotice}</div>
            {onDismissNotice && (
              <button
                type="button"
                onClick={onDismissNotice}
                className="text-amber-700 hover:text-amber-950 cursor-pointer flex-shrink-0"
                title="Dismiss"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="w-full mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* Secure Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Work Location Segmented Toggle */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Work Location
            </label>
            <div className="w-full bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setWorkLocation('Office')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  workLocation === 'Office'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className={`fa-solid fa-building text-xs ${workLocation === 'Office' ? 'text-rose-400' : 'text-rose-500'}`}></i>
                <span>From Office</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkLocation('Home')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  workLocation === 'Home'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className={`fa-solid fa-house-laptop text-xs ${workLocation === 'Home' ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                <span>From Home</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Employee / Director ID
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                <i className="fa-solid fa-id-badge"></i>
              </span>
              <input
                type="text"
                required
                autoFocus
                value={empId}
                onChange={(e) => {
                  setEmpId(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter your assigned ID (e.g. EMP-101)"
                className="w-full bg-slate-50/90 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                <i className="fa-solid fa-lock"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter your password"
                className="w-full bg-slate-50/90 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-right-to-bracket text-xs"></i> <span>SIGN IN</span>
          </button>
        </form>

        <div className="w-full mt-5 pt-4 border-t border-slate-200/70 text-center">
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Contact Creative Director if you need your ID or password.
          </p>
        </div>
      </div>
    </div>
  );
};
