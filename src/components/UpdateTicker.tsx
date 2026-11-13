import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parseAnnouncements, serializeAnnouncements } from '../utils/storage.ts';

interface UpdateTickerProps {
  announcement: string;
  isBoss: boolean;
  onSaveAnnouncement: (newText: string) => Promise<void> | void;
}

const PIXELS_PER_SECOND = 48; // Constant comfortable reading speed regardless of text length

export const UpdateTicker: React.FC<UpdateTickerProps> = ({
  announcement,
  isBoss,
  onSaveAnnouncement
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<string[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const [repeatCount, setRepeatCount] = useState(2);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const singleGroupRef = useRef<HTMLDivElement>(null);
  const lastInputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => parseAnnouncements(announcement), [announcement]);

  const openEditor = () => {
    setDraftItems([...items]);
    setIsModalOpen(true);
  };

  // Measure rendered width to guarantee seamless loop & constant smooth speed
  useLayoutEffect(() => {
    const recalcTicker = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      const sample = singleGroupRef.current;
      if (!viewport || !track || !sample) return;

      const viewportWidth = viewport.offsetWidth;
      const singleWidth = Math.max(1, sample.offsetWidth);
      const neededCopies = Math.min(12, Math.max(1, Math.ceil((viewportWidth + 40) / singleWidth)));

      setRepeatCount((prev) => (prev !== neededCopies ? neededCopies : prev));

      const halfWidth = singleWidth * neededCopies;
      const durationSec = Math.max(8, halfWidth / PIXELS_PER_SECOND);
      track.style.setProperty('--ticker-duration', `${durationSec.toFixed(2)}s`);
    };

    recalcTicker();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(recalcTicker).catch(() => {});
    }

    const observer = new ResizeObserver(recalcTicker);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [items, repeatCount]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  const handleAddRow = () => {
    setDraftItems((prev) => [...prev, '']);
    setTimeout(() => {
      lastInputRef.current?.focus();
    }, 50);
  };

  const handleChangeRow = (idx: number, value: string) => {
    setDraftItems((prev) => prev.map((item, i) => (i === idx ? value : item)));
  };

  const handleRemoveRow = (idx: number) => {
    setDraftItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [''];
    });
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftItems.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (cleaned.length === 0) return;

    await onSaveAnnouncement(serializeAnnouncements(cleaned));
    setIsModalOpen(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const copies = Array.from({ length: repeatCount });

  const renderAnnouncementGroup = (keyPrefix: string, attachRef: boolean) => (
    <div
      ref={attachRef ? singleGroupRef : undefined}
      className="inline-flex items-center whitespace-nowrap"
    >
      {items.map((text, idx) => (
        <span
          key={`${keyPrefix}-${idx}`}
          className="inline-flex items-center whitespace-nowrap text-[13px] sm:text-sm font-semibold text-slate-800 leading-none"
        >
          <span>{text}</span>
          <span
            aria-hidden="true"
            className="mx-6 inline-flex items-center justify-center text-rose-500 text-xs select-none"
          >
            ◆
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <>
      <div className="glass-panel w-full max-w-7xl mx-auto h-11 rounded-2xl px-2.5 sm:px-3.5 mb-5 flex items-center gap-2.5 sm:gap-3 overflow-hidden">
        {/* Left Fixed UPDATE Badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider leading-none whitespace-nowrap">
            UPDATE
          </span>
        </div>

        {/* Strictly Single-Line Constant-Speed Scrolling Ticker */}
        <div ref={viewportRef} className="nandan-ticker-viewport flex-1 min-w-0 h-full flex items-center">
          <div ref={trackRef} className="nandan-ticker-track">
            {copies.map((_, idx) => (
              <React.Fragment key={`a-${idx}`}>
                {renderAnnouncementGroup(`a-${idx}`, idx === 0)}
              </React.Fragment>
            ))}
            {copies.map((_, idx) => (
              <div key={`b-${idx}`} aria-hidden="true" className="inline-flex items-center whitespace-nowrap">
                {renderAnnouncementGroup(`b-${idx}`, false)}
              </div>
            ))}
          </div>
        </div>

        {/* Boss-only Update Button on the Same Line */}
        {isBoss && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {justSaved && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
                <i className="fa-solid fa-circle-check"></i> Updated
              </span>
            )}
            <button
              type="button"
              onClick={openEditor}
              className="h-7 px-2.5 sm:px-3 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              title="Manage Studio Announcements"
            >
              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
              <span>Update{items.length > 1 ? ` (${items.length})` : ''}</span>
            </button>
          </div>
        )}
      </div>

      {/* Boss Multi-Announcement Manager Modal */}
      {isModalOpen && isBoss && (
        <div
          className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl w-full max-w-xl p-6 shadow-2xl border border-white flex flex-col max-h-[85vh]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center text-base shadow-xs">
                  <i className="fa-solid fa-bullhorn"></i>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Manage UPDATE Ticker</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    প্রতিটি Announcement আলাদাভাবে যোগ করুন — টিকারে সবগুলো এক লাইনে আলাদা হয়ে দেখাবে
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handlePublish} className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                {draftItems.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-7 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-extrabold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      ref={idx === draftItems.length - 1 ? lastInputRef : undefined}
                      type="text"
                      value={val}
                      onChange={(e) => handleChangeRow(idx, e.target.value)}
                      placeholder={`Announcement #${idx + 1} লিখুন...`}
                      className="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-slate-50/90 border border-slate-200 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm font-medium text-slate-800 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="w-9 h-10 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                      title="Delete this announcement"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="w-full py-2.5 rounded-xl border border-dashed border-rose-300 bg-rose-50/50 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-plus"></i>
                <span>Add Another Announcement</span>
              </button>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={draftItems.every((t) => !t.trim())}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-paper-plane text-[11px]"></i>
                  <span>Publish Ticker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
