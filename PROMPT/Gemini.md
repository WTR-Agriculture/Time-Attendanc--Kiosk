import React, { useState, useEffect, useRef } from 'react';

// --- Mock Data & Icons ---
const ADMIN_PIN = '1234';

const MOCK_USER = { id: '001', name: 'สมชาย ใจดี', role: 'พนักงานขาย', avatar: 'สจ' };

const MOCK_LOGS = [
  { id: 1, date: '06 เม.ย. 26', empId: '001', name: 'สมชาย ใจดี', in: '08:00', bOut: '12:00', bIn: '13:00', out: '17:00', hours: 8, status: 'complete' },
  { id: 2, date: '06 เม.ย. 26', empId: '002', name: 'สมศรี มีสุข', in: '08:15', bOut: '12:05', bIn: '13:00', out: '17:30', hours: 8.25, status: 'complete' },
  { id: 3, date: '06 เม.ย. 26', empId: '003', name: 'วิชัย รักดี', in: '07:55', bOut: '12:00', bIn: '-', out: '-', hours: 4, status: 'incomplete' },
  { id: 4, date: '05 เม.ย. 26', empId: '001', name: 'สมชาย ใจดี', in: '08:05', bOut: '12:00', bIn: '13:00', out: '17:05', hours: 8, status: 'complete' },
];

const MOCK_PAYROLL = [
  { empId: '001', name: 'สมชาย ใจดี', days: 6, hours: 48, rate: 400, rateType: 'daily', total: 2400 },
  { empId: '002', name: 'สมศรี มีสุข', days: 5, hours: 40.5, rate: 50, rateType: 'hourly', total: 2025 },
  { empId: '003', name: 'วิชัย รักดี', days: 6, hours: 44, rate: 400, rateType: 'daily', total: 2400 },
];

// SVGs
const UserIcon = ({ className = "w-full h-full" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const SunIcon = ({ className = "w-24 h-24" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);
const CupIcon = ({ className = "w-24 h-24" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 8h12v4a4 4 0 01-4 4H8a4 4 0 01-4-4V8z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 10h1.5a2.5 2.5 0 000-5H16"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 18h14"/></svg>
);
const BriefcaseIcon = ({ className = "w-24 h-24" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
);
const LogoutIcon = ({ className = "w-24 h-24" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
);
const LockIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
);
const DocumentIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const CashIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);

// --- Main Application Component ---
export default function App() {
  const [appMode, setAppMode] = useState('KIOSK'); // 'KIOSK' or 'ADMIN'
  const [currentStep, setCurrentStep] = useState('IDLE');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAction, setSelectedAction] = useState(null);
  
  // Admin State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [adminTab, setAdminTab] = useState('LOG'); // 'LOG' or 'PAYROLL'
  const adminTimeoutRef = useRef(null);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Kiosk Auto-reset
  useEffect(() => {
    let timeout;
    if (appMode === 'KIOSK') {
      if (currentStep === 'MATCHED' || currentStep === 'ACTION') {
        timeout = setTimeout(() => resetFlow(), 15000);
      } else if (currentStep === 'SUCCESS') {
        timeout = setTimeout(() => resetFlow(), 3000);
      }
    }
    return () => clearTimeout(timeout);
  }, [currentStep, appMode]);

  // Admin Auto-timeout (60s of inactivity) & Global Touch Fix
  useEffect(() => {
    const resetAdminTimeout = () => {
      if (adminTimeoutRef.current) clearTimeout(adminTimeoutRef.current);
      if (appMode === 'ADMIN' || showPinModal) {
        adminTimeoutRef.current = setTimeout(() => {
          handleExitAdmin();
        }, 60000); // 60 seconds
      }
    };

    // Initial call
    resetAdminTimeout();

    // Attach global listeners for touch/click to reset timeout properly without blocking UI
    const handleActivity = () => resetAdminTimeout();
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('mousedown', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      if (adminTimeoutRef.current) clearTimeout(adminTimeoutRef.current);
    };
  }, [appMode, showPinModal]);

  const resetFlow = () => {
    setCurrentStep('IDLE');
    setSelectedAction(null);
  };

  const handleExitAdmin = () => {
    setAppMode('KIOSK');
    setShowPinModal(false);
    setPinInput('');
    setAdminTab('LOG');
    resetFlow();
  };

  const formatTime = (date) => date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('th-TH', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatMoney = (num) => num.toLocaleString('th-TH', { style: 'currency', currency: 'THB' });

  // Numpad handlers
  const handlePinPress = (num) => {
    setPinError(false);
    if (pinInput.length < 4) {
      const newPin = pinInput + num;
      setPinInput(newPin);
      if (newPin.length === 4) {
        if (newPin === ADMIN_PIN) {
          setTimeout(() => {
            setShowPinModal(false);
            setAppMode('ADMIN');
            setPinInput('');
          }, 200);
        } else {
          setPinError(true);
          setTimeout(() => setPinInput(''), 500);
        }
      }
    }
  };
  const handlePinDelete = () => setPinInput(pinInput.slice(0, -1));

  // Kiosk Handlers
  const handleStartScan = () => {
    setCurrentStep('SCANNING');
    setTimeout(() => setCurrentStep('MATCHED'), 1500);
  };

  const handleActionSelect = (actionName) => {
    setSelectedAction(actionName);
    setCurrentStep('LOADING');
    setTimeout(() => setCurrentStep('SUCCESS'), 1200);
  };

  // --- KIOSK SCREENS ---

  const renderIdleScreen = () => (
    <div className="flex flex-col items-center justify-center h-full w-full animate-fade-in">
      <button 
        onClick={handleStartScan}
        className="bg-white p-12 rounded-[3rem] shadow-sm flex flex-col items-center justify-center max-w-2xl w-full mx-8 text-center border border-slate-100 cursor-pointer touch-manipulation hover:bg-slate-50 active:scale-[0.98] transition-all"
      >
        <h1 className="text-5xl font-bold text-[#222222] mb-4 tracking-tight">ระบบลงเวลาเข้างาน</h1>
        <p className="text-2xl text-slate-500 mb-12">ขยับใบหน้าเข้ามาในกรอบเพื่อเริ่มต้น</p>
        
        <div className="relative mb-12 pointer-events-none">
          <div className="w-80 h-80 border-[6px] border-[#7B8CFA] rounded-[3rem] flex items-center justify-center bg-[#7B8CFA]/10">
            <svg className="w-32 h-32 text-[#7B8CFA] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8v-2a2 2 0 0 1 2 -2h3m10 0h3a2 2 0 0 1 2 2v2m0 8v2a2 2 0 0 1 -2 2h-3m-10 0h-3a2 2 0 0 1 -2 -2v-2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 10a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 16h8" />
            </svg>
          </div>
        </div>
        
        <div className="bg-[#222222] text-white px-8 py-4 rounded-full text-xl font-medium shadow-md">
          แตะหน้าจอเพื่อจำลองการสแกน
        </div>
      </button>
    </div>
  );

  const renderScanningScreen = () => (
    <div className="flex flex-col items-center justify-center h-full w-full animate-fade-in">
      <div className="relative w-80 h-80 rounded-[3rem] overflow-hidden border-[6px] border-[#C6F45D] bg-white mb-10 shadow-lg">
        <div className="absolute inset-0 flex items-center justify-center p-16 text-[#222222]/20">
          <UserIcon />
        </div>
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#C6F45D]/0 to-[#C6F45D]/40 animate-scan">
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#C6F45D] shadow-[0_0_15px_#C6F45D]"></div>
        </div>
      </div>
      <div className="bg-white px-8 py-4 rounded-full shadow-sm border border-slate-100">
        <h1 className="text-3xl font-bold text-[#222222]">กำลังประมวลผลใบหน้า...</h1>
      </div>
    </div>
  );

  const renderMatchedScreen = () => (
    <div className="flex flex-col items-center justify-center h-full w-full animate-slide-up px-8">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 w-full max-w-2xl text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#FDD5F5] rounded-full opacity-50 blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="text-5xl font-bold text-slate-700 bg-[#F2F2F2] w-40 h-40 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            {MOCK_USER.avatar}
          </div>
          <div className="bg-slate-100 px-4 py-1.5 rounded-full inline-block text-slate-500 font-medium mb-4">
            ตรวจพบใบหน้า
          </div>
          <h1 className="text-5xl font-bold text-[#222222] mb-12">{MOCK_USER.name}</h1>
          
          <div className="flex flex-col gap-4 w-full">
            <button onClick={() => setCurrentStep('ACTION')} className="w-full bg-[#7B8CFA] active:bg-[#6A7AE0] text-white text-3xl font-bold py-6 rounded-full transition-transform active:scale-95 shadow-md cursor-pointer touch-manipulation relative z-20">
              ยืนยันตัวตน
            </button>
            <div className="grid grid-cols-2 gap-4 w-full">
              <button onClick={resetFlow} className="w-full bg-[#F2F2F2] active:bg-[#E5E5E5] text-[#222222] text-2xl font-medium py-5 rounded-full transition-transform active:scale-95 cursor-pointer touch-manipulation relative z-20">
                ไม่ใช่ฉัน
              </button>
              <button onClick={resetFlow} className="w-full bg-[#F2F2F2] active:bg-[#E5E5E5] text-[#222222] text-2xl font-medium py-5 rounded-full transition-transform active:scale-95 cursor-pointer touch-manipulation relative z-20">
                สแกนใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
      <button onClick={() => setCurrentStep('FALLBACK')} className="mt-8 text-xl text-slate-500 font-medium bg-white/60 px-6 py-3 rounded-full hover:bg-white transition-colors cursor-pointer touch-manipulation relative z-20">
        สแกนไม่สำเร็จ? เลือกชื่อแทน
      </button>
    </div>
  );

  const renderActionScreen = () => (
    <div className="flex flex-col items-center justify-start h-full w-full pt-10 px-8 animate-fade-in">
      <div className="flex items-center gap-6 bg-white px-8 py-5 rounded-full shadow-sm mb-10 w-full max-w-[800px] relative z-20">
        <div className="text-2xl font-bold text-slate-600 bg-[#C6F45D] w-14 h-14 rounded-full flex items-center justify-center shadow-inner">{MOCK_USER.avatar}</div>
        <div className="text-left flex-1">
          <div className="text-2xl font-bold text-[#222222]">{MOCK_USER.name}</div>
          <div className="text-slate-500 font-medium">เลือกรายการที่ต้องการบันทึก</div>
        </div>
        <button onClick={resetFlow} className="bg-[#222222] text-white px-8 py-3.5 rounded-full text-lg font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation">
          ยกเลิก
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-[800px] relative z-20">
        <ActionBtn color="bg-[#222222]" textColor="text-white" pillColor="bg-white/20 text-white" icon={<SunIcon className="w-32 h-32 text-white/90" />} title="เข้างาน" subtitle="เริ่มงาน" onClick={() => handleActionSelect('เข้างาน')} />
        <ActionBtn color="bg-[#C6F45D]" textColor="text-[#222222]" pillColor="bg-white/60 text-[#222222]" icon={<CupIcon className="w-32 h-32 text-[#222222]/90" />} title="พักเที่ยง" subtitle="พักทานข้าว" onClick={() => handleActionSelect('พักเที่ยง')} />
        <ActionBtn color="bg-[#FDD5F5]" textColor="text-[#222222]" pillColor="bg-white/60 text-[#222222]" icon={<BriefcaseIcon className="w-32 h-32 text-[#222222]/90" />} title="กลับจากพัก" subtitle="เริ่มช่วงบ่าย" onClick={() => handleActionSelect('กลับจากพัก')} />
        <ActionBtn color="bg-[#7B8CFA]" textColor="text-white" pillColor="bg-white/20 text-white" icon={<LogoutIcon className="w-32 h-32 text-white/90" />} title="ออกงาน" subtitle="เลิกงาน" onClick={() => handleActionSelect('ออกงาน')} />
      </div>
    </div>
  );

  const renderLoadingScreen = () => (
    <div className="flex flex-col items-center justify-center h-full w-full animate-fade-in">
       <div className="bg-white p-12 rounded-[3rem] shadow-sm flex flex-col items-center">
         <div className="w-20 h-20 border-[6px] border-[#F2F2F2] border-t-[#7B8CFA] rounded-full animate-spin mb-8"></div>
         <h1 className="text-4xl font-bold text-[#222222]">กำลังประมวลผล</h1>
         <div className="bg-[#F2F2F2] text-slate-600 px-6 py-2 rounded-full mt-6 text-xl font-medium">บันทึกเวลา {selectedAction}</div>
       </div>
    </div>
  );

  const renderSuccessScreen = () => (
    <div className="flex flex-col items-center justify-center h-full w-full animate-pop-in px-8">
      <div className="bg-[#C6F45D] p-12 rounded-[3rem] shadow-lg border border-[#b8e84e] w-full max-w-2xl text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/30 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="bg-[#222222] text-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-5xl font-bold text-[#222222] mb-8">บันทึกสำเร็จ!</h1>
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-[2rem] text-center inline-block min-w-[300px]">
            <p className="text-2xl font-bold text-[#222222] mb-1">{selectedAction}</p>
            <p className="text-3xl text-slate-800 font-medium">{formatTime(currentTime)} น.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFallbackScreen = () => (
    <div className="flex flex-col items-center justify-start h-full w-full pt-10 px-8 animate-fade-in">
       <div className="flex justify-between w-full max-w-5xl items-center mb-8 bg-white p-4 pr-6 pl-8 rounded-full shadow-sm relative z-20">
         <h1 className="text-3xl font-bold text-[#222222]">ระบุชื่อด้วยตัวเอง</h1>
         <button onClick={resetFlow} className="bg-[#F2F2F2] text-[#222222] px-6 py-3 rounded-full text-lg font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation">กลับหน้าแรก</button>
       </div>
       <div className="grid grid-cols-4 gap-5 w-full max-w-5xl overflow-y-auto pb-10 relative z-20">
          {Array.from({ length: 16 }).map((_, i) => (
             <button 
              key={i} 
              onClick={() => setCurrentStep('ACTION')} 
              className="bg-white p-6 rounded-[2rem] flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform active:bg-slate-50 cursor-pointer shadow-sm border border-transparent hover:border-[#7B8CFA] touch-manipulation w-full"
             >
               <div className="text-2xl font-bold text-slate-500 bg-[#F2F2F2] w-20 h-20 rounded-full flex items-center justify-center">พ{i+1}</div>
               <span className="text-xl font-bold text-[#222222]">พนักงาน {i+1}</span>
             </button>
          ))}
       </div>
    </div>
  );

  // --- ADMIN SCREENS ---
  const renderAdminDashboard = () => (
    <div className="flex flex-col h-full w-full px-8 pt-6 pb-10 animate-fade-in" onClick={resetAdminTimeout}>
      {/* Admin Header */}
      <div className="flex justify-between items-center bg-white p-4 pr-6 pl-8 rounded-full shadow-sm mb-6 w-full max-w-7xl mx-auto border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-[#222222] text-white p-2.5 rounded-full"><LockIcon className="w-6 h-6" /></div>
          <h1 className="text-2xl font-bold text-[#222222]">ผู้ดูแลระบบ (Admin)</h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-[#F2F2F2] p-1.5 rounded-full">
          <button onClick={() => setAdminTab('LOG')} className={`flex items-center gap-2 px-6 py-2 rounded-full text-lg font-bold transition-all ${adminTab === 'LOG' ? 'bg-white text-[#222222] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <DocumentIcon className="w-5 h-5" /> ประวัติลงเวลา
          </button>
          <button onClick={() => setAdminTab('PAYROLL')} className={`flex items-center gap-2 px-6 py-2 rounded-full text-lg font-bold transition-all ${adminTab === 'PAYROLL' ? 'bg-white text-[#222222] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <CashIcon className="w-5 h-5" /> สรุปค่าแรง (รายสัปดาห์)
          </button>
        </div>

        <button onClick={handleExitAdmin} className="bg-[#EF4444] text-white px-6 py-2.5 rounded-full text-lg font-medium active:scale-95 transition-transform">
          ออกจากระบบ
        </button>
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 overflow-hidden flex flex-col">
        {adminTab === 'LOG' ? (
          <>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-3xl font-bold text-[#222222] mb-1">Attendance Log</h2>
                <p className="text-slate-500 text-lg">รายการลงเวลาของพนักงานทั้งหมด</p>
              </div>
              <div className="bg-[#F2F2F2] px-4 py-2 rounded-full text-slate-600 font-medium">สัปดาห์นี้: 01-07 เม.ย. 26</div>
            </div>
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
                  {MOCK_LOGS.map(log => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-700">{log.date}</td>
                      <td className="p-4 font-mono text-slate-500">{log.empId}</td>
                      <td className="p-4 font-bold text-[#222222]">{log.name}</td>
                      <td className="p-4 text-center font-mono">{log.in}</td>
                      <td className="p-4 text-center font-mono text-slate-400">{log.bOut}</td>
                      <td className="p-4 text-center font-mono text-slate-400">{log.bIn}</td>
                      <td className="p-4 text-center font-mono">{log.out}</td>
                      <td className="p-4 text-center font-bold text-[#7B8CFA]">{log.hours}</td>
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
          </>
        ) : (
          <>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-3xl font-bold text-[#222222] mb-1">Weekly Payroll</h2>
                <p className="text-slate-500 text-lg">สรุปค่าแรงรายสัปดาห์</p>
              </div>
              <button className="bg-[#C6F45D] text-[#222222] px-6 py-2.5 rounded-full font-bold shadow-sm active:scale-95 transition-transform">
                Export to CSV
              </button>
            </div>
            <div className="overflow-auto flex-1 rounded-2xl border border-slate-100 mb-6">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8FAFC] text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-4 font-bold border-b border-slate-100">รหัส</th>
                    <th className="p-4 font-bold border-b border-slate-100">ชื่อ-สกุล</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-center">วันทำงาน</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-center">ชม.รวม</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-right">เรทค่าแรง</th>
                    <th className="p-4 font-bold border-b border-slate-100 text-right">ยอดรวมที่ต้องจ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PAYROLL.map((pay, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-slate-500">{pay.empId}</td>
                      <td className="p-4 font-bold text-[#222222]">{pay.name}</td>
                      <td className="p-4 text-center font-bold text-slate-700">{pay.days} วัน</td>
                      <td className="p-4 text-center text-slate-600">{pay.hours} ชม.</td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-slate-700">฿{pay.rate}</span>
                        <span className="text-sm text-slate-400 ml-1">/{pay.rateType === 'daily' ? 'วัน' : 'ชม.'}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-2xl text-[#222222]">{formatMoney(pay.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Payroll Summary Footer */}
            <div className="bg-[#F8FAFC] p-6 rounded-2xl flex justify-between items-center">
               <div className="text-slate-500 font-medium">รวมยอดจ่ายทั้งหมด (3 พนักงาน)</div>
               <div className="text-4xl font-bold text-[#7B8CFA]">฿ 6,825.00</div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // --- Subcomponents ---
  const ActionBtn = ({ color, textColor, icon, title, subtitle, onClick, pillColor }) => (
    <button 
      onClick={onClick}
      className={`${color} ${textColor} p-8 rounded-[2.5rem] shadow-sm flex flex-col items-start justify-between relative overflow-hidden transition-transform active:scale-[0.98] active:brightness-95 text-left cursor-pointer touch-manipulation`}
      style={{ height: '260px' }}
    >
      <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-white/10 rounded-full mix-blend-overlay blur-xl pointer-events-none"></div>
      <div className="z-10 w-full pointer-events-none">
        <h2 className="text-[2.5rem] font-bold tracking-tight mb-4 leading-none">{title}</h2>
        <div className={`${pillColor} px-5 py-2 rounded-full inline-block text-lg font-medium backdrop-blur-sm`}>{subtitle}</div>
      </div>
      <div className="absolute -bottom-2 -right-2 opacity-90 drop-shadow-lg z-0 pointer-events-none">
         <div className="w-40 h-40 flex items-center justify-center">{icon}</div>
      </div>
    </button>
  );

  const renderPinModal = () => (
    <div className="fixed inset-0 bg-[#222222]/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in" onClick={() => {setShowPinModal(false); setPinInput('');}}>
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-[400px] flex flex-col items-center relative z-[110]" onClick={e => e.stopPropagation()}>
        <div className="bg-[#F2F2F2] p-4 rounded-full text-[#222222] mb-6"><LockIcon className="w-8 h-8" /></div>
        <h2 className="text-3xl font-bold text-[#222222] mb-2">รหัสผู้ดูแลระบบ</h2>
        <p className="text-slate-500 mb-8">กรุณาใส่ PIN เพื่อเข้าสู่หน้ารายงาน</p>
        
        {/* PIN Indicators */}
        <div className={`flex gap-4 mb-10 ${pinError ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-6 h-6 rounded-full transition-all duration-200 ${i < pinInput.length ? 'bg-[#7B8CFA] scale-110' : 'bg-slate-200'}`}></div>
          ))}
        </div>

        {pinError && <p className="text-red-500 font-bold mb-4 -mt-4 animate-fade-in">รหัส PIN ไม่ถูกต้อง</p>}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handlePinPress(num.toString())} className="bg-[#F8FAFC] hover:bg-[#F2F2F2] active:bg-[#E2E8F0] text-3xl font-bold text-[#222222] py-6 rounded-full transition-colors select-none cursor-pointer touch-manipulation">
              {num}
            </button>
          ))}
          <button onClick={() => {setShowPinModal(false); setPinInput('');}} className="text-slate-400 font-bold text-xl rounded-full hover:bg-slate-50 select-none cursor-pointer touch-manipulation">ยกเลิก</button>
          <button onClick={() => handlePinPress('0')} className="bg-[#F8FAFC] hover:bg-[#F2F2F2] active:bg-[#E2E8F0] text-3xl font-bold text-[#222222] py-6 rounded-full transition-colors select-none cursor-pointer touch-manipulation">0</button>
          <button onClick={handlePinDelete} className="text-slate-400 flex items-center justify-center rounded-full hover:bg-slate-50 select-none cursor-pointer touch-manipulation">
            <svg className="w-10 h-10 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans flex flex-col overflow-hidden select-none relative">
      
      {/* Top Header Bar */}
      <header className="relative z-[60] px-8 py-6 flex justify-between items-center w-full max-w-7xl mx-auto">
        <div className="flex gap-4 items-center">
          {/* Hidden Admin Entry Button */}
          {appMode === 'KIOSK' && (
            <button 
              onClick={() => setShowPinModal(true)}
              className="bg-white/80 hover:bg-white text-slate-400 hover:text-[#7B8CFA] p-3 rounded-full transition-all shadow-md relative z-[60] cursor-pointer touch-manipulation"
            >
              <LockIcon className="w-5 h-5" />
            </button>
          )}
          
          <div className="bg-[#7B8CFA] text-white px-6 py-2.5 rounded-full shadow-sm flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
            <span className="text-xl font-bold tracking-wide">SkoolUp Kiosk</span>
          </div>
        </div>
        
        <div className="bg-[#222222] text-white px-6 py-2.5 rounded-full shadow-sm flex items-center gap-4">
          <div className="text-xl font-medium opacity-80">{formatDate(currentTime)}</div>
          <div className="text-2xl font-bold font-mono tracking-tighter">{formatTime(currentTime)}</div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 flex items-center justify-center pb-12">
        {appMode === 'KIOSK' ? (
          <>
            {currentStep === 'IDLE' && renderIdleScreen()}
            {currentStep === 'SCANNING' && renderScanningScreen()}
            {currentStep === 'MATCHED' && renderMatchedScreen()}
            {currentStep === 'ACTION' && renderActionScreen()}
            {currentStep === 'LOADING' && renderLoadingScreen()}
            {currentStep === 'SUCCESS' && renderSuccessScreen()}
            {currentStep === 'FALLBACK' && renderFallbackScreen()}
          </>
        ) : (
          renderAdminDashboard()
        )}
      </main>

      {/* PIN Modal Overlay */}
      {showPinModal && renderPinModal()}

      {/* Custom Tailwind Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;700&display=swap');
        * { 
          -webkit-tap-highlight-color: transparent; 
        }
        body { 
          font-family: 'Kanit', sans-serif; 
          touch-action: manipulation;
        }
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(200%); } }
        .animate-scan { animation: scan 2s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.9); } 50% { transform: scale(1.02); } 100% { opacity: 1; transform: scale(1); } }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}} />
    </div>
  );
}