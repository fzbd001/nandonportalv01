import React, { useMemo, useState } from 'react';
import { User } from '../../types.ts';

interface RegisterUserModalProps {
  users: User[];
  onClose: () => void;
  onRegister: (newUser: User) => boolean;
  onUpdatePassword: (userId: string, newPassword: string) => void;
  onDeleteUser: (userId: string) => void;
}

function generateNextEmpId(users: User[]): string {
  const nums = users
    .map((u) => {
      const m = u.id.match(/EMP-(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const maxNum = nums.length > 0 ? Math.max(...nums) : 100;
  return `EMP-${maxNum + 1}`;
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({
  users,
  onClose,
  onRegister,
  onUpdatePassword,
  onDeleteUser
}) => {
  const staffList = useMemo(() => users.filter((u) => !u.isBoss), [users]);

  const [empId, setEmpId] = useState(() => generateNextEmpId(users));
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState(() => generatePin());
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Inline password edit state
  const [editingPassId, setEditingPassId] = useState<string | null>(null);
  const [draftPass, setDraftPass] = useState('');

  // Inline delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const portalUrl = 'https://fzbd001.github.io/nandonportalv01/';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = empId.trim().toUpperCase();
    if (!cleanId || !name.trim() || !role.trim() || !password.trim()) return;

    if (users.some((u) => u.id.toLowerCase() === cleanId.toLowerCase())) {
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
      setName('');
      setRole('');
      setEmpId(generateNextEmpId([...users, newUser]));
      setPassword(generatePin());
      setErrorMsg('');
    }
  };

  const handleCopyInvite = async (staff: User) => {
    const inviteText = [
      `NANDAN Studio Portal Access`,
      `Name: ${staff.name} (${staff.role})`,
      `Portal Link: ${portalUrl}`,
      `Employee ID: ${staff.id}`,
      `Password: ${staff.password}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(inviteText);
      setCopiedId(staff.id);
      setTimeout(() => setCopiedId((prev) => (prev === staff.id ? null : prev)), 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopyAll = async () => {
    if (staffList.length === 0) return;
    const allText = [
      `NANDAN Studio Team Credentials`,
      `Portal Link: ${portalUrl}`,
      ``,
      ...staffList.map(
        (s, idx) => `${idx + 1}. ${s.name} (${s.role}) — ID: ${s.id} | Pass: ${s.password}`
      )
    ].join('\n');

    try {
      await navigator.clipboard.writeText(allText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2200);
    } catch {
      // ignore
    }
  };

  const handleSavePassword = (userId: string) => {
    const cleaned = draftPass.trim();
    if (!cleaned) return;
    onUpdatePassword(userId, cleaned);
    setEditingPassId(null);
    setDraftPass('');
  };

  return (
    <div
      className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl max-w-lg w-full rounded-3xl p-5 sm:p-6 flex flex-col shadow-2xl border border-white relative max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100 mb-4 flex-shrink-0">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Team IDs &amp; Access Credentials
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Create new employee IDs &amp; copy login details to send
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

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-1 space-y-5 flex-1 min-h-0">
          {/* Create New Employee Account Card */}
          <form
            onSubmit={handleSubmit}
            className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 space-y-3"
          >
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600">
              CREATE NEW EMPLOYEE ACCOUNT
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  EMPLOYEE ID
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
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  ACCESS PASSWORD
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="e.g. 4829"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-9 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(generatePin())}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 text-xs cursor-pointer"
                    title="Generate random 4-digit PIN"
                  >
                    <i className="fa-solid fa-dice"></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanvir Hasan"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  DESIGNATION
                </label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Video Editor"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <i className="fa-solid fa-user-plus text-[11px]"></i>
                <span>Create &amp; Save ID</span>
              </button>
            </div>
          </form>

          {/* Active Employee Credentials List */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                ACTIVE EMPLOYEE CREDENTIALS ({staffList.length})
              </span>
              {staffList.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <i className={`fa-solid ${copiedAll ? 'fa-check' : 'fa-copy'} text-[10px]`}></i>
                  <span>{copiedAll ? 'All Copied!' : 'Copy All'}</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {staffList.length === 0 ? (
                <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
                  No employees registered yet. Create an ID above to send credentials.
                </div>
              ) : (
                staffList.map((staff) => {
                  const isEditingPass = editingPassId === staff.id;
                  const isConfirmingDelete = confirmDeleteId === staff.id;
                  const isCopied = copiedId === staff.id;

                  return (
                    <div
                      key={staff.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col gap-2.5 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-extrabold text-slate-900">{staff.name}</span>
                            <span className="text-[11px] font-medium text-slate-500 truncate">
                              • {staff.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
                            <span className="text-slate-500">
                              ID: <strong className="text-slate-900">{staff.id}</strong>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500">
                              Pass: <strong className="text-rose-600">{staff.password}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyInvite(staff)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                            title="Copy login invite with link, ID & password"
                          >
                            <i className={`fa-solid ${isCopied ? 'fa-check' : 'fa-copy'} text-[10px]`}></i>
                            <span>{isCopied ? 'Copied!' : 'Copy Invite'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteId(null);
                              if (isEditingPass) {
                                setEditingPassId(null);
                              } else {
                                setEditingPassId(staff.id);
                                setDraftPass(staff.password);
                              }
                            }}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-colors cursor-pointer ${
                              isEditingPass
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-amber-50 hover:bg-amber-100 border-amber-200/80 text-amber-600'
                            }`}
                            title="Change Password"
                          >
                            <i className="fa-solid fa-key text-[11px]"></i>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingPassId(null);
                              setConfirmDeleteId(isConfirmingDelete ? null : staff.id);
                            }}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-colors cursor-pointer ${
                              isConfirmingDelete
                                ? 'bg-rose-600 border-rose-600 text-white'
                                : 'bg-rose-50 hover:bg-rose-100 border-rose-200/80 text-rose-600'
                            }`}
                            title="Delete Employee"
                          >
                            <i className="fa-solid fa-trash-can text-[11px]"></i>
                          </button>
                        </div>
                      </div>

                      {/* Inline Password Reset Row */}
                      {isEditingPass && (
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                          <input
                            type="text"
                            value={draftPass}
                            onChange={(e) => setDraftPass(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSavePassword(staff.id);
                              } else if (e.key === 'Escape') {
                                setEditingPassId(null);
                              }
                            }}
                            placeholder="New password..."
                            className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleSavePassword(staff.id)}
                            disabled={!draftPass.trim()}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPassId(null)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Inline Delete Confirmation Row */}
                      {isConfirmingDelete && (
                        <div className="pt-2 border-t border-rose-100 flex items-center justify-between gap-2 bg-rose-50/60 -mx-1 px-2.5 py-2 rounded-xl">
                          <span className="text-[11px] font-bold text-rose-700">
                            Delete {staff.name} ({staff.id}) permanently?
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteUser(staff.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3.5 mt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
