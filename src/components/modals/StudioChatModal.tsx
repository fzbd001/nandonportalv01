import React, { useEffect, useRef, useState } from 'react';
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
  if (isBoss) return 'bg-slate-900 text-white ring-2 ring-rose-300';
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

  const onlineIds = new Set(onlineUsers.map((u) => u.id));
  const onlineCount = Math.max(1, onlineIds.size);

  return (
    <div
      className="fixed inset-0 modal-backdrop flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl border border-white/80 max-w-3xl w-full h-[86vh] max-h-[760px] rounded-3xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Live Room Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 bg-white/80 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white flex items-center justify-center text-lg shadow-md shadow-rose-500/25 flex-shrink-0">
              <i className="fa-solid fa-comments"></i>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Studio Chat
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Room • {onlineCount} Online
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                Open Group Room • Director &amp; All {users.length} Studio Members
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 flex items-center justify-center shadow-sm border border-slate-200/80 transition-all flex-shrink-0 cursor-pointer"
            title="Close Studio Chat"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Team Member Strip */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/70 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex-shrink-0 mr-1">
            Team:
          </span>
          {users.map((member) => {
            const isOnline = member.id === currentUser.id || onlineIds.has(member.id);
            return (
              <div
                key={member.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-[11px] font-semibold text-slate-700 flex-shrink-0 shadow-2xs"
                title={`${member.name} — ${member.role}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                ></span>
                <span className="font-bold text-slate-800">{member.name}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    member.isBoss
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {member.isBoss ? 'Boss' : member.role}
                </span>
              </div>
            );
          })}
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 bg-gradient-to-b from-slate-50/70 to-white/60">
          {messages.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center text-2xl mb-3 shadow-xs">
                <i className="fa-regular fa-comments"></i>
              </div>
              <h4 className="text-sm font-extrabold text-slate-800">
                Welcome to NANDAN Studio Chat
              </h4>
              <p className="text-xs font-medium text-slate-500 max-w-sm mt-1">
                This open group room connects Creative Director Nil Utpal and all studio creatives in real time. Send the first message below.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderId === currentUser.id;
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showDateDivider = !prevMsg || prevMsg.date !== msg.date;
              const matchedUser = users.find((u) => u.id === msg.senderId);
              const displayName = matchedUser ? matchedUser.name : msg.senderName;
              const displayRole = matchedUser ? matchedUser.role : msg.senderRole;
              const senderIsBoss = matchedUser ? matchedUser.isBoss : msg.isBoss;
              const initial = (displayName || '?').charAt(0).toUpperCase();

              return (
                <React.Fragment key={msg.id}>
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-2">
                      <span className="px-3 py-1 rounded-full bg-white border border-slate-200/90 text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-2xs">
                        {getDateHeading(msg.date, msg.dateLabel)}
                      </span>
                    </div>
                  )}

                  {isMe ? (
                    /* Own Message — Right Side */
                    <div className="flex items-end justify-end gap-2.5">
                      <div className="flex flex-col items-end max-w-[78%] sm:max-w-[70%]">
                        <div className="flex items-center gap-1.5 flex-wrap justify-end mb-1 px-1">
                          <span className="text-[10px] font-mono font-semibold text-slate-400">
                            {msg.time}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                              senderIsBoss
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {senderIsBoss ? 'Boss' : displayRole}
                          </span>
                          <span className="text-[11px] font-extrabold text-slate-800">
                            You ({displayName})
                          </span>
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-rose-500 to-rose-600 text-white text-xs sm:text-[13px] font-medium leading-relaxed shadow-md shadow-rose-500/20 whitespace-pre-wrap break-words">
                          {msg.text}
                        </div>
                      </div>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-sm ${
                          senderIsBoss ? 'bg-slate-900 text-white ring-2 ring-rose-300' : 'bg-rose-600 text-white'
                        }`}
                        title={`${displayName} • ${displayRole}`}
                      >
                        {initial}
                      </div>
                    </div>
                  ) : (
                    /* Team Member Message — Left Side */
                    <div className="flex items-end justify-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-sm ${getAvatarTone(
                          msg.senderId,
                          senderIsBoss
                        )}`}
                        title={`${displayName} • ${displayRole}`}
                      >
                        {initial}
                      </div>
                      <div className="flex flex-col items-start max-w-[78%] sm:max-w-[70%]">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1 px-1">
                          <span className="text-[11px] font-extrabold text-slate-900">
                            {displayName}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                              senderIsBoss
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {senderIsBoss ? `Boss • ${displayRole}` : displayRole}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-slate-400">
                            {msg.time}
                          </span>
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200/90 text-slate-800 text-xs sm:text-[13px] font-medium leading-relaxed shadow-xs whitespace-pre-wrap break-words">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
          <div ref={feedEndRef} />
        </div>

        {/* Message Composer Footer */}
        <form
          onSubmit={handleSubmit}
          className="px-4 sm:px-6 py-3.5 bg-white border-t border-slate-200/80 flex-shrink-0"
        >
          <div className="flex items-end gap-2.5">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message to Studio Chat... (Press Enter to send)"
              className="flex-1 bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/35 focus:bg-white resize-none max-h-28"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-rose-500/25 transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <i className="fa-solid fa-paper-plane text-xs"></i>
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[10px] font-semibold text-slate-400">
              Sending as <strong className="text-slate-600">{currentUser.name}</strong> •{' '}
              {currentUser.isBoss ? 'Boss' : currentUser.role}
            </span>
            <span className="text-[10px] font-medium text-slate-400 hidden sm:inline">
              Shift + Enter for new line
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
