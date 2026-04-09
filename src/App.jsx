import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api     from './lib/api';
import * as faceApi from './lib/faceApi';
import ScanScreen  from './components/ScanScreen';
import EnrollPage  from './components/EnrollPage';

// ============================================================
//  SVG Icons
// ============================================================
const UserIcon = ({ className = 'w-full h-full' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const SunIcon = ({ className = 'w-full h-full' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const CupIcon = ({ className = 'w-full h-full' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 8h12v4a4 4 0 01-4 4H8a4 4 0 01-4-4V8z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 10h1.5a2.5 2.5 0 000-5H16"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 18h14"/>
  </svg>
);
const BriefcaseIcon = ({ className = 'w-full h-full' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const LogoutIcon = ({ className = 'w-full h-full' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const LockIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const DocumentIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const CashIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const BackspaceIcon = ({ className = 'w-10 h-10' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
  </svg>
);
const CheckIcon = ({ className = 'w-12 h-12' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
  </svg>
);
const RefreshIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// ============================================================
//  Action Button
// ============================================================
const ActionBtn = ({ color, textColor, pillColor, disabledColor, icon, title, subtitle, onClick, disabled }) => (
  <button
    onClick={disabled ? undefined : onClick}
    className={`${disabled ? (disabledColor || 'bg-slate-100') : color} ${disabled ? 'text-slate-300' : textColor} p-8 rounded-[2.5rem] shadow-sm flex flex-col items-start justify-between relative overflow-hidden transition-all text-left touch-manipulation ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-[0.98] active:brightness-95'}`}
    style={{ height: '260px' }}
  >
    <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-white/10 rounded-full mix-blend-overlay blur-xl pointer-events-none" />
    <div className="z-10 w-full pointer-events-none">
      <h2 className="text-[2.5rem] font-bold tracking-tight mb-4 leading-none">{title}</h2>
      {!disabled && (
        <div className={`${pillColor} px-5 py-2 rounded-full inline-block text-lg font-medium backdrop-blur-sm`}>{subtitle}</div>
      )}
      {disabled && (
        <div className="bg-slate-200 text-slate-400 px-5 py-2 rounded-full inline-block text-lg font-medium">ไม่พร้อมใช้งาน</div>
      )}
    </div>
    <div className="absolute -bottom-2 -right-2 opacity-20 drop-shadow-lg z-0 pointer-events-none">
      <div className="w-40 h-40 flex items-center justify-center">{icon}</div>
    </div>
  </button>
);

// ============================================================
//  getInitials — "สมชาย ใจดี" → "สจ"
// ============================================================
function getInitials(name = '') {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return name.slice(0, 2);
}

// ============================================================
//  ADMIN_PIN
// ============================================================
const ADMIN_PIN = '1234';

// ============================================================
//  Threshold localStorage helpers
// ============================================================
const THRESH_KEY = 'kiosk_thresholds';
function loadThresholds() {
  try { return JSON.parse(localStorage.getItem(THRESH_KEY)) || null; } catch { return null; }
}
function saveThresholds(t) {
  localStorage.setItem(THRESH_KEY, JSON.stringify(t));
}

// ============================================================
//  Main App
// ============================================================
export default function App() {
  // --- App mode & kiosk flow ---
  // appMode: 'KIOSK' | 'ADMIN' | 'ENROLL'
  const [appMode,     setAppMode]     = useState('KIOSK');
  const [currentStep, setCurrentStep] = useState('IDLE');

  // --- Face API model loading ---
  const [modelProgress, setModelProgress] = useState(0);  // 0–100
  const [modelReady,    setModelReady]    = useState(false);
  const [modelError,    setModelError]    = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Employee data (from GAS) ---
  const [employees,     setEmployees]     = useState([]);
  const [empLoading,    setEmpLoading]    = useState(true);
  const [empError,      setEmpError]      = useState(null);

  // --- Matched employee & status ---
  const [matchedEmp,    setMatchedEmp]    = useState(null);
  const [matchConfidence, setMatchConfidence] = useState(0);
  const [nextAllowed,   setNextAllowed]   = useState(['เข้างาน', 'พักเที่ยง', 'เข้างานบ่าย', 'ออกงาน']);
  const [statusLoading, setStatusLoading] = useState(false);

  // --- Submit state ---
  const [selectedAction, setSelectedAction] = useState(null);
  const [submitError,    setSubmitError]    = useState(null);

  // --- Threshold settings ---
  const [thresholds, setThresholds] = useState(() => {
    const saved = loadThresholds();
    return saved || { high: 0.42, medium: 0.55 };
  });

  // sync thresholds → faceApi on change
  useEffect(() => {
    faceApi.setThresholds(thresholds);
    saveThresholds(thresholds);
  }, [thresholds]);

  // --- Admin state ---
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput,     setPinInput]     = useState('');
  const [pinError,     setPinError]     = useState(false);
  const [adminTab,     setAdminTab]     = useState('LOG');
  const [adminLogs,    setAdminLogs]    = useState([]);
  const [adminPayroll, setAdminPayroll] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError,   setAdminError]   = useState(null);
  // OT state
  const [otEmpId,     setOtEmpId]     = useState('');
  const [otDate,      setOtDate]      = useState('');
  const [otHours,     setOtHours]     = useState('');
  const [otNote,      setOtNote]      = useState('');
  const [otSaving,    setOtSaving]    = useState(false);
  const [otSuccess,   setOtSuccess]   = useState(null);
  const [otError,     setOtError]     = useState(null);
  // Add Employee modal state
  const [showAddEmp,    setShowAddEmp]    = useState(false);
  const [newEmpId,      setNewEmpId]      = useState('');
  const [newEmpName,    setNewEmpName]    = useState('');
  const [newEmpDept,    setNewEmpDept]    = useState('');
  const [newEmpRate,    setNewEmpRate]    = useState('');
  const [newEmpRateType,setNewEmpRateType]= useState('daily');
  const [addEmpSaving,  setAddEmpSaving]  = useState(false);
  const [addEmpError,   setAddEmpError]   = useState(null);
  const adminTimeoutRef = useRef(null);

  // ============================================================
  //  Clock
  // ============================================================
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ============================================================
  //  Load face-api models + employees on mount
  // ============================================================
  useEffect(() => {
    loadEmployees();
    faceApi.loadModels(setModelProgress)
      .then(() => setModelReady(true))
      .catch(() => setModelError('โหลดโมเดล AI ไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'));
  }, []);

  async function loadEmployees() {
    setEmpLoading(true);
    setEmpError(null);
    try {
      const data = await api.getEmployees();
      setEmployees(data.employees || []);
    } catch (err) {
      setEmpError('โหลดข้อมูลพนักงานไม่สำเร็จ');
      console.error(err);
    } finally {
      setEmpLoading(false);
    }
  }

  // ============================================================
  //  Helpers
  // ============================================================
  const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d) => d.toLocaleDateString('th-TH', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatMoney = (n) => Number(n).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });

  const resetFlow = useCallback(() => {
    setCurrentStep('IDLE');
    setSelectedAction(null);
    setMatchedEmp(null);
    setMatchConfidence(0);
    setNextAllowed(['เข้างาน']);
    setSubmitError(null);
  }, []);

  const handleExitAdmin = useCallback(() => {
    setAppMode('KIOSK');
    setShowPinModal(false);
    setPinInput('');
    setAdminTab('LOG');
    setAdminLogs([]);
    setAdminPayroll(null);
    resetFlow();
  }, [resetFlow]);

  // ============================================================
  //  Admin timeout (60s inactivity)
  // ============================================================
  const resetAdminTimeout = useCallback(() => {
    if (adminTimeoutRef.current) clearTimeout(adminTimeoutRef.current);
    if (appMode === 'ADMIN' || showPinModal) {
      adminTimeoutRef.current = setTimeout(() => handleExitAdmin(), 60000);
    }
  }, [appMode, showPinModal, handleExitAdmin]);

  useEffect(() => {
    resetAdminTimeout();
    window.addEventListener('touchstart', resetAdminTimeout, { passive: true });
    window.addEventListener('mousedown',  resetAdminTimeout, { passive: true });
    return () => {
      window.removeEventListener('touchstart', resetAdminTimeout);
      window.removeEventListener('mousedown',  resetAdminTimeout);
      if (adminTimeoutRef.current) clearTimeout(adminTimeoutRef.current);
    };
  }, [resetAdminTimeout]);

  // ============================================================
  //  Kiosk auto-reset
  // ============================================================
  useEffect(() => {
    if (appMode !== 'KIOSK') return;
    let t;
    if (currentStep === 'MATCHED' || currentStep === 'ACTION') t = setTimeout(resetFlow, 15000);
    if (currentStep === 'SUCCESS') t = setTimeout(resetFlow, 3000);
    return () => clearTimeout(t);
  }, [currentStep, appMode, resetFlow]);

  // ============================================================
  //  PIN handlers
  // ============================================================
  const handlePinPress = (num) => {
    setPinError(false);
    if (pinInput.length >= 4) return;
    const next = pinInput + num;
    setPinInput(next);
    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        setTimeout(() => {
          setShowPinModal(false);
          setAppMode('ADMIN');
          setPinInput('');
          loadAdminData();
        }, 200);
      } else {
        setPinError(true);
        setTimeout(() => setPinInput(''), 500);
      }
    }
  };
  const handlePinDelete = () => setPinInput((p) => p.slice(0, -1));

  // ============================================================
  //  Admin data load
  // ============================================================
  async function loadAdminData(tab) {
    const activeTab = tab || adminTab;
    if (activeTab === 'OT' || activeTab === 'SETTINGS') return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const week = api.getCurrentWeekStr();
      if (activeTab === 'LOG') {
        const data = await api.getLogs({ week });
        setAdminLogs(data.logs || []);
      } else {
        const data = await api.getPayroll({ week });
        setAdminPayroll(data);
      }
    } catch (err) {
      setAdminError('โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง');
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  }

  const handleAdminTabChange = (tab) => {
    setAdminTab(tab);
    loadAdminData(tab);
  };

  const handleSubmitOT = async () => {
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
      });
      setOtSuccess(`บันทึก OT ${otHours} ชม. ให้ ${emp?.name || otEmpId} วันที่ ${otDate} สำเร็จ`);
      setOtHours('');
      setOtNote('');
    } catch (err) {
      setOtError('บันทึก OT ไม่สำเร็จ กรุณาลองใหม่');
      console.error(err);
    } finally {
      setOtSaving(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmpId.trim() || !newEmpName.trim() || !newEmpRate) return;
    setAddEmpSaving(true);
    setAddEmpError(null);
    try {
      await api.createEmployee({
        employeeId:  newEmpId.trim(),
        name:        newEmpName.trim(),
        department:  newEmpDept.trim(),
        rate:        parseFloat(newEmpRate),
        rateType:    newEmpRateType,
      });
      setShowAddEmp(false);
      setNewEmpId(''); setNewEmpName(''); setNewEmpDept(''); setNewEmpRate(''); setNewEmpRateType('daily');
      await loadEmployees();
    } catch (err) {
      setAddEmpError(err.message || 'เพิ่มพนักงานไม่สำเร็จ');
    } finally {
      setAddEmpSaving(false);
    }
  };

  // ============================================================
  //  Kiosk scan handlers
  // ============================================================
  const handleStartScan = () => {
    if (empLoading || !modelReady) return;
    setCurrentStep('SCANNING');
  };

  // callback จาก ScanScreen เมื่อ match ได้
  const handleScanMatch = useCallback(({ employee, confidence }) => {
    setMatchedEmp(employee);
    setMatchConfidence(Math.round(confidence * 100));
    setCurrentStep('MATCHED');
    loadEmployeeStatus(employee.employeeId);
  }, []);

  // กล้องเปิดนาน 12 วิ ยังไม่เจอหน้า → ไป fallback
  const handleScanNoFace = useCallback(() => {
    setCurrentStep('FALLBACK');
  }, []);

  const handleScanError = useCallback((msg) => {
    setSubmitError(msg);
    setCurrentStep('ERROR');
  }, []);

  async function loadEmployeeStatus(empId) {
    setStatusLoading(true);
    try {
      const data = await api.getStatus(empId);
      setNextAllowed(data.nextAllowed || ['เข้างาน', 'พักเที่ยง', 'เข้างานบ่าย', 'ออกงาน']);
    } catch (err) {
      console.error('getStatus failed:', err);
      setNextAllowed(['เข้างาน']);
    } finally {
      setStatusLoading(false);
    }
  }

  const handleSelectFromList = (emp) => {
    setMatchedEmp(emp);
    setCurrentStep('ACTION');
    loadEmployeeStatus(emp.employeeId);
  };

  const handleActionSelect = async (actionName) => {
    if (!matchedEmp) return;
    setSelectedAction(actionName);
    setCurrentStep('LOADING');
    setSubmitError(null);
    try {
      await api.logAttendance({
        employeeId:      matchedEmp.employeeId,
        employeeName:    matchedEmp.name,
        actionType:      actionName,
        confidenceScore: 0.99,
        deviceId:        'iPad-01',
      });
      setCurrentStep('SUCCESS');
    } catch (err) {
      console.error(err);
      setSubmitError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      setCurrentStep('ERROR');
    }
  };

  // ============================================================
  //  KIOSK: Idle Screen
  // ============================================================
  const renderIdleScreen = () => {
    const isReady  = modelReady && !empLoading;
    const isWaiting = !modelReady || empLoading;

    const statusText = modelError
      ? modelError
      : !modelReady
        ? `โหลดโมเดล AI... ${modelProgress}%`
        : empLoading
          ? 'กำลังโหลดข้อมูลพนักงาน...'
          : 'แตะหน้าจอเพื่อเริ่มสแกนใบหน้า';

    return (
      <div className="flex flex-col items-center justify-center h-full w-full animate-fade-in">
        {(empError || modelError) && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-6 py-3 rounded-full text-lg flex items-center gap-3">
            <span>{empError || modelError}</span>
            <button onClick={loadEmployees} className="bg-red-100 hover:bg-red-200 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
              <RefreshIcon className="w-4 h-4" /> ลองใหม่
            </button>
          </div>
        )}

        <button
          onClick={handleStartScan}
          disabled={isWaiting}
          className="bg-white p-12 rounded-[3rem] shadow-sm flex flex-col items-center justify-center max-w-2xl w-full mx-8 text-center border border-slate-100 touch-manipulation hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-wait"
        >
          <h1 className="text-5xl font-bold text-[#222222] mb-4 tracking-tight">ระบบลงเวลาเข้างาน</h1>
          <p className="text-2xl text-slate-500 mb-12">{statusText}</p>

          <div className="relative mb-12 pointer-events-none">
            <div className="w-80 h-80 border-[6px] border-[#7B8CFA] rounded-[3rem] flex items-center justify-center bg-[#7B8CFA]/10">
              {isWaiting ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-[6px] border-[#7B8CFA]/30 border-t-[#7B8CFA] rounded-full animate-spin" />
                  {!modelReady && modelProgress > 0 && (
                    <div className="w-40 bg-[#7B8CFA]/20 rounded-full h-2">
                      <div
                        className="bg-[#7B8CFA] h-2 rounded-full transition-all"
                        style={{ width: `${modelProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <svg className="w-32 h-32 text-[#7B8CFA] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8v-2a2 2 0 0 1 2 -2h3m10 0h3a2 2 0 0 1 2 2v2m0 8v2a2 2 0 0 1 -2 2h-3m-10 0h-3a2 2 0 0 1 -2 -2v-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 10a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 16h8" />
                </svg>
              )}
            </div>
          </div>

          <div className={`px-8 py-4 rounded-full text-xl font-medium shadow-md ${isReady ? 'bg-[#222222] text-white' : 'bg-[#F2F2F2] text-slate-400'}`}>
            {isWaiting ? 'กรุณารอสักครู่...' : 'แตะเพื่อเปิดกล้องสแกนหน้า'}
          </div>
        </button>
      </div>
    );
  };

  // ============================================================
  //  KIOSK: Scanning — ใช้ ScanScreen จริง (กล้อง + face detection)
  // ============================================================
  const renderScanningScreen = () => (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <ScanScreen
        employees={employees}
        onMatch={handleScanMatch}
        onNoFace={handleScanNoFace}
        onError={handleScanError}
      />
      <button
        onClick={resetFlow}
        className="mt-6 text-xl text-slate-400 font-medium bg-white/60 px-6 py-3 rounded-full hover:bg-white transition-colors cursor-pointer touch-manipulation"
      >
        ยกเลิก
      </button>
    </div>
  );

  // ============================================================
  //  KIOSK: Matched
  // ============================================================
  const renderMatchedScreen = () => {
    const emp = matchedEmp || {};
    return (
      <div className="flex flex-col items-center justify-center h-full w-full animate-slide-up px-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 w-full max-w-2xl text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#FDD5F5] rounded-full opacity-50 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="text-5xl font-bold text-slate-700 bg-[#F2F2F2] w-40 h-40 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              {getInitials(emp.name)}
            </div>
            <div className="flex items-center gap-2 justify-center mb-4">
              <div className="bg-slate-100 px-4 py-1.5 rounded-full text-slate-500 font-medium">
                ตรวจพบใบหน้า
              </div>
              {matchConfidence > 0 && (
                <div className={`px-4 py-1.5 rounded-full font-bold text-sm ${
                  matchConfidence >= 85 ? 'bg-[#C6F45D] text-[#222222]' :
                  matchConfidence >= 70 ? 'bg-amber-100 text-amber-700' :
                                          'bg-red-100 text-red-600'
                }`}>
                  {matchConfidence}%
                </div>
              )}
            </div>
            <h1 className="text-5xl font-bold text-[#222222] mb-2">{emp.name}</h1>
            {emp.department && (
              <p className="text-xl text-slate-400 mb-10">{emp.department}</p>
            )}

            {statusLoading ? (
              <div className="flex items-center justify-center gap-3 py-6 text-slate-400 text-xl">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-[#7B8CFA] rounded-full animate-spin" />
                กำลังโหลดสถานะ...
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full">
                <button
                  onClick={() => setCurrentStep('ACTION')}
                  className="w-full bg-[#7B8CFA] active:bg-[#6A7AE0] text-white text-3xl font-bold py-6 rounded-full transition-transform active:scale-95 shadow-md cursor-pointer touch-manipulation relative z-20"
                >
                  ยืนยันตัวตน
                </button>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <button onClick={resetFlow} className="w-full bg-[#F2F2F2] active:bg-[#E5E5E5] text-[#222222] text-2xl font-medium py-5 rounded-full transition-transform active:scale-95 cursor-pointer touch-manipulation relative z-20">
                    ไม่ใช่ฉัน
                  </button>
                  <button onClick={() => { resetFlow(); setTimeout(handleStartScan, 100); }} className="w-full bg-[#F2F2F2] active:bg-[#E5E5E5] text-[#222222] text-2xl font-medium py-5 rounded-full transition-transform active:scale-95 cursor-pointer touch-manipulation relative z-20">
                    สแกนใหม่
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setCurrentStep('FALLBACK')}
          className="mt-8 text-xl text-slate-500 font-medium bg-white/60 px-6 py-3 rounded-full hover:bg-white transition-colors cursor-pointer touch-manipulation relative z-20"
        >
          สแกนไม่สำเร็จ? เลือกชื่อแทน
        </button>
      </div>
    );
  };

  // ============================================================
  //  KIOSK: Action
  // ============================================================
  const renderActionScreen = () => {
    const emp = matchedEmp || {};
    const actions = [
      { name: 'เข้างาน',     color: 'bg-[#222222]', textColor: 'text-white',     pillColor: 'bg-white/20 text-white',     icon: <SunIcon className="w-32 h-32 text-white/90" />,          subtitle: 'เริ่มงาน' },
      { name: 'พักเที่ยง',   color: 'bg-[#C6F45D]', textColor: 'text-[#222222]', pillColor: 'bg-white/60 text-[#222222]', icon: <CupIcon className="w-32 h-32 text-[#222222]/90" />,       subtitle: 'พักทานข้าว' },
      { name: 'เข้างานบ่าย', color: 'bg-[#FDD5F5]', textColor: 'text-[#222222]', pillColor: 'bg-white/60 text-[#222222]', icon: <BriefcaseIcon className="w-32 h-32 text-[#222222]/90" />, subtitle: 'เริ่มช่วงบ่าย' },
      { name: 'ออกงาน',     color: 'bg-[#7B8CFA]', textColor: 'text-white',     pillColor: 'bg-white/20 text-white',     icon: <LogoutIcon className="w-32 h-32 text-white/90" />,         subtitle: 'เลิกงาน' },
    ];

    return (
      <div className="flex flex-col items-center justify-start h-full w-full pt-10 px-8 animate-fade-in">
        <div className="flex items-center gap-6 bg-white px-8 py-5 rounded-full shadow-sm mb-10 w-full max-w-[800px] relative z-20">
          <div className="text-2xl font-bold text-slate-600 bg-[#C6F45D] w-14 h-14 rounded-full flex items-center justify-center shadow-inner">
            {getInitials(emp.name)}
          </div>
          <div className="text-left flex-1">
            <div className="text-2xl font-bold text-[#222222]">{emp.name}</div>
            <div className="text-slate-500 font-medium">เลือกรายการที่ต้องการบันทึก</div>
          </div>
          <button onClick={resetFlow} className="bg-[#222222] text-white px-8 py-3.5 rounded-full text-lg font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation">
            ยกเลิก
          </button>
        </div>

        {statusLoading ? (
          <div className="flex items-center gap-3 text-slate-400 text-xl">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-[#7B8CFA] rounded-full animate-spin" />
            กำลังโหลดสถานะ...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 w-full max-w-[800px] relative z-20">
            {actions.map((a) => (
              <ActionBtn
                key={a.name}
                color={a.color}
                textColor={a.textColor}
                pillColor={a.pillColor}
                icon={a.icon}
                title={a.name}
                subtitle={a.subtitle}
                disabled={!nextAllowed.includes(a.name)}
                onClick={() => handleActionSelect(a.name)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  //  KIOSK: Loading
  // ============================================================
  const renderLoadingScreen = () => (
    <div className="flex flex-col items-center justify-center h-full w-full animate-fade-in">
      <div className="bg-white p-12 rounded-[3rem] shadow-sm flex flex-col items-center">
        <div className="w-20 h-20 border-[6px] border-[#F2F2F2] border-t-[#7B8CFA] rounded-full animate-spin mb-8" />
        <h1 className="text-4xl font-bold text-[#222222]">กำลังบันทึก</h1>
        <div className="bg-[#F2F2F2] text-slate-600 px-6 py-2 rounded-full mt-6 text-xl font-medium">
          {selectedAction}
        </div>
      </div>
    </div>
  );

  // ============================================================
  //  KIOSK: Success
  // ============================================================
  const renderSuccessScreen = () => (
    <div className="flex flex-col items-center justify-center h-full w-full animate-pop-in px-8">
      <div className="bg-[#C6F45D] p-12 rounded-[3rem] shadow-lg border border-[#b8e84e] w-full max-w-2xl text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/30 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="bg-[#222222] text-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
            <CheckIcon />
          </div>
          <h1 className="text-5xl font-bold text-[#222222] mb-8">บันทึกสำเร็จ!</h1>
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-[2rem] text-center inline-block min-w-[300px]">
            <p className="text-2xl font-bold text-[#222222] mb-1">{selectedAction}</p>
            <p className="text-xl text-slate-600 mb-1">{matchedEmp?.name}</p>
            <p className="text-3xl text-slate-800 font-medium">{formatTime(currentTime)} น.</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  //  KIOSK: Error
  // ============================================================
  const renderErrorScreen = () => (
    <div className="flex flex-col items-center justify-center h-full w-full animate-fade-in px-8">
      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-red-100 w-full max-w-2xl text-center">
        <div className="bg-red-100 text-red-500 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-[#222222] mb-4">เกิดข้อผิดพลาด</h1>
        <p className="text-xl text-slate-500 mb-10">{submitError}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleActionSelect(selectedAction)}
            className="bg-[#7B8CFA] text-white px-8 py-4 rounded-full text-xl font-bold active:scale-95 transition-transform cursor-pointer touch-manipulation"
          >
            ลองใหม่
          </button>
          <button
            onClick={resetFlow}
            className="bg-[#F2F2F2] text-[#222222] px-8 py-4 rounded-full text-xl font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation"
          >
            กลับหน้าแรก
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================
  //  KIOSK: Fallback (เลือกชื่อเอง)
  // ============================================================
  const renderFallbackScreen = () => (
    <div className="flex flex-col items-center justify-start h-full w-full pt-10 px-8 animate-fade-in">
      <div className="flex justify-between w-full max-w-5xl items-center mb-8 bg-white p-4 pr-6 pl-8 rounded-full shadow-sm relative z-20">
        <h1 className="text-3xl font-bold text-[#222222]">ระบุชื่อด้วยตัวเอง</h1>
        <button onClick={resetFlow} className="bg-[#F2F2F2] text-[#222222] px-6 py-3 rounded-full text-lg font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation">
          กลับหน้าแรก
        </button>
      </div>

      {empLoading ? (
        <div className="flex items-center gap-3 text-slate-400 text-xl mt-10">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-[#7B8CFA] rounded-full animate-spin" />
          กำลังโหลด...
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-5 w-full max-w-5xl overflow-y-auto pb-10 relative z-20">
          {employees.map((emp) => (
            <button
              key={emp.employeeId}
              onClick={() => handleSelectFromList(emp)}
              className="bg-white p-6 rounded-[2rem] flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform active:bg-slate-50 cursor-pointer shadow-sm border border-transparent hover:border-[#7B8CFA] touch-manipulation w-full"
            >
              <div className="text-2xl font-bold text-slate-500 bg-[#F2F2F2] w-20 h-20 rounded-full flex items-center justify-center">
                {getInitials(emp.name)}
              </div>
              <span className="text-xl font-bold text-[#222222] text-center leading-tight">{emp.name}</span>
              {emp.department && (
                <span className="text-sm text-slate-400">{emp.department}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================================
  //  ADMIN: Export helpers
  // ============================================================
  const exportLogsCSV = () => {
    const headers = ['วันที่', 'รหัส', 'ชื่อ-สกุล', 'เข้างาน', 'พักเที่ยง', 'กลับพัก', 'ออกงาน', 'ชม.สุทธิ', 'สถานะ'];
    const rows = adminLogs.map(l => [
      l.date, l.employeeId, l.name,
      l.in || '-', l.breakOut || '-', l.breakIn || '-', l.out || '-',
      l.workedHours || '-', l.status === 'complete' ? 'ครบ' : 'ไม่ครบ',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance_${api.getCurrentWeekStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPayrollCSV = () => {
    const payroll = adminPayroll?.payroll || [];
    const headers = ['รหัส', 'ชื่อ-สกุล', 'วันทำงาน', 'ชม.รวม', 'เรท', 'ประเภท', 'ยอดรวม', 'หักมาสาย', 'OT ชม.', 'OT บาท', 'สุทธิ'];
    const rows = payroll.map(p => [
      p.employeeId, p.name, p.days, p.hours,
      p.rate, p.rateType === 'daily' ? 'รายวัน' : 'รายชั่วโมง',
      p.total, p.lateDeduction || 0, p.otHours || 0, p.otAmount || 0, p.netTotal ?? p.total,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payroll_${adminPayroll?.week || api.getCurrentWeekStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  //  ADMIN Dashboard
  // ============================================================
  const renderAdminDashboard = () => (
    <div className="flex flex-col w-full self-stretch px-6 pt-4 pb-6 animate-fade-in">
      {/* Header — 2 rows */}
      <div className="bg-white rounded-3xl shadow-sm mb-4 w-full border border-slate-100 overflow-hidden">
        {/* Row 1: title + logout */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-[#222222] text-white p-2 rounded-full"><LockIcon className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold text-[#222222]">Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAdminData()}
              className="bg-[#F2F2F2] text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors cursor-pointer touch-manipulation"
              title="รีเฟรช"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleExitAdmin}
              className="bg-[#EF4444] text-white px-4 py-2 rounded-full text-base font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation"
            >
              ออก
            </button>
          </div>
        </div>
        {/* Row 2: tabs + enroll */}
        <div className="flex justify-between items-center px-5 py-3">
          <div className="flex bg-[#F2F2F2] p-1 rounded-full gap-1">
            <button
              onClick={() => handleAdminTabChange('LOG')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-base font-bold transition-all ${adminTab === 'LOG' ? 'bg-white text-[#222222] shadow-sm' : 'text-slate-500'}`}
            >
              <DocumentIcon className="w-4 h-4" /> ลงเวลา
            </button>
            <button
              onClick={() => handleAdminTabChange('PAYROLL')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-base font-bold transition-all ${adminTab === 'PAYROLL' ? 'bg-white text-[#222222] shadow-sm' : 'text-slate-500'}`}
            >
              <CashIcon className="w-4 h-4" /> ค่าแรง
            </button>
            <button
              onClick={() => handleAdminTabChange('OT')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-base font-bold transition-all ${adminTab === 'OT' ? 'bg-white text-[#222222] shadow-sm' : 'text-slate-500'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              OT
            </button>
            <button
              onClick={() => setAdminTab('SETTINGS')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-base font-bold transition-all ${adminTab === 'SETTINGS' ? 'bg-white text-[#222222] shadow-sm' : 'text-slate-500'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              ตั้งค่า
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddEmp(true)}
              className="bg-[#C6F45D] text-[#222222] px-4 py-2 rounded-full text-base font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              เพิ่มพนักงาน
            </button>
            <button
              onClick={() => setAppMode('ENROLL')}
              className="bg-[#7B8CFA] text-white px-4 py-2 rounded-full text-base font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              ลงทะเบียน
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-6 overflow-y-auto flex flex-col" style={{ WebkitOverflowScrolling: 'touch', maxHeight: 'calc(100vh - 200px)' }}>
        {adminLoading ? (
          <div className="flex-1 flex items-center justify-center gap-4 text-slate-400 text-xl">
            <div className="w-8 h-8 border-4 border-slate-100 border-t-[#7B8CFA] rounded-full animate-spin" />
            กำลังโหลดข้อมูล...
          </div>
        ) : adminError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-red-500 text-xl">{adminError}</p>
            <button onClick={() => loadAdminData()} className="bg-[#7B8CFA] text-white px-6 py-3 rounded-full font-bold cursor-pointer touch-manipulation">
              ลองใหม่
            </button>
          </div>
        ) : adminTab === 'LOG' ? (
          renderAdminLogs()
        ) : adminTab === 'PAYROLL' ? (
          renderAdminPayroll()
        ) : adminTab === 'OT' ? (
          renderAdminOT()
        ) : (
          renderAdminSettings()
        )}
      </div>
    </div>
  );

  const renderAdminLogs = () => (
    <>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-bold text-[#222222] mb-0.5">Attendance Log</h2>
          <p className="text-slate-500">สัปดาห์: {api.getCurrentWeekStr()}</p>
        </div>
        <button
          onClick={exportLogsCSV}
          disabled={adminLogs.length === 0}
          className="bg-[#C6F45D] disabled:opacity-40 text-[#222222] px-5 py-2 rounded-full font-bold text-sm active:scale-95 transition-transform cursor-pointer touch-manipulation flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {adminLogs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xl">ยังไม่มีข้อมูลในสัปดาห์นี้</div>
      ) : (
        <div className="overflow-auto flex-1 rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFC] text-slate-500 sticky top-0">
              <tr>
                <th className="p-4 font-bold border-b border-slate-100">วันที่</th>
                <th className="p-4 font-bold border-b border-slate-100">รหัส</th>
                <th className="p-4 font-bold border-b border-slate-100">ชื่อ-สกุล</th>
                <th className="p-4 font-bold border-b border-slate-100 text-center">เข้างาน</th>
                <th className="p-4 font-bold border-b border-slate-100 text-center">พักเที่ยง</th>
                <th className="p-4 font-bold border-b border-slate-100 text-center">กลับพัก</th>
                <th className="p-4 font-bold border-b border-slate-100 text-center">ออกงาน</th>
                <th className="p-4 font-bold border-b border-slate-100 text-center">ชม.สุทธิ</th>
                <th className="p-4 font-bold border-b border-slate-100 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {adminLogs.map((log, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-700">{log.date}</td>
                  <td className="p-4 font-mono text-slate-500">{log.employeeId}</td>
                  <td className="p-4 font-bold text-[#222222]">{log.name}</td>
                  <td className="p-4 text-center font-mono">{log.in || '-'}</td>
                  <td className="p-4 text-center font-mono text-slate-400">{log.breakOut || '-'}</td>
                  <td className="p-4 text-center font-mono text-slate-400">{log.breakIn || '-'}</td>
                  <td className="p-4 text-center font-mono">{log.out || '-'}</td>
                  <td className="p-4 text-center font-bold text-[#7B8CFA]">{log.workedHours || '-'}</td>
                  <td className="p-4 text-center">
                    {log.status === 'complete'
                      ? <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">ข้อมูลครบ</span>
                      : <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold">ไม่ครบ</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderAdminPayroll = () => {
    const payroll    = adminPayroll?.payroll    || [];
    const grandTotal = adminPayroll?.grandTotal || 0;

    return (
      <>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-bold text-[#222222] mb-1">Weekly Payroll</h2>
            <p className="text-slate-500 text-lg">สรุปค่าแรงรายสัปดาห์ — {adminPayroll?.week || api.getCurrentWeekStr()}</p>
          </div>
          <button
            onClick={exportPayrollCSV}
            disabled={(adminPayroll?.payroll || []).length === 0}
            className="bg-[#C6F45D] disabled:opacity-40 text-[#222222] px-5 py-2 rounded-full font-bold text-sm active:scale-95 transition-transform cursor-pointer touch-manipulation flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>

        {payroll.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xl">ยังไม่มีข้อมูลในสัปดาห์นี้</div>
        ) : (
          <>
            <div className="overflow-auto flex-1 rounded-2xl border border-slate-100 mb-4">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8FAFC] text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-4 font-bold border-b border-slate-100">รหัส</th>
                    <th className="p-4 font-bold border-b border-slate-100">ชื่อ-สกุล</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-center">วันทำงาน</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-center">ชม.รวม</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-right">เรท</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-right">ยอดรวม</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-right text-red-400">หักมาสาย</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-right text-emerald-500">OT ชม.</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-right text-[#7B8CFA]">สุทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.map((pay, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-slate-500">{pay.employeeId}</td>
                      <td className="p-4 font-bold text-[#222222]">{pay.name}</td>
                      <td className="p-4 text-center font-bold text-slate-700">{pay.days} วัน</td>
                      <td className="p-4 text-center text-slate-600">{pay.hours} ชม.</td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-slate-700">฿{pay.rate}</span>
                        <span className="text-sm text-slate-400 ml-1">/{pay.rateType === 'daily' ? 'วัน' : 'ชม.'}</span>
                      </td>
                      <td className="p-4 text-right text-slate-600">{formatMoney(pay.total)}</td>
                      <td className="p-4 text-right text-red-500 font-medium">
                        {pay.lateDeduction > 0 ? `-${formatMoney(pay.lateDeduction)}` : '-'}
                      </td>
                      <td className="p-4 text-right text-emerald-600 font-medium">
                        {pay.otHours > 0 ? `+${pay.otHours} ชม.` : '-'}
                      </td>
                      <td className="p-4 text-right font-bold text-xl text-[#7B8CFA]">{formatMoney(pay.netTotal ?? pay.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-[#F8FAFC] p-5 rounded-2xl flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <div className="text-slate-500 font-medium">รวมยอดจ่ายทั้งหมด ({payroll.length} พนักงาน)</div>
                {(adminPayroll?.totalDeduction > 0) && (
                  <div className="text-red-400 text-sm">หักมาสายรวม -{formatMoney(adminPayroll.totalDeduction)}</div>
                )}
              </div>
              <div className="text-4xl font-bold text-[#7B8CFA]">{formatMoney(adminPayroll?.grandNetTotal ?? grandTotal)}</div>
            </div>
          </>
        )}
      </>
    );
  };

  // ============================================================
  //  ADMIN: Settings Tab
  // ============================================================
  const renderAdminSettings = () => {
    // Distance 0.0 = 100%, Distance 0.6 = 0%
    const pct = (v) => Math.max(0, Math.min(100, Math.round((1 - v / 0.6) * 100)));
    return (
      <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full pt-4 animate-fade-in pb-10">
        <div>
          <h2 className="text-3xl font-bold text-[#222222] mb-1">ตั้งค่าระบบ</h2>
          <p className="text-slate-400 text-lg">ปรับ threshold การจดจำใบหน้า — บันทึกอัตโนมัติ</p>
        </div>

        {/* HIGH threshold */}
        <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-xl font-bold text-[#222222]">Confident Match</p>
              <p className="text-slate-400">ระดับ high — รับผ่านทันที (สีเขียว)</p>
            </div>
            <div className="bg-[#C6F45D] text-[#222222] font-bold text-2xl px-5 py-2 rounded-full min-w-[80px] text-center">
              {pct(thresholds.high)}%
            </div>
          </div>
          <input
            type="range" min="0.30" max="0.50" step="0.01"
            value={thresholds.high}
            onChange={e => setThresholds(p => ({ ...p, high: parseFloat(e.target.value) }))}
            className="w-full h-3 rounded-full accent-[#7B8CFA] cursor-pointer"
          />
          <div className="flex justify-between text-sm text-slate-400 mt-2">
            <span>เข้มงวดมาก ({pct(0.30)}%)</span>
            <span>ผ่อนปรน ({pct(0.50)}%)</span>
          </div>
        </div>

        {/* MEDIUM threshold */}
        <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-xl font-bold text-[#222222]">Ask Confirm</p>
              <p className="text-slate-400">ระดับ medium — ให้กดยืนยันก่อน (สีเหลือง)</p>
            </div>
            <div className="bg-amber-100 text-amber-700 font-bold text-2xl px-5 py-2 rounded-full min-w-[80px] text-center">
              {pct(thresholds.medium)}%
            </div>
          </div>
          <input
            type="range" min="0.42" max="0.65" step="0.01"
            value={thresholds.medium}
            onChange={e => setThresholds(p => ({ ...p, medium: parseFloat(e.target.value) }))}
            className="w-full h-3 rounded-full accent-[#7B8CFA] cursor-pointer"
          />
          <div className="flex justify-between text-sm text-slate-400 mt-2">
            <span>เข้มงวดมาก ({pct(0.42)}%)</span>
            <span>ผ่อนปรน ({pct(0.65)}%)</span>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-lg font-bold text-slate-600 mb-4">ความหมายของระดับ</p>
          <div className="flex flex-col gap-3">
            {[
              { color: 'bg-[#C6F45D]', text: 'text-[#222222]', label: 'สีเขียว', desc: `≥ ${pct(thresholds.high)}% — match สูง ผ่านได้เลย` },
              { color: 'bg-amber-100', text: 'text-amber-700', label: 'สีเหลือง', desc: `${pct(thresholds.medium)}–${pct(thresholds.high)-1}% — ให้พนักงานกดยืนยัน` },
              { color: 'bg-red-100',   text: 'text-red-600',   label: 'สีแดง',   desc: `< ${pct(thresholds.medium)}% — ไม่พบ / เลือกชื่อเอง` },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`${item.color} ${item.text} px-4 py-1 rounded-full font-bold text-sm w-24 text-center`}>{item.label}</div>
                <span className="text-slate-600">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={() => setThresholds({ high: 0.42, medium: 0.55 })}
          className="bg-[#F2F2F2] text-slate-500 px-8 py-4 rounded-full font-medium text-lg active:scale-95 transition-transform cursor-pointer touch-manipulation self-start"
        >
          รีเซ็ตค่าเริ่มต้น
        </button>
      </div>
    );
  };

  // ============================================================
  //  ADMIN: OT Tab
  // ============================================================
  const renderAdminOT = () => (
    <div className="flex flex-col gap-6 max-w-lg mx-auto w-full pt-4 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-[#222222] mb-1">บันทึก OT</h2>
        <p className="text-slate-400 text-lg">Admin คีย์ OT ย้อนหลังได้ — ข้อมูลเดิมจะถูกแทนที่</p>
      </div>

      <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-slate-100 flex flex-col gap-5">
        {/* Employee */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-bold text-slate-600">พนักงาน</label>
          <select
            value={otEmpId}
            onChange={e => { setOtEmpId(e.target.value); setOtSuccess(null); setOtError(null); }}
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-lg text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#7B8CFA] cursor-pointer"
          >
            <option value="">-- เลือกพนักงาน --</option>
            {employees.map(emp => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.name} ({emp.employeeId})
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-bold text-slate-600">วันที่</label>
          <input
            type="date"
            value={otDate}
            onChange={e => { setOtDate(e.target.value); setOtSuccess(null); setOtError(null); }}
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-lg text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#7B8CFA] cursor-pointer"
          />
        </div>

        {/* Hours */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-bold text-slate-600">จำนวนชั่วโมง OT</label>
          <input
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            placeholder="เช่น 2 หรือ 2.5"
            value={otHours}
            onChange={e => { setOtHours(e.target.value); setOtSuccess(null); setOtError(null); }}
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-lg text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#7B8CFA]"
          />
        </div>

        {/* Note */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-bold text-slate-600">รายละเอียด <span className="font-normal text-slate-400">(ไม่บังคับ)</span></label>
          <input
            type="text"
            placeholder="เช่น งานด่วน, ส่งสินค้า, ปิดบัญชี"
            value={otNote}
            onChange={e => { setOtNote(e.target.value); setOtSuccess(null); setOtError(null); }}
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-lg text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#7B8CFA]"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmitOT}
          disabled={!otEmpId || !otDate || !otHours || otSaving}
          className="w-full bg-[#7B8CFA] disabled:opacity-40 text-white text-xl font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform cursor-pointer touch-manipulation flex items-center justify-center gap-3"
        >
          {otSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              กำลังบันทึก...
            </>
          ) : 'บันทึก OT'}
        </button>

        {/* Feedback */}
        {otSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-2xl text-base font-medium">
            ✓ {otSuccess}
          </div>
        )}
        {otError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-4 rounded-2xl text-base font-medium">
            {otError}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================
  //  PIN Modal
  // ============================================================
  const renderPinModal = () => (
    <div
      className="fixed inset-0 bg-[#222222]/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in"
      onClick={() => { setShowPinModal(false); setPinInput(''); }}
    >
      <div
        className="bg-white p-10 rounded-[3rem] shadow-2xl w-[400px] flex flex-col items-center relative z-[110]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#F2F2F2] p-4 rounded-full mb-6"><LockIcon className="w-8 h-8" /></div>
        <h2 className="text-3xl font-bold text-[#222222] mb-2">รหัสผู้ดูแลระบบ</h2>
        <p className="text-slate-500 mb-8">กรุณาใส่ PIN เพื่อเข้าสู่หน้ารายงาน</p>

        <div className={`flex gap-4 mb-10 ${pinError ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-6 h-6 rounded-full transition-all duration-200 ${i < pinInput.length ? 'bg-[#7B8CFA] scale-110' : 'bg-slate-200'}`} />
          ))}
        </div>

        {pinError && <p className="text-red-500 font-bold mb-4 -mt-4 animate-fade-in">รหัส PIN ไม่ถูกต้อง</p>}

        <div className="grid grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => handlePinPress(n.toString())}
              className="bg-[#F8FAFC] hover:bg-[#F2F2F2] active:bg-[#E2E8F0] text-3xl font-bold text-[#222222] py-6 rounded-full transition-colors select-none cursor-pointer touch-manipulation">
              {n}
            </button>
          ))}
          <button onClick={() => { setShowPinModal(false); setPinInput(''); }}
            className="text-slate-400 font-bold text-xl rounded-full hover:bg-slate-50 select-none cursor-pointer touch-manipulation">
            ยกเลิก
          </button>
          <button onClick={() => handlePinPress('0')}
            className="bg-[#F8FAFC] hover:bg-[#F2F2F2] active:bg-[#E2E8F0] text-3xl font-bold text-[#222222] py-6 rounded-full transition-colors select-none cursor-pointer touch-manipulation">
            0
          </button>
          <button onClick={handlePinDelete}
            className="flex items-center justify-center rounded-full hover:bg-slate-50 select-none cursor-pointer touch-manipulation text-slate-400">
            <BackspaceIcon />
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================
  //  Root render
  // ============================================================
  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans flex flex-col overflow-hidden select-none relative">

      {/* Header */}
      <header className="relative z-[60] px-8 py-6 flex justify-between items-center w-full max-w-7xl mx-auto">
        <div className="flex gap-4 items-center">
          {appMode === 'KIOSK' && (
            <button
              onClick={() => setShowPinModal(true)}
              className="bg-white/80 hover:bg-white text-slate-400 hover:text-[#7B8CFA] p-3 rounded-full transition-all shadow-md cursor-pointer touch-manipulation"
            >
              <LockIcon className="w-5 h-5" />
            </button>
          )}
          <div className="bg-[#7B8CFA] text-white px-6 py-2.5 rounded-full shadow-sm flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            <span className="text-xl font-bold tracking-wide">Kiosk</span>
          </div>
        </div>

        <div className="bg-[#222222] text-white px-6 py-2.5 rounded-full shadow-sm flex items-center gap-4">
          <div className="text-xl font-medium opacity-80">{formatDate(currentTime)}</div>
          <div className="text-2xl font-bold font-mono tracking-tighter">{formatTime(currentTime)}</div>
        </div>
      </header>

      {/* Main */}
      <main className={`flex-1 relative z-10 flex pb-4 ${appMode === 'ADMIN' || appMode === 'ENROLL' ? 'items-stretch' : 'items-center justify-center pb-12'}`}>
        {appMode === 'ENROLL' ? (
          <EnrollPage
            employees={employees}
            onDone={loadEmployees}
            onBack={() => setAppMode('ADMIN')}
          />
        ) : appMode === 'ADMIN' ? (
          renderAdminDashboard()
        ) : (
          <>
            {currentStep === 'IDLE'     && renderIdleScreen()}
            {currentStep === 'SCANNING' && renderScanningScreen()}
            {currentStep === 'MATCHED'  && renderMatchedScreen()}
            {currentStep === 'ACTION'   && renderActionScreen()}
            {currentStep === 'LOADING'  && renderLoadingScreen()}
            {currentStep === 'SUCCESS'  && renderSuccessScreen()}
            {currentStep === 'ERROR'    && renderErrorScreen()}
            {currentStep === 'FALLBACK' && renderFallbackScreen()}
          </>
        )}
      </main>

      {showPinModal && renderPinModal()}

      {/* Add Employee Modal */}
      {showAddEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-[#222222]">เพิ่มพนักงานใหม่</h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1 block">รหัสพนักงาน *</label>
                <input
                  value={newEmpId}
                  onChange={e => setNewEmpId(e.target.value)}
                  placeholder="เช่น 001"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1 block">ชื่อ-นามสกุล *</label>
                <input
                  value={newEmpName}
                  onChange={e => setNewEmpName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1 block">แผนก</label>
                <input
                  value={newEmpDept}
                  onChange={e => setNewEmpDept(e.target.value)}
                  placeholder="เช่น ขาย"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA]"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500 mb-1 block">อัตราค่าแรง *</label>
                  <input
                    type="number"
                    value={newEmpRate}
                    onChange={e => setNewEmpRate(e.target.value)}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500 mb-1 block">ประเภท</label>
                  <select
                    value={newEmpRateType}
                    onChange={e => setNewEmpRateType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA] bg-white"
                  >
                    <option value="daily">รายวัน</option>
                    <option value="hourly">รายชั่วโมง</option>
                  </select>
                </div>
              </div>
            </div>

            {addEmpError && <p className="text-red-500 text-sm">{addEmpError}</p>}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setShowAddEmp(false); setAddEmpError(null); }}
                className="flex-1 bg-[#F2F2F2] text-slate-600 py-3 rounded-full font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddEmployee}
                disabled={addEmpSaving || !newEmpId.trim() || !newEmpName.trim() || !newEmpRate}
                className="flex-1 bg-[#7B8CFA] text-white py-3 rounded-full font-bold cursor-pointer disabled:opacity-50"
              >
                {addEmpSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
