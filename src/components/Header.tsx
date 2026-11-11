import React, { useEffect, useState } from 'react';
import { formatTime12h } from '../utils/storage.ts';
import { NotificationItem, User } from '../types.ts';

interface HeaderProps {
  currentUser: User;
  currentViewMode: 'staff' | 'boss';
  onSwitchViewMode: (mode: 'staff' | 'boss') => void;
  savedLogo: string | null;
  onOpenLogoModal: () => void;
  onOpenProfileModal: () => void;
  onOpenRegisterModal: () => void;
  onSignOut: () => void;
  notifications: NotificationItem[];
  readNotifIds: string[];
  onMarkAllRead: () => void;
  onMarkSingleRead: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentViewMode,
  onSwitchViewMode,
  savedLogo,
  onOpenLogoModal,
  onOpenProfileModal,
  onOpenRegisterModal,
  onSignOut,
  notifications,
  readNotifIds,
  onMarkAllRead,
  onMarkSingleRead
}) => {
  const [clockString, setClockString] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const timeStr = formatTime12h(now);
      const dayStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      setClockString(`${timeStr} • ${dayStr}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#notif-dropdown-container')) {
        setIsNotifOpen(false);
      }
      if (!target.closest('#profile-dropdown-container')) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

  return (
    <header className="glass-panel w-full max-w-7xl mx-auto rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 mb-6 z-20 relative">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3.5">
        <div
          className="nandan-logo-badge"
          onClick={onOpenLogoModal}
          title="Click to update Studio Logo"
        >
          {savedLogo ? (
            <img src={savedLogo} alt="NANDAN" className="w-full h-full object-cover rounded-[22%]" />
          ) : (
            <span className="text-white font-extrabold text-[10px] tracking-wider select-none">NANDAN</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">NANDAN</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">STUDIO</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Broadcast &amp; Creative Media</p>
        </div>
      </div>

      {/* Live Studio Clock Pill */}
      <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700">
        <i className="fa-regular fa-clock text-rose-500 text-sm"></i>
        <span>{clockString}</span>
      </div>



      {/* Header Actions (Role Switcher, Notifications, Profile) */}
      <div className="flex items-center gap-3">
        {/* Staff / Boss Switcher (Visible ONLY for Boss) */}
        {currentUser.isBoss && (
          <div className="flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200 shadow-inner">
            <button
              onClick={() => onSwitchViewMode('staff')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                currentViewMode === 'staff'
                  ? 'text-white bg-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fa-solid fa-user text-[11px] mr-1"></i> Staff
            </button>
            <button
              onClick={() => onSwitchViewMode('boss')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                currentViewMode === 'boss'
                  ? 'text-white bg-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fa-solid fa-shield-halved text-[11px] mr-1 text-rose-500"></i> Boss / Radar
            </button>
          </div>
        )}

        {/* Notification Bell with Dropdown */}
        <div id="notif-dropdown-container" className="relative">
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false);
            }}
            className="relative w-10 h-10 rounded-full bg-white/80 border border-slate-200/90 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all shadow-sm focus:outline-none"
            title="Notifications"
          >
            <i className="fa-regular fa-bell text-sm"></i>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shadow">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-slate-900">Notifications</span>
                  <span className="text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-[10px] font-semibold text-rose-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-400">
                    <i className="fa-regular fa-bell-slash text-2xl mb-1 text-slate-300"></i>
                    <p className="text-xs font-semibold">No notifications right now</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    const isRead = readNotifIds.includes(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => onMarkSingleRead(n.id)}
                        className={`p-2.5 rounded-xl border ${
                          isRead
                            ? 'bg-slate-50/60 border-slate-100 opacity-70'
                            : 'bg-white border-slate-200/90 shadow-sm'
                        } flex items-start gap-2.5 transition-all cursor-pointer hover:bg-slate-50`}
                      >
                        <div className={`w-7 h-7 rounded-lg ${n.iconBg} border flex items-center justify-center flex-shrink-0 text-xs shadow-xs mt-0.5`}>
                          <i className={`fa-solid ${n.icon}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[11px] font-bold text-slate-900 truncate">{n.title}</h5>
                            <span className="text-[9px] text-slate-400 font-medium ml-1 flex-shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-2 mt-0.5">{n.desc}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Active User Profile Pill */}
        <div id="profile-dropdown-container" className="relative">
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-sm hover:shadow transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 font-semibold leading-none">
                {currentUser.isBoss ? 'Boss' : 'Employee'}
              </div>
            </div>
            <i className="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {currentUser.role} ({currentUser.id})
                </p>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onOpenProfileModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <i className="fa-solid fa-user-pen text-rose-500 text-sm"></i> Edit My Profile
                </button>
                {currentUser.isBoss && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onOpenRegisterModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <i className="fa-solid fa-id-card-clip text-rose-500 text-sm"></i> Register Custom ID
                  </button>
                )}

                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <i className="fa-solid fa-right-from-bracket text-sm"></i> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
