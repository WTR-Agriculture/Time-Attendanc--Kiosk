import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './lib/api';
import EmployeesPage from './components/EmployeesPage';
import PieceRatePage from './components/PieceRatePage';
import AdvancesPage from './components/AdvancesPage';
import PayrollPeriodDetail from './components/PayrollPeriodDetail';

// ============================================================
//  SVG Icons
// ============================================================
const IconDashboard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const IconClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconOT = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const IconPiece = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const IconPayroll = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const IconEmployees = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconSettings = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconAdvance = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconLogout = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const IconLock = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const IconBackspace = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
  </svg>
);
const IconRefresh = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// ============================================================
//  Constants
// ============================================================
const ADMIN_PIN = '1234';
const LOG_PAGE_SIZE = 20;

const NAV_ITEMS = [
  { id: 'DASHBOARD',  label: 'ภาพรวม',        Icon: IconDashboard },
  { id: 'ATTENDANCE', label: 'บันทึกเวลา',     Icon: IconClock },
  { id: 'OT',         label: 'OT',             Icon: IconOT },
  { id: 'PIECE_RATE', label: 'งานเหมา',        Icon: IconPiece },
  { id: 'ADVANCES',   label: 'เบิกค่าแรง',     Icon: IconAdvance },
  { id: 'PAYROLL',    label: 'งวดค่าแรง',      Icon: IconPayroll },
  { id: 'EMPLOYEES',  label: 'พนักงาน',        Icon: IconEmployees },
  { id: 'SETTINGS',   label: 'ตั้งค่า',        Icon: IconSettings },
];

// ============================================================
//  Helpers
// ============================================================
const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatDate = (d) => d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatMoney = (n) => Number(n || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });

// ============================================================
//  Main App
// ============================================================
// ============================================================
//  TimePicker — 24-hour dropdown (HH:MM)
// ============================================================
// ============================================================
//  DrumScroll — one scrollable column for TimePicker
// ============================================================
function DrumScroll({ options, value, onChange }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const ITEM_H = 44;

  useEffect(() => {
    const idx = options.indexOf(value);
    if (ref.current && idx >= 0) {
      ref.current.scrollTop = idx * ITEM_H;
    }
  }, [value, options]);

  const onScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, options.length - 1));
      ref.current.scrollTop = clamped * ITEM_H;
      onChange(options[clamped]);
    }, 120);
  };

  return (
    <div className="relative flex-1" style={{ height: ITEM_H * 3 }}>
      {/* highlight bar */}
      <div className="absolute inset-x-1 pointer-events-none rounded-xl"
        style={{ top: ITEM_H, height: ITEM_H, background: 'rgba(123,140,250,0.12)', border: '1.5px solid rgba(123,140,250,0.25)' }} />
      <div ref={ref} onScroll={onScroll}
        className="h-full overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div style={{ height: ITEM_H }} />
        {options.map(opt => (
          <div key={opt} onClick={() => { const i = options.indexOf(opt); ref.current.scrollTop = i * ITEM_H; onChange(opt); }}
            style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            className={`flex items-center justify-center font-mono text-xl font-bold select-none cursor-pointer transition-colors
              ${opt === value ? 'text-[#7B8CFA]' : 'text-slate-300'}`}>
            {opt}
          </div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  );
}

// ============================================================
//  TimePicker — drum scroll 24-hour HH:MM
// ============================================================
function TimePicker({ value, onChange }) {
  const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const [h, m] = value ? value.split(':') : ['08', '00'];

  return (
    <div className="flex items-center gap-2 bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3 py-1 overflow-hidden">
      <DrumScroll options={HOURS}   value={h || '08'} onChange={hh => onChange(`${hh}:${m || '00'}`)} />
      <span className="text-2xl font-bold text-slate-300 select-none pb-1">:</span>
      <DrumScroll options={MINUTES} value={m || '00'} onChange={mm => onChange(`${h || '08'}:${mm}`)} />
    </div>
  );
}

export default function App() {
  // --- Auth ---
  const [isAdmin,   setIsAdmin]   = useState(false);
  const [pinInput,  setPinInput]  = useState('');
  const [pinError,  setPinError]  = useState(false);

  // --- Nav ---
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // --- Clock ---
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Employees ---
  const [employees,  setEmployees]  = useState([]);
  const [empLoading, setEmpLoading] = useState(true);

  // --- Attendance Log tab ---
  const [adminLogs,    setAdminLogs]    = useState([]);
  const [logPage,      setLogPage]      = useState(1);
  const [logTotal,     setLogTotal]     = useState(0);
  const [logWeek,      setLogWeek]      = useState(() => api.getCurrentWeekStr());
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError,   setAdminError]   = useState(null);

  // --- Attendance Day (card layout) ---
  const [attDate,      setAttDate]      = useState(() => new Date().toLocaleDateString('en-CA'));
  const [attDayData,   setAttDayData]   = useState([]);
  const [attDayLoading,setAttDayLoading]= useState(false);
  const [attCardState, setAttCardState] = useState({});
  const [attSavingId,  setAttSavingId]  = useState(null);
  const [attSavedId,   setAttSavedId]   = useState(null);

  // --- OT tab ---
  const [otEmpId,  setOtEmpId]  = useState('');
  const [otDate,   setOtDate]   = useState('');
  const [otHours,  setOtHours]  = useState('');
  const [otNote,   setOtNote]   = useState('');
  const [otRate,   setOtRate]   = useState(1.0);
  const [otSaving, setOtSaving] = useState(false);
  const [otSuccess,setOtSuccess]= useState(null);
  const [otError,  setOtError]  = useState(null);

  // --- Payroll tab ---
  const [payPeriodStart,   setPayPeriodStart]   = useState('');
  const [payPeriodEnd,     setPayPeriodEnd]     = useState('');
  const [payPeriods,       setPayPeriods]       = useState([]);
  const [payPeriodPreview, setPayPeriodPreview] = useState(null);
  const [payPeriodLoading, setPayPeriodLoading] = useState(false);
  const [payPeriodError,   setPayPeriodError]   = useState(null);
  const [payingId,         setPayingId]         = useState(null);
  const [selectedPeriod,   setSelectedPeriod]   = useState(null);
  const [mobileNavOpen,    setMobileNavOpen]    = useState(false);
  const [periodDetail,     setPeriodDetail]     = useState(null); // unused, kept for compat
  const [periodDetailLoading, setPeriodDetailLoading] = useState(false); // unused

  // --- Dashboard ---
  const [dashLoading, setDashLoading] = useState(false);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [latestPeriod,setLatestPeriod]= useState(null);

  // ============================================================
  //  Clock
  // ============================================================
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ============================================================
  //  Load employees on mount
  // ============================================================
  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    setEmpLoading(true);
    try {
      const data = await api.getEmployees();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setEmpLoading(false);
    }
  }

  // ============================================================
  //  Load data on tab change
  // ============================================================
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'ATTENDANCE') loadAttendanceDay(attDate);
    if (activeTab === 'PAYROLL')    loadPayrollPeriods();
    if (activeTab === 'DASHBOARD')  loadDashboard();
  }, [activeTab, isAdmin]);

  async function loadDashboard() {
    setDashLoading(true);
    try {
      const r = await api.getPayrollPeriods();
      const periods = r.periods || [];
      setUnpaidCount(periods.filter(p => p.status !== 'Paid').length);
      setLatestPeriod(periods[0] || null);
    } catch (err) {
      console.error(err);
    } finally {
      setDashLoading(false);
    }
  }

  async function loadAttendanceLogs(page, week) {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const w = week || logWeek;
      const data = await api.getLogs({ week: w, page, page_size: LOG_PAGE_SIZE });
      setAdminLogs(data.logs || []);
      setLogTotal(data.total || 0);
      setLogPage(page);
    } catch (err) {
      setAdminError('โหลดข้อมูลไม่สำเร็จ');
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  }

  async function loadPayrollPeriods() {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const r = await api.getPayrollPeriods();
      setPayPeriods(r.periods || []);
    } catch (err) {
      setAdminError('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setAdminLoading(false);
    }
  }

  // ============================================================
  //  PIN login
  // ============================================================
  const handlePinPress = (num) => {
    setPinError(false);
    if (pinInput.length >= 4) return;
    const next = pinInput + num;
    setPinInput(next);
    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        setTimeout(() => {
          setIsAdmin(true);
          setPinInput('');
          setActiveTab('DASHBOARD');
        }, 200);
      } else {
        setPinError(true);
        setTimeout(() => setPinInput(''), 500);
      }
    }
  };

  const handleLogout = useCallback(() => {
    setIsAdmin(false);
    setPinInput('');
    setPinError(false);
    setActiveTab('DASHBOARD');
    setAdminLogs([]);
    setPayPeriods([]);
    setPayPeriodPreview(null);
    setSelectedPeriod(null);
    setPeriodDetail(null);
  }, []);

  // ============================================================
  //  Manual attendance
  // ============================================================
  async function handleSubmitAttendance() {
    if (!attEmpId || !attDate || !attIn) return;
    setAttSaving(true);
    setAttSuccess(null);
    setAttError(null);
    const emp = employees.find(e => e.employeeId === attEmpId);
    const actions = [
      { action: 'เข้างาน', time: attIn },
      attOut && { action: 'ออกงาน', time: attOut },
    ].filter(Boolean);
    try {
      for (const { action, time } of actions) {
        await api.logAttendance({
          employeeId:      attEmpId,
          employeeName:    emp?.name || attEmpId,
          actionType:      action,
          confidenceScore: 0,
          deviceId:        'manual',
          manualDate:      attDate,
          manualTime:      time,
          note:            attNote.trim(),
        });
      }
      const hrs = calcNetHours(attIn, attOut);
      setAttSuccess(`บันทึก ${emp?.name || attEmpId} วันที่ ${attDate} สำเร็จ${hrs ? ` — ทำงาน ${hrs} ชม.` : ''}`);
      setAttIn(''); setAttOut(''); setAttNote('');
    } catch (err) {
      setAttError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      console.error(err);
    } finally {
      setAttSaving(false);
    }
  }

  function calcNetHours(timeIn, timeOut) {
    if (!timeIn || !timeOut) return null;
    const [ih, im] = timeIn.split(':').map(Number);
    const [oh, om] = timeOut.split(':').map(Number);
    const mins = (oh * 60 + om) - (ih * 60 + im) - 60; // หัก 1 ชม.พักเที่ยง
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${h}`;
  }

  // ============================================================
  //  OT
  // ============================================================
  async function handleSubmitOT() {
    if (!otEmpId || !otDate || !otHours) return;
    setOtSaving(true);
    setOtSuccess(null);
    setOtError(null);
    try {
      const emp = employees.find(e => e.employeeId === otEmpId);
      await api.logOT({
        employeeId:   otEmpId,
        employeeName: emp?.name || otEmpId,
        date:         otDate,
        hours:        parseFloat(otHours),
        note:         otNote.trim(),
        otRate:       otRate,
      });
      setOtSuccess(`บันทึก OT ${otHours} ชม. (x${otRate}) ให้ ${emp?.name || otEmpId} วันที่ ${otDate} สำเร็จ`);
      setOtHours(''); setOtNote(''); setOtRate(1.0);
    } catch (err) {
      setOtError('บันทึก OT ไม่สำเร็จ กรุณาลองใหม่');
      console.error(err);
    } finally {
      setOtSaving(false);
    }
  }

  // ============================================================
  //  Payroll
  // ============================================================
  async function handleCreatePeriod() {
    if (!payPeriodStart || !payPeriodEnd) return;
    setPayPeriodLoading(true); setPayPeriodError(null); setPayPeriodPreview(null);
    try {
      const r = await api.createPayrollPeriod({ startDate: payPeriodStart, endDate: payPeriodEnd });
      setPayPeriodPreview(r);
      await loadPayrollPeriods();
    } catch {
      setPayPeriodError('สร้างงวดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setPayPeriodLoading(false);
    }
  }

  async function handlePayPeriod(periodId) {
    setPayingId(periodId);
    try {
      await api.payPayrollPeriod(periodId);
      await loadPayrollPeriods();
    } catch {} finally { setPayingId(null); }
  }

  function handleViewPeriod(period) {
    setSelectedPeriod(period);
  }

  // ============================================================
  //  CSV Export
  // ============================================================
  function exportLogsCSV() {
    const headers = ['วันที่', 'รหัส', 'ชื่อ-สกุล', 'เข้างาน', 'พักเที่ยง', 'กลับพัก', 'ออกงาน', 'ชม.สุทธิ', 'สถานะ'];
    const rows = adminLogs.map(l => [
      l.date, l.employeeId, l.name,
      l.in || '-', l.breakOut || '-', l.breakIn || '-', l.out || '-',
      l.workedHours || '-', l.status === 'complete' ? 'ครบ' : 'ไม่ครบ',
    ]);
    downloadCSV([headers, ...rows], `attendance_${logWeek}.csv`);
  }

  function exportPayrollCSV() {
    if (!payPeriodPreview) return;
    const headers = ['ชื่อ', 'วันทำงาน', 'ค่าแรง', 'หักมาสาย', 'OT ชม.', 'OT บาท', 'สุทธิ'];
    const rows = (payPeriodPreview.items || []).map(p => [
      p.name, p.workDays, p.baseAmount, p.lateDeduction || 0,
      p.otHours || 0, p.otAmount || 0, p.netTotal,
    ]);
    downloadCSV([headers, ...rows], `payroll_${payPeriodStart}_${payPeriodEnd}.csv`);
  }

  function downloadCSV(rows, filename) {
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  //  Render: Login
  // ============================================================
  const renderLogin = () => (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
      <div className="bg-white rounded-[2.5rem] shadow-xl p-10 w-[380px] flex flex-col items-center">
        <div className="bg-[#7B8CFA]/10 p-4 rounded-full mb-5">
          <IconLock />
        </div>
        <h1 className="text-2xl font-bold text-[#222222] mb-1">ระบบจัดการค่าแรง</h1>
        <p className="text-slate-400 mb-7 text-sm">กรุณาใส่ PIN เพื่อเข้าสู่ระบบ</p>

        <div className={`flex gap-4 mb-6 ${pinError ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-5 h-5 rounded-full transition-all duration-200 ${i < pinInput.length ? 'bg-[#7B8CFA] scale-110' : 'bg-slate-200'}`} />
          ))}
        </div>

        {pinError && (
          <p className="text-red-500 font-bold text-sm mb-3 -mt-2">รหัส PIN ไม่ถูกต้อง</p>
        )}

        <div className="grid grid-cols-3 gap-3 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n}
              onClick={() => handlePinPress(n.toString())}
              className="bg-[#F8FAFC] hover:bg-[#F0F2F5] active:bg-[#E2E8F0] text-2xl font-bold text-[#222222] py-5 rounded-2xl transition-colors select-none cursor-pointer">
              {n}
            </button>
          ))}
          <div />
          <button onClick={() => handlePinPress('0')}
            className="bg-[#F8FAFC] hover:bg-[#F0F2F5] active:bg-[#E2E8F0] text-2xl font-bold text-[#222222] py-5 rounded-2xl transition-colors select-none cursor-pointer">
            0
          </button>
          <button onClick={() => setPinInput(p => p.slice(0, -1))}
            className="flex items-center justify-center rounded-2xl hover:bg-slate-50 select-none cursor-pointer text-slate-400 py-5">
            <IconBackspace />
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================
  //  Render: Dashboard
  // ============================================================
  const renderDashboard = () => (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="bg-[#222222] text-white rounded-3xl px-7 py-6 flex items-center justify-between">
        <div>
          <p className="text-white/50 text-sm font-medium mb-1">ยินดีต้อนรับ</p>
          <h2 className="text-2xl font-bold tracking-tight">ระบบจัดการค่าแรง</h2>
          <p className="text-white/60 text-sm mt-1">{formatDate(currentTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold font-mono tracking-tight">{formatTime(currentTime)}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* พนักงาน */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3">
          <div className="bg-[#7B8CFA]/10 w-10 h-10 rounded-2xl flex items-center justify-center">
            <IconEmployees />
          </div>
          <div>
            <p className="text-slate-400 text-sm">พนักงานทั้งหมด</p>
            <p className="text-3xl font-bold text-[#222222] mt-0.5">{employees.length}<span className="text-base font-normal text-slate-400 ml-1">คน</span></p>
          </div>
        </div>

        {/* งวดค้าง */}
        <div className={`rounded-3xl border shadow-sm p-6 flex flex-col gap-3 ${unpaidCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${unpaidCount > 0 ? 'bg-amber-200/60' : 'bg-slate-100'}`}>
            <IconPayroll />
          </div>
          <div>
            <p className={`text-sm ${unpaidCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>งวดที่ยังไม่ได้จ่าย</p>
            <p className={`text-3xl font-bold mt-0.5 ${unpaidCount > 0 ? 'text-amber-700' : 'text-[#222222]'}`}>{unpaidCount}<span className="text-base font-normal ml-1">งวด</span></p>
          </div>
        </div>

        {/* สัปดาห์ */}
        <div className="bg-[#7B8CFA] rounded-3xl shadow-sm p-6 flex flex-col gap-3">
          <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center">
            <IconClock />
          </div>
          <div>
            <p className="text-white/70 text-sm">สัปดาห์ปัจจุบัน</p>
            <p className="text-2xl font-bold text-white mt-0.5">{api.getCurrentWeekStr()}</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        {[
          {
            tab: 'ATTENDANCE',
            label: 'บันทึกเวลา',
            sub: 'กรอกเวลาเข้า-ออกพนักงาน',
            bg: 'bg-[#7B8CFA]',
            icon: <IconClock />,
          },
          {
            tab: 'OT',
            label: 'บันทึก OT',
            sub: 'เพิ่มชั่วโมงล่วงเวลา',
            bg: 'bg-[#F59E0B]',
            icon: <IconOT />,
          },
          {
            tab: 'PAYROLL',
            label: 'งวดค่าแรง',
            sub: 'สร้างงวดและคำนวณค่าแรง',
            bg: 'bg-[#10B981]',
            icon: <IconPayroll />,
          },
          {
            tab: 'EMPLOYEES',
            label: 'พนักงาน',
            sub: 'จัดการข้อมูลพนักงาน',
            bg: 'bg-[#6366F1]',
            icon: <IconEmployees />,
          },
        ].map(({ tab, label, sub, bg, icon }) => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${bg} text-white rounded-3xl p-6 text-left relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer shadow-sm`}>
            <div className="absolute -bottom-4 -right-4 opacity-20 w-24 h-24">{icon}</div>
            <p className="text-xl font-bold mb-1">{label}</p>
            <p className="text-white/70 text-sm">{sub}</p>
          </button>
        ))}
      </div>

      {/* Latest period */}
      {latestPeriod && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">งวดล่าสุด</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#222222] text-base">{latestPeriod.startDate} — {latestPeriod.endDate}</p>
              <p className="text-slate-400 text-sm mt-0.5">สร้างเมื่อ {latestPeriod.createdAt?.slice(0, 10)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-[#7B8CFA]">{formatMoney(latestPeriod.grandTotal)}</span>
              {latestPeriod.status === 'Paid'
                ? <span className="bg-emerald-100 text-emerald-600 text-xs font-bold px-3 py-1.5 rounded-full">จ่ายแล้ว</span>
                : <button onClick={() => setActiveTab('PAYROLL')} className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer hover:bg-amber-200 transition-colors">ยังไม่จ่าย →</button>
              }
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // ============================================================
  //  Attendance Day helpers
  // ============================================================
  const WORK_MINS = 480;

  const calcLateMins = (inTime) => {
    if (!inTime) return 0;
    const diff = inTime.split(':').reduce((h, m, i) => i === 0 ? h + Number(m) * 60 : h + Number(m), 0) - 8 * 60;
    return diff >= 20 ? diff : 0;
  };

  const calcNetHoursNum = (inTime, outTime) => {
    if (!inTime || !outTime) return null;
    const toMins = t => t.split(':').reduce((h, m, i) => i === 0 ? h + Number(m) * 60 : h + Number(m), 0);
    const mins = toMins(outTime) - toMins(inTime) - 60;
    return mins > 0 ? mins / 60 : null;
  };

  const loadAttendanceDay = useCallback(async (date) => {
    setAttDayLoading(true);
    try {
      const data = await api.getAttendanceDay(date);
      setAttDayData(data.employees);
      const state = {};
      data.employees.forEach(emp => {
        state[emp.employeeId] = {
          inTime:  emp.inTime  || '',
          outTime: emp.outTime || '',
          note:    '',
        };
      });
      setAttCardState(state);
    } catch {}
    setAttDayLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'ATTENDANCE') loadAttendanceDay(attDate);
  }, [activeTab, attDate]);

  const handleSaveAttCard = async (emp) => {
    const s = attCardState[emp.employeeId] || {};
    if (!s.inTime) return;
    setAttSavingId(emp.employeeId);
    try {
      await api.saveAttendanceDay({
        employeeId: emp.employeeId, employeeName: emp.name,
        date: attDate, inTime: s.inTime, outTime: s.outTime || null, note: s.note,
      });
      setAttSavedId(emp.employeeId);
      setTimeout(() => setAttSavedId(null), 2000);
    } catch {}
    setAttSavingId(null);
  };

  const setCard = (empId, field, val) =>
    setAttCardState(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: val } }));

  // ============================================================
  //  Render: Attendance Log
  // ============================================================
  const renderAttendance = () => (
    <div className="flex flex-col gap-5">
      {/* Date picker */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-[#222222]">บันทึกเวลา</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={attDate}
            onChange={e => setAttDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA]" />
          <button onClick={() => loadAttendanceDay(attDate)}
            className="bg-[#F2F2F2] p-2.5 rounded-2xl hover:bg-slate-200 cursor-pointer"><IconRefresh /></button>
        </div>
      </div>

      {attDayLoading ? (
        <div className="flex justify-center py-16 text-slate-400 gap-3">
          <div className="w-6 h-6 border-4 border-slate-100 border-t-[#7B8CFA] rounded-full animate-spin" />
          กำลังโหลด...
        </div>
      ) : attDayData.length === 0 ? (
        <div className="text-center py-16 text-slate-400">ยังไม่มีพนักงาน</div>
      ) : (
        <div className="flex flex-col gap-4">
          {attDayData.map(emp => {
            const s         = attCardState[emp.employeeId] || {};
            const lateMins  = calcLateMins(s.inTime);
            const lateDeduct= lateMins > 0 ? lateMins * (emp.rate / WORK_MINS) : 0;
            const netHoursN = calcNetHoursNum(s.inTime, s.outTime);
            const otAmt     = emp.otHours > 0 ? emp.otHours * (emp.rate / 8) * emp.otRate : 0;
            const todayWage = emp.rateType === 'daily'
              ? emp.rate - lateDeduct + otAmt
              : (netHoursN ? netHoursN * emp.rate + otAmt : null);
            const isSaving  = attSavingId === emp.employeeId;
            const isSaved   = attSavedId  === emp.employeeId;
            const hasData   = !!(emp.inTime || emp.outTime);

            return (
              <div key={emp.employeeId}
                className={`bg-white rounded-3xl border shadow-sm p-5 flex flex-col gap-4
                  ${hasData ? 'border-[#7B8CFA]/30' : 'border-slate-100'}`}>

                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#222222]">{emp.name}</p>
                  {hasData && (
                    <span className="text-xs bg-[#7B8CFA]/10 text-[#7B8CFA] font-semibold px-2.5 py-1 rounded-full">
                      มีข้อมูล
                    </span>
                  )}
                </div>

                {/* Time pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">เวลาเข้างาน</label>
                    <TimePicker value={s.inTime || '08:00'} onChange={v => setCard(emp.employeeId, 'inTime', v)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">เวลาออกงาน</label>
                    <TimePicker value={s.outTime || '17:00'} onChange={v => setCard(emp.employeeId, 'outTime', v)} />
                  </div>
                </div>

                {/* Auto-calculated stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-[#F8FAFC] rounded-2xl px-3 py-2 text-center">
                    <p className="text-xs text-slate-400 mb-0.5">ชม.สุทธิ</p>
                    <p className="font-bold text-[#7B8CFA] text-sm">
                      {netHoursN ? `${netHoursN.toFixed(1)} ชม.` : '—'}
                    </p>
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-center ${lateMins > 0 ? 'bg-red-50' : 'bg-[#F8FAFC]'}`}>
                    <p className="text-xs text-slate-400 mb-0.5">มาสาย</p>
                    <p className={`font-bold text-sm ${lateMins > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                      {lateMins > 0 ? `${lateMins} นาที` : '—'}
                    </p>
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-center ${lateMins > 0 ? 'bg-red-50' : 'bg-[#F8FAFC]'}`}>
                    <p className="text-xs text-slate-400 mb-0.5">หักสาย</p>
                    <p className={`font-bold text-sm ${lateMins > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                      {lateMins > 0 ? `฿${lateDeduct.toFixed(0)}` : '—'}
                    </p>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-2xl px-3 py-2 text-center">
                    <p className="text-xs text-slate-400 mb-0.5">
                      ค่าแรงวันนี้{emp.otHours > 0 ? ` +OT ${emp.otHours}ชม.` : ''}
                    </p>
                    <p className="font-bold text-emerald-600 text-sm">
                      {todayWage != null ? `฿${todayWage.toFixed(0)}` : '—'}
                    </p>
                  </div>
                </div>

                {/* Note + Save */}
                <div className="flex gap-3 items-center">
                  <input type="text" value={s.note || ''} onChange={e => setCard(emp.employeeId, 'note', e.target.value)}
                    placeholder="หมายเหตุ (ไม่บังคับ)"
                    className="flex-1 bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-[#7B8CFA]" />
                  <button onClick={() => handleSaveAttCard(emp)}
                    disabled={!s.inTime || isSaving}
                    className={`font-bold px-5 py-2.5 rounded-2xl cursor-pointer text-sm active:scale-95 transition-all flex-shrink-0
                      ${isSaved ? 'bg-emerald-500 text-white' : 'bg-[#7B8CFA] disabled:opacity-40 text-white'}`}>
                    {isSaving ? '...' : isSaved ? '✓ บันทึกแล้ว' : 'บันทึก'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================================================
  //  Render: OT
  // ============================================================
  const renderOT = () => (
    <div className="flex flex-col gap-6 max-w-lg animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[#222222]">บันทึก OT</h2>
        <p className="text-slate-400 text-sm mt-0.5">กรอก OT ย้อนหลังได้ — ข้อมูลเดิมจะถูกแทนที่</p>
      </div>

      <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-slate-600">พนักงาน</label>
          <select value={otEmpId} onChange={e => { setOtEmpId(e.target.value); setOtSuccess(null); setOtError(null); }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA] cursor-pointer">
            <option value="">-- เลือกพนักงาน --</option>
            {employees.map(emp => <option key={emp.employeeId} value={emp.employeeId}>{emp.name} ({emp.employeeId})</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-slate-600">วันที่</label>
          <input type="date" value={otDate} onChange={e => { setOtDate(e.target.value); setOtSuccess(null); setOtError(null); }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA]" />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-sm font-bold text-slate-600">จำนวนชั่วโมง</label>
            <input type="number" min="0.5" max="24" step="0.5" placeholder="เช่น 2 หรือ 2.5"
              value={otHours} onChange={e => { setOtHours(e.target.value); setOtSuccess(null); setOtError(null); }}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA]" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-sm font-bold text-slate-600">อัตรา OT</label>
            <select value={otRate} onChange={e => { setOtRate(parseFloat(e.target.value)); setOtSuccess(null); setOtError(null); }}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA] cursor-pointer">
              <option value={1.0}>ปกติ (x1)</option>
              <option value={1.5}>1.5x — วันธรรมดา</option>
              <option value={2.0}>2x — วันหยุด</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-slate-600">รายละเอียด <span className="font-normal text-slate-400">(ไม่บังคับ)</span></label>
          <input type="text" placeholder="เช่น งานด่วน, ส่งสินค้า, ปิดบัญชี"
            value={otNote} onChange={e => { setOtNote(e.target.value); setOtSuccess(null); setOtError(null); }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA]" />
        </div>

        <button onClick={handleSubmitOT} disabled={!otEmpId || !otDate || !otHours || otSaving}
          className="bg-[#7B8CFA] disabled:opacity-40 text-white text-base font-bold py-3 rounded-xl cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
          {otSaving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />กำลังบันทึก...</> : 'บันทึก OT'}
        </button>

        {otSuccess && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">✓ {otSuccess}</div>}
        {otError   && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">{otError}</div>}
      </div>
    </div>
  );

  // ============================================================
  //  Render: Payroll
  // ============================================================
  const renderPayroll = () => (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Period detail — takes over when a period is selected */}
      {selectedPeriod ? (
        <>
          <div>
            <h2 className="text-2xl font-bold text-[#222222]">รายละเอียดงวด</h2>
          </div>
          <PayrollPeriodDetail
            period={selectedPeriod}
            employees={employees}
            onClose={() => setSelectedPeriod(null)}
            onPaid={() => loadPayrollPeriods()}
          />
        </>
      ) : (
        <>
          <div>
            <h2 className="text-2xl font-bold text-[#222222]">งวดค่าแรง</h2>
            <p className="text-slate-400 text-sm mt-0.5">เลือกช่วงวันที่แล้วสร้างงวดการจ่าย</p>
          </div>

          {/* Create period */}
          <div className="bg-[#F8FAFC] rounded-2xl border border-slate-100 p-5 flex flex-col gap-4">
            <p className="font-semibold text-slate-600">สร้างงวดการจ่ายใหม่</p>
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-sm text-slate-500">วันเริ่มต้น</label>
                <input type="date" value={payPeriodStart} onChange={e => setPayPeriodStart(e.target.value)}
                  className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#7B8CFA] bg-white" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-sm text-slate-500">วันสิ้นสุด</label>
                <input type="date" value={payPeriodEnd} onChange={e => setPayPeriodEnd(e.target.value)}
                  className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#7B8CFA] bg-white" />
              </div>
              <button onClick={handleCreatePeriod} disabled={!payPeriodStart || !payPeriodEnd || payPeriodLoading}
                className="bg-[#7B8CFA] text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 cursor-pointer">
                {payPeriodLoading ? 'กำลังคำนวณ...' : 'สร้างงวด'}
              </button>
            </div>
            {payPeriodError && <p className="text-red-500 text-sm">{payPeriodError}</p>}
          </div>

          {/* Period list */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-600">ประวัติการจ่าย</p>
              {adminLoading && <div className="w-4 h-4 border-2 border-slate-200 border-t-[#7B8CFA] rounded-full animate-spin" />}
            </div>
            {payPeriods.length === 0 && !adminLoading ? (
              <div className="text-slate-400 text-center py-8 text-sm">ยังไม่มีงวดการจ่าย</div>
            ) : (
              payPeriods.map(p => (
                <button key={p.id} onClick={() => handleViewPeriod(p)}
                  className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:border-[#7B8CFA]/30 hover:shadow-sm transition-all text-left w-full">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold text-[#222222]">{p.startDate} — {p.endDate}</p>
                    <p className="text-slate-400 text-xs">สร้างเมื่อ {p.createdAt?.slice(0, 10)}{p.paidAt ? ` · จ่ายเมื่อ ${p.paidAt?.slice(0, 10)}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[#7B8CFA]">{formatMoney(p.grandTotal)}</span>
                    {p.status === 'Paid'
                      ? <span className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">จ่ายแล้ว</span>
                      : <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">ยังไม่จ่าย →</span>
                    }
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );

  // ============================================================
  //  Render: Settings
  // ============================================================
  const renderSettings = () => (
    <div className="flex flex-col gap-6 max-w-lg animate-fade-in">
      <h2 className="text-2xl font-bold text-[#222222]">ตั้งค่า</h2>

      <div className="bg-[#F8FAFC] rounded-2xl border border-slate-100 p-5 flex flex-col gap-3">
        <p className="font-semibold text-slate-600">ข้อมูลระบบ</p>
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-slate-600 text-sm">API Endpoint</span>
          <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{import.meta.env.VITE_API_URL || 'localhost:8000'}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-slate-600 text-sm">Admin PIN</span>
          <span className="text-slate-400 text-sm">****</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-slate-600 text-sm">เวอร์ชัน</span>
          <span className="text-slate-400 text-sm">2.0.0</span>
        </div>
      </div>

      <button onClick={handleLogout}
        className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 font-bold px-5 py-3 rounded-xl cursor-pointer hover:bg-red-100 transition-colors self-start">
        <IconLogout /> ออกจากระบบ
      </button>
    </div>
  );

  // ============================================================
  //  Render: Admin Layout
  // ============================================================
  const handleNavSelect = (id) => { setActiveTab(id); setMobileNavOpen(false); };

  const renderAdminLayout = () => (
    <div className="min-h-screen bg-[#F0F2F5] flex">

      {/* ============ SIDEBAR — desktop only ============ */}
      <aside className="hidden md:flex w-56 bg-white border-r border-slate-100 flex-col shadow-sm flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="px-5 py-5 border-b border-slate-100">
          <p className="font-bold text-[#222222] text-base leading-tight">ระบบจัดการ<br />ค่าแรง</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">{formatTime(currentTime)}</p>
        </div>
        <nav className="flex-1 py-3">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => handleNavSelect(id)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all cursor-pointer text-left
                ${activeTab === id
                  ? 'bg-[#7B8CFA]/10 text-[#7B8CFA] font-bold border-r-2 border-[#7B8CFA]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <Icon />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 text-slate-400 hover:text-red-500 text-sm font-medium py-2 px-3 rounded-xl hover:bg-red-50 transition-colors cursor-pointer">
            <IconLogout /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ============ MOBILE DRAWER ============ */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          {/* drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-2xl">
            <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#222222] text-base leading-tight">ระบบจัดการค่าแรง</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{formatTime(currentTime)}</p>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 py-3 overflow-y-auto">
              {NAV_ITEMS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => handleNavSelect(id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-base font-medium transition-all cursor-pointer text-left
                    ${activeTab === id
                      ? 'bg-[#7B8CFA]/10 text-[#7B8CFA] font-bold'
                      : 'text-slate-600 active:bg-slate-50'}`}>
                  <Icon />{label}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 text-red-500 font-medium py-2 px-3 rounded-xl active:bg-red-50 cursor-pointer">
                <IconLogout /> ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MAIN ============ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <button onClick={() => setMobileNavOpen(true)} className="p-2 rounded-xl active:bg-slate-100 cursor-pointer">
            <svg className="w-6 h-6 text-[#222222]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="font-bold text-[#222222] text-base">
            {NAV_ITEMS.find(n => n.id === activeTab)?.label || 'ระบบจัดการค่าแรง'}
          </p>
          <p className="font-mono text-sm text-slate-400">{formatTime(currentTime).slice(0, 5)}</p>
        </header>

        {/* Content */}
        <main className="flex-1">
          <div className="max-w-5xl mx-auto p-4 md:p-6">
            {activeTab === 'DASHBOARD'  && renderDashboard()}
            {activeTab === 'ATTENDANCE' && renderAttendance()}
            {activeTab === 'OT'         && renderOT()}
            {activeTab === 'PIECE_RATE' && <PieceRatePage employees={employees} />}
            {activeTab === 'ADVANCES'   && <AdvancesPage />}
            {activeTab === 'PAYROLL'    && renderPayroll()}
            {activeTab === 'EMPLOYEES'  && (
              <EmployeesPage
                employees={employees}
                onBack={() => setActiveTab('DASHBOARD')}
                onEnroll={() => {}}
                onRefresh={loadEmployees}
              />
            )}
            {activeTab === 'SETTINGS'   && renderSettings()}
          </div>
        </main>
      </div>
    </div>
  );

  // ============================================================
  //  Root render
  // ============================================================
  return isAdmin ? renderAdminLayout() : renderLogin();
}
