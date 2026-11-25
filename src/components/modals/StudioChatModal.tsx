import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChatMessage, User } from '../../types.ts';
import { getLastNDaysStudioDates, getTodayDateString } from '../../utils/storage.ts';
import { StudioChatPresenceUser } from '../../utils/supabase.ts';

interface StudioChatModalProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  onlineUsers: StudioChatPresenceUser[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

const AVATAR_PALETTE = [
  'bg-indigo-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-600 text-white',
  'bg-sky-600 text-white',
  'bg-violet-600 text-white',
  'bg-teal-600 text-white',
];

function getAvatarTone(senderId: string, isBoss: boolean): string {
  if (isBoss) return 'bg-slate-900 text-white ring-2 ring-rose-400/70';
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = (hash * 31 + senderId.charCodeAt(i)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getDateHeading(dateStr: string, fallbackLabel: string): string {
  const today = getTodayDateString();
  if (dateStr === today) return 'Today';
  const yesterdayStr = getLastNDaysStudioDates(2)[0]?.dateStr;
  if (yesterdayStr && dateStr === yesterdayStr) return 'Yesterday';
  return fallbackLabel || dateStr;
}

export const StudioChatModal: React.FC<StudioChatModalProps> = ({
  currentUser,
  users,
  messages,
  onlineUsers,
  onSendMessage,
  onClose
}) => {
  const [draft, setDraft] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to latest message on open and new messages
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Autofocus composer and close on Escape
  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned) return;
    onSendMessage(cleaned);
    setDraft('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleMentionMember = (member: User) => {
    const mentionText = `@${member.name} `;
    setDraft((prev) => {
      if (!prev.trim()) return mentionText;
      return prev.endsWith(' ') ? `${prev}${mentionText}` : `${prev} ${mentionText}`;
    });
    setIsMobileSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const onlineIds = useMemo(() => {
    const set = new Set(onlineUsers.map((u) => u.id));
    set.add(currentUser.id);
    return set;
  }, [onlineUsers, currentUser.id]);

  const { onlineMembers, offlineMembers } = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });

    const sortMembers = (a: User, b: User) => {
      if (a.isBoss !== b.isBoss) return a.isBoss ? -1 : 1;
      if (a.id === currentUser.id) return -1;
      if (b.id === currentUser.id) return 1;
      return a.name.localeCompare(b.name);
    };

    const online = filtered.filter((u) => onlineIds.has(u.id)).sort(sortMembers);
    const offline = filtered.filter((u) => !onlineIds.has(u.id)).sort(sortMembers);
    return { onlineMembers: online, offlineMembers: offline };
  }, [users, memberQuery, onlineIds, currentUser.id]);

  const onlineCount = Math.max(1, users.filter((u) => onlineIds.has(u.id)).length);

  const renderMemberRow = (member: User, isOnline: boolean) => {
    const isSelf = member.id === currentUser.id;
    const initial = (member.name || '?').charAt(0).toUpperCase();
    return (
      <button
        key={member.id}
        type="button"
        onClick={() => handleMentionMember(member)}
        title={`Click to mention ${member.name} (${member.role})`}
        className="w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 hover:bg-white hover:shadow-2xs border border-transparent hover:border-slate-200/80 transition-all group cursor-pointer"
      >
        <div className="relative flex-shrink-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold shadow-2xs ${
              isSelf && !member.isBoss
                ? 'bg-rose-600 text-white'
                : getAvatarTone(member.id, member.isBoss)
            }`}
          >
            {initial}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-50 ${
              isOnline ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          ></span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-bold text-slate-900 truncate group-hover:text-rose-600 transition-colors">
              {member.name}
            </span>
            {member.isBoss && (
              <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-900 text-white flex-shrink-0">
                Boss
              </span>
            )}
            {isSelf && (
              <span className="text-[10px] font-semibold text-rose-500 flex-shrink-0">You</span>
            )}
          </div>
          <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
            {member.role}
          </p>
        </div>

        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-slate-400 transition-opacity flex-shrink-0">
          @
        </span>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 modal-backdrop flex items-center justify-center p-2 sm:p-5 z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200/90 max-w-5xl w-full h-[88vh] max-h-[780px] rounded-3xl flex shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar: Team Members Directory */}
        <aside
          className={`${
            isMobileSidebarOpen
              ? 'flex absolute inset-y-0 left-0 z-30 shadow-2xl'
              : 'hidden md:flex'
          } w-[268px] lg:w-[288px] flex-shrink-0 flex-col bg-slate-50/95 border-r border-slate-200/80`}
        >
          {/* Sidebar Top Brand */}
          <div className="px-4 py-4 border-b border-slate-200/80 flex items-center justify-between gap-2.5 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white flex items-center justify-center text-sm shadow-sm shadow-rose-500/25 flex-shrink-0">
                <i className="fa-solid fa-comments"></i>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                  Studio Chat
                </h3>
                <p className="text-[11px] font-medium text-slate-500 truncate">
                  {onlineCount} online · {users.length} members
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer"
              title="Close team sidebar"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>

          {/* Member Search */}
          <div className="px-3.5 pt-3 pb-2 flex-shrink-0">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass text-[11px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              <input
                type="text"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Find team member..."
                className="w-full bg-white border border-slate-200/90 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/25 focus:border-rose-300 transition-all"
              />
            </div>
          </div>

          {/* Scrollable Employee List */}
          <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4">
            {onlineMembers.length > 0 && (
              <div>
                <div className="px-2.5 mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Online Now</span>
                  <span className="font-mono tabular-nums text-emerald-600">{onlineMembers.length}</span>
                </div>
                <div className="space-y-0.5">
                  {onlineMembers.map((m) => renderMemberRow(m, true))}
                </div>
              </div>
            )}

            {offlineMembers.length > 0 && (
              <div>
                <div className="px-2.5 mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Studio Team</span>
                  <span className="font-mono tabular-nums text-slate-400">{offlineMembers.length}</span>
                </div>
                <div className="space-y-0.5">
                  {offlineMembers.map((m) => renderMemberRow(m, false))}
                </div>
              </div>
            )}

            {onlineMembers.length === 0 && offlineMembers.length === 0 && (
              <div className="px-3 py-8 text-center text-xs font-medium text-slate-400">
                No member matched &ldquo;{memberQuery}&rdquo;
              </div>
            )}
          </div>

          {/* Sidebar Footer: Active User Identity */}
          <div className="px-4 py-3 border-t border-slate-200/80 bg-white/70 flex items-center gap-2.5 flex-shrink-0">
            <div className="relative flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  currentUser.isBoss
                    ? 'bg-slate-900 text-white ring-2 ring-rose-400/70'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {(currentUser.name || '?').charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
              <div className="text-[10.5px] font-medium text-slate-500 truncate">
                {currentUser.isBoss ? 'Creative Director · Boss' : currentUser.role}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop when sidebar open */}
        {isMobileSidebarOpen && (
          <div
            className="md:hidden absolute inset-0 bg-slate-900/25 z-20"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Right Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Room Header */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                title="Show Studio Team"
              >
                <i className="fa-solid fa-users text-rose-500"></i>
                <span className="font-mono tabular-nums">{users.length}</span>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                    NANDAN Open Group Room
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Live
                  </span>
                </div>
                <p className="text-[11.5px] font-medium text-slate-500 truncate">
                  Director Nil Utpal &amp; all studio members · Click any teammate on the left to @mention
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center border border-slate-200/80 transition-colors flex-shrink-0 cursor-pointer"
              title="Close Studio Chat"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-5 bg-[#FAFAFC]">
            {messages.length === 0 ? (
              <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-500 flex items-center justify-center text-2xl mb-3">
                  <i className="fa-regular fa-comments"></i>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Welcome to NANDAN Studio Chat
                </h4>
                <p className="text-xs font-medium text-slate-500 max-w-sm mt-1 leading-relaxed">
                  This open group room connects Creative Director Nil Utpal and all studio creatives in real time. Start the conversation below.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {messages.map((msg, index) => {
                  const isMe = msg.senderId === currentUser.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showDateDivider = !prevMsg || prevMsg.date !== msg.date;
                  const isGrouped =
                    !showDateDivider &&
                    Boolean(prevMsg) &&
                    prevMsg!.senderId === msg.senderId &&
                    Math.abs((msg.createdAt || 0) - (prevMsg!.createdAt || 0)) < 4 * 60 * 1000;

                  const matchedUser = users.find((u) => u.id === msg.senderId);
                  const displayName = matchedUser ? matchedUser.name : msg.senderName;
                  const displayRole = matchedUser ? matchedUser.role : msg.senderRole;
                  const senderIsBoss = matchedUser ? matchedUser.isBoss : msg.isBoss;
                  const initial = (displayName || '?').charAt(0).toUpperCase();

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="h-px flex-1 bg-slate-200/80"></div>
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 select-none">
                            {getDateHeading(msg.date, msg.dateLabel)}
                          </span>
                          <div className="h-px flex-1 bg-slate-200/80"></div>
                        </div>
                      )}

                      {isMe ? (
                        /* Own Message — Right Side */
                        <div className={`flex items-end justify-end gap-2.5 ${isGrouped ? '-mt-2' : ''}`}>
                          <div className="flex flex-col items-end max-w-[80%] sm:max-w-[72%]">
                            {!isGrouped && (
                              <div className="flex items-center gap-1.5 flex-wrap justify-end mb-1 px-1 text-[11px]">
                                <span className="font-mono tabular-nums text-[10px] font-medium text-slate-400">
                                  {msg.time}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className="text-[10.5px] font-semibold text-rose-600">
                                  {senderIsBoss ? 'Boss' : displayRole}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className="font-bold text-slate-900">
                                  You
                                </span>
                              </div>
                            )}
                            <div className="px-4 py-2.5 rounded-2xl rounded-tr-md bg-gradient-to-br from-rose-500 to-rose-600 text-white text-[13px] font-medium leading-relaxed shadow-sm shadow-rose-500/20 whitespace-pre-wrap break-words">
                              {msg.text}
                            </div>
                          </div>

                          {isGrouped ? (
                            <div className="w-8 flex-shrink-0" />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-2xs ${
                                senderIsBoss ? 'bg-slate-900 text-white ring-2 ring-rose-300' : 'bg-rose-600 text-white'
                              }`}
                              title={`${displayName} · ${displayRole}`}
                            >
                              {initial}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Team Member Message — Left Side */
                        <div className={`flex items-end justify-start gap-2.5 ${isGrouped ? '-mt-2' : ''}`}>
                          {isGrouped ? (
                            <div className="w-8 flex-shrink-0" />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-2xs ${getAvatarTone(
                                msg.senderId,
                                senderIsBoss
                              )}`}
                              title={`${displayName} · ${displayRole}`}
                            >
                              {initial}
                            </div>
                          )}

                          <div className="flex flex-col items-start max-w-[80%] sm:max-w-[72%]">
                            {!isGrouped && (
                              <div className="flex items-center gap-1.5 flex-wrap mb-1 px-1 text-[11px]">
                                <span className="font-bold text-slate-900">
                                  {displayName}
                                </span>
                                {senderIsBoss ? (
                                  <span className="text-[9.5px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                    Boss
                                  </span>
                                ) : (
                                  <>
                                    <span aria-hidden="true" className="text-slate-300">·</span>
                                    <span className="text-[10.5px] font-semibold text-slate-500">
                                      {displayRole}
                                    </span>
                                  </>
                                )}
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className="font-mono tabular-nums text-[10px] font-medium text-slate-400">
                                  {msg.time}
                                </span>
                              </div>
                            )}
                            <div className="px-4 py-2.5 rounded-2xl rounded-tl-md bg-white border border-slate-200/85 text-slate-800 text-[13px] font-medium leading-relaxed shadow-[0_1px_2px_rgba(15,23,42,0.04)] whitespace-pre-wrap break-words">
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
            <div ref={feedEndRef} />
          </div>

          {/* Message Composer Footer */}
          <form
            onSubmit={handleSubmit}
            className="px-4 sm:px-6 py-3.5 bg-white border-t border-slate-200/80 flex-shrink-0"
          >
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200/90 focus-within:border-rose-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-rose-500/10 rounded-2xl p-1.5 pl-4 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message to Studio Chat..."
                className="flex-1 bg-transparent border-0 py-2 text-xs sm:text-[13.5px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-28"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold text-xs tracking-wide shadow-sm shadow-rose-500/20 transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer whitespace-nowrap"
              >
                <i className="fa-solid fa-paper-plane text-[11px]"></i>
                <span>Send</span>
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10.5px] text-slate-400 font-medium">
              <span>Enter to send · Shift + Enter for new line</span>
              <span className="hidden sm:inline">Open room for all studio members</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
