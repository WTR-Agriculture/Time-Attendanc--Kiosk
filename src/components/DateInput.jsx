import { useRef } from 'react';

const IconCalendar = () => (
  <svg className="w-4 h-4 text-slate-400 flex-shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function DateInput({ value, onChange, className }) {
  const ref = useRef(null);
  const display = value ? value.split('-').reverse().join('/') : '';

  return (
    <div
      className={`${className} relative flex items-center gap-2 cursor-pointer select-none`}
      onClick={() => ref.current?.showPicker?.()}
    >
      <span className="flex-1 pointer-events-none">{display || 'วว/ดด/ปปปป'}</span>
      <IconCalendar />
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={onChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        tabIndex={-1}
      />
    </div>
  );
}
