import React, { useState } from 'react';

interface PermanentLogoModalProps {
  onClose: () => void;
  onSaveLogo: (dataUrlOrUrl: string) => void;
  onResetLogo: () => void;
}

export const PermanentLogoModal: React.FC<PermanentLogoModalProps> = ({
  onClose,
  onSaveLogo,
  onResetLogo
}) => {
  const [urlInput, setUrlInput] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onSaveLogo(dataUrl);
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    onSaveLogo(urlInput.trim());
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
          <h3 className="text-base font-extrabold text-slate-900">Set Studio Logo</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
              Upload Logo from Device
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-[10px] uppercase font-bold text-slate-400">OR</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
              Direct Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
          <div className="pt-2 flex justify-between items-center border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onResetLogo();
                onClose();
              }}
              className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
