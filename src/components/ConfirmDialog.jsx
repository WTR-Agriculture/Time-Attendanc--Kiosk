import { createPortal } from 'react-dom';

const IconTrash = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function ConfirmDialog({ title, message, confirmLabel = 'ตกลง', danger = false, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}>
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mx-auto
          ${danger ? 'bg-red-100 text-red-500' : 'bg-[#7B8CFA]/10 text-[#7B8CFA]'}`}>
          {danger ? <IconTrash /> : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        {title && <h3 className="text-lg font-bold text-[#222222] text-center">{title}</h3>}
        {message && <p className="text-slate-500 text-sm text-center leading-relaxed whitespace-pre-line">{message}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel}
            className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl cursor-pointer hover:bg-slate-200 transition-colors">
            ยกเลิก
          </button>
          <button onClick={onConfirm}
            className={`flex-1 font-bold py-3 rounded-2xl cursor-pointer text-white transition-colors active:scale-95
              ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#7B8CFA] hover:bg-[#6a7be8]'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
