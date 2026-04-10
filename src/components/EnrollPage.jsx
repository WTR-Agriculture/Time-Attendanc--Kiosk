// ============================================================
//  EnrollPage — ลงทะเบียนใบหน้าพนักงาน (Server-side InsightFace)
//  Flow: 5 ท่า auto-capture → ส่ง base64 ไป server → บันทึก
//  Props:
//    employees        - รายชื่อพนักงานทั้งหมด
//    initialEmployee  - pre-select พนักงาน (ข้ามหน้าเลือก)
//    onDone           - callback() เมื่อ enroll สำเร็จ
//    onBack           - callback() กลับหน้า admin
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceApi from '../lib/faceApi';
import * as api     from '../lib/api';

// ============================================================
//  3 ท่าที่ต้องสแกน
// ============================================================
const FaceFrontIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" />
    <path d="M3 20c0-4 4-7 9-7s9 3 9 7" />
    <circle cx="10" cy="8" r="0.8" fill={color} stroke="none" />
    <circle cx="14" cy="8" r="0.8" fill={color} stroke="none" />
    <path d="M10 10.5c.5.7 1.5.7 2 0" strokeWidth="1.5" />
  </svg>
);

const FaceLeftIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13" cy="8" r="5" />
    <path d="M4 20c0-4 4-7 9-7s9 3 9 7" />
    <circle cx="11" cy="7.5" r="0.8" fill={color} stroke="none" />
    <circle cx="14.5" cy="7.5" r="0.8" fill={color} stroke="none" />
    <path d="M3 10l-2.5-2.5L3 5" strokeWidth="1.8" />
    <line x1="0.5" y1="7.5" x2="7" y2="7.5" />
  </svg>
);

const FaceRightIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="8" r="5" />
    <path d="M2 20c0-4 4-7 9-7s9 3 9 7" />
    <circle cx="9.5" cy="7.5" r="0.8" fill={color} stroke="none" />
    <circle cx="13" cy="7.5" r="0.8" fill={color} stroke="none" />
    <path d="M21 10l2.5-2.5L21 5" strokeWidth="1.8" />
    <line x1="23.5" y1="7.5" x2="17" y2="7.5" />
  </svg>
);

const POSES = [
  { id: 'front', label: 'หน้าตรง',  Icon: FaceFrontIcon, hint: 'มองตรงเข้ากล้อง' },
  { id: 'left',  label: 'หันซ้าย', Icon: FaceLeftIcon,  hint: 'หันหน้าไปทางซ้ายเล็กน้อย' },
  { id: 'right', label: 'หันขวา',  Icon: FaceRightIcon, hint: 'หันหน้าไปทางขวาเล็กน้อย' },
];

const CAPTURE_DELAY_MS = 600; // ms หลังเจอหน้าก่อน capture

// ============================================================
//  Helper: capture video frame → base64 JPEG
// ============================================================
function captureBase64(videoEl, quality = 0.8) {
  const maxSize = 320;
  const scale = Math.min(1, maxSize / Math.max(videoEl.videoWidth, videoEl.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(videoEl.videoWidth  * scale);
  canvas.height = Math.round(videoEl.videoHeight * scale);
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

// ============================================================
//  Main Component
// ============================================================
export default function EnrollPage({ employees = [], initialEmployee = null, onDone, onBack }) {
  const [selectedEmp, setSelectedEmp] = useState(initialEmployee);
  const [step,        setStep]        = useState(initialEmployee ? 'SCAN' : 'SELECT');

  // SCAN state
  const [poseIndex,   setPoseIndex]   = useState(0);   // 0-4
  const [captured,    setCaptured]    = useState([]);   // base64 strings
  const [faceFound,   setFaceFound]   = useState(false);
  const [countdown,   setCountdown]   = useState(null); // ms remaining
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState(null);

  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const mountedRef    = useRef(true);
  const detectTimer   = useRef(null);
  const captureTimer  = useRef(null);
  const countRef      = useRef(null); // interval สำหรับ countdown

  // ============================================================
  //  Camera
  // ============================================================
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearTimeout(detectTimer.current);
    clearTimeout(captureTimer.current);
    clearInterval(countRef.current);
  }, []);

  // ============================================================
  //  Detection loop
  // ============================================================
  const detect = useCallback(async () => {
    if (!mountedRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      detectTimer.current = setTimeout(detect, 400);
      return;
    }
    const result = await faceApi.detectFace(video);
    if (!mountedRef.current) return;

    setFaceFound(!!result);
    detectTimer.current = setTimeout(detect, 600);
  }, []);

  // ============================================================
  //  เมื่อ step = SCAN → เปิดกล้อง + เริ่ม detect
  // ============================================================
  useEffect(() => {
    mountedRef.current = true;
    if (step === 'SCAN') {
      startCamera().then(() => detect());
    }
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [step]);

  // ============================================================
  //  เมื่อเจอหน้า → เริ่ม countdown แล้ว auto-capture
  // ============================================================
  useEffect(() => {
    if (step !== 'SCAN' || saving || saved) return;

    if (faceFound) {
      // เริ่ม countdown
      let remaining = CAPTURE_DELAY_MS;
      setCountdown(remaining);
      countRef.current = setInterval(() => {
        remaining -= 100;
        if (remaining <= 0) {
          clearInterval(countRef.current);
          setCountdown(null);
        } else {
          setCountdown(remaining);
        }
      }, 100);

      captureTimer.current = setTimeout(async () => {
        if (!mountedRef.current || !videoRef.current) return;
        const b64 = captureBase64(videoRef.current);
        const next = [...captured, b64];
        setCaptured(next);
        setFaceFound(false);

        if (next.length >= POSES.length) {
          // ครบทุกท่า → บันทึก
          await handleSave(next);
        } else {
          setPoseIndex(next.length);
        }
      }, CAPTURE_DELAY_MS);
    } else {
      // ไม่เจอหน้า → ยกเลิก countdown
      clearTimeout(captureTimer.current);
      clearInterval(countRef.current);
      setCountdown(null);
    }

    return () => {
      clearTimeout(captureTimer.current);
      clearInterval(countRef.current);
    };
  }, [faceFound, step]);

  // ============================================================
  //  Save
  // ============================================================
  const handleSave = async (images) => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.enrollFace(selectedEmp.employeeId, images);
      setSaved(true);
      stopCamera();
      setTimeout(() => { onDone(); }, 2000);
    } catch (err) {
      setSaveError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      console.error(err);
      // reset scan
      setCaptured([]);
      setPoseIndex(0);
      setSaving(false);
    }
  };

  const handleRetry = () => {
    setSaveError(null);
    setCaptured([]);
    setPoseIndex(0);
    setFaceFound(false);
    setCountdown(null);
    setSaving(false);
    setSaved(false);
    detect();
  };

  // ============================================================
  //  SELECT step
  // ============================================================
  if (step === 'SELECT') {
    return (
      <div className="flex flex-col w-full self-stretch px-6 pt-4 pb-6 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-sm mb-4 border border-slate-100 px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-[#222222]">เลือกพนักงานที่จะลงทะเบียน</h1>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex-1">
          {employees.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400">ยังไม่มีพนักงาน</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {employees.map(emp => (
                <button key={emp.employeeId}
                  onClick={() => { setSelectedEmp(emp); setStep('SCAN'); }}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer text-left">
                  <div className="w-10 h-10 rounded-full bg-[#7B8CFA]/10 flex items-center justify-center text-[#7B8CFA] font-bold text-sm">
                    {emp.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#222222]">{emp.name}</p>
                    <p className="text-sm text-slate-400">{emp.employeeId} · {emp.department || '-'}</p>
                  </div>
                  {emp.faceDescriptorJson && (
                    <span className="ml-auto text-xs bg-green-100 text-green-600 px-2.5 py-1 rounded-full font-medium">ลงทะเบียนแล้ว</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  //  SCAN step
  // ============================================================
  const currentPose = POSES[poseIndex];
  const progress    = (captured.length / POSES.length) * 100;

  return (
    <div className="flex flex-col w-full self-stretch px-4 pt-4 pb-6 items-center animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm mb-4 w-full border border-slate-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { stopCamera(); onBack(); }} className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="font-bold text-[#222222]">ลงทะเบียน: {selectedEmp?.name}</p>
            <p className="text-sm text-slate-400">{selectedEmp?.department}</p>
          </div>
        </div>
        {!initialEmployee && (
          <button onClick={() => { stopCamera(); setStep('SELECT'); setCaptured([]); setPoseIndex(0); }}
            className="text-slate-400 text-sm cursor-pointer">← เปลี่ยนคน</button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-4 max-w-md">
        <div className="bg-[#7B8CFA] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Pose steps */}
      <div className="flex gap-2 mb-4 justify-center">
        {POSES.map((p, i) => (
          <div key={p.id}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-center
              ${i < captured.length ? 'bg-green-100 text-green-600'
                : i === poseIndex && !saving && !saved ? 'bg-[#7B8CFA] text-white scale-105'
                : 'bg-slate-100 text-slate-400'}`}>
            <p.Icon size={22} color="currentColor" />
            <span className="text-xs font-medium whitespace-nowrap">{p.label}</span>
            {i < captured.length && <span className="text-xs font-bold">✓</span>}
          </div>
        ))}
      </div>

      {/* Camera */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg bg-black mb-4"
        style={{ width: '100%', maxWidth: 420, aspectRatio: '4/3' }}>
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />

        {/* Face indicator */}
        {!saving && !saved && (
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
            <div className={`w-48 h-56 rounded-full border-4 transition-colors duration-300
              ${faceFound && countdown !== null ? 'border-[#C6F45D] shadow-[0_0_20px_#C6F45D80]' : faceFound ? 'border-[#C6F45D]' : 'border-white/30'}`} />
          </div>
        )}

        {/* Countdown overlay */}
        {countdown !== null && !saving && !saved && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="bg-black/60 text-white text-sm font-bold px-4 py-1.5 rounded-full">
              กำลังจับภาพ...
            </div>
          </div>
        )}

        {/* Saving overlay */}
        {saving && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="font-bold">กำลังบันทึก...</p>
            </div>
          </div>
        )}

        {/* Done overlay */}
        {saved && (
          <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-5xl mb-2">✓</div>
              <p className="font-bold text-xl">ลงทะเบียนสำเร็จ!</p>
            </div>
          </div>
        )}
      </div>

      {/* Instruction */}
      {!saving && !saved && !saveError && (
        <div className={`text-center px-4 py-3 rounded-2xl w-full max-w-md
          ${faceFound ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'}`}>
          <div className="flex justify-center mb-1"><currentPose.Icon size={32} color="currentColor" /></div>
          <p className="font-bold text-lg">{currentPose.label}</p>
          <p className="text-sm">{currentPose.hint}</p>
          {!faceFound && <p className="text-sm mt-1 opacity-70">รอตรวจจับใบหน้า...</p>}
          {faceFound && <p className="text-sm mt-1 font-medium">เจอหน้าแล้ว! นิ่งๆ สักครู่...</p>}
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 w-full max-w-md text-center">
          <p className="text-red-600 font-bold mb-3">{saveError}</p>
          <button onClick={handleRetry}
            className="bg-red-500 text-white px-6 py-2.5 rounded-full font-bold cursor-pointer">
            ลองใหม่
          </button>
        </div>
      )}

      {/* Captured thumbnails */}
      {captured.length > 0 && !saved && (
        <div className="flex gap-2 mt-4 justify-center">
          {captured.map((_, i) => {
            const P = POSES[i];
            return (
              <div key={i}
                className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center text-green-600">
                <P.Icon size={18} color="currentColor" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
