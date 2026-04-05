// ============================================================
//  EnrollPage — ลงทะเบียนใบหน้าพนักงาน (Admin เท่านั้น)
//  Flow: เลือกพนักงาน → เปิดกล้อง → ถ่าย 5 รูป → บันทึก
//  Props:
//    employees     - รายชื่อพนักงานทั้งหมด
//    onDone        - callback() เมื่อ enroll สำเร็จ (refresh employees)
//    onBack        - callback() กลับหน้า admin
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceApi from '../lib/faceApi';
import * as api     from '../lib/api';

const REQUIRED_CAPTURES = 5;

function getInitials(name = '') {
  const p = name.trim().split(' ');
  return p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2);
}

// ============================================================
//  CameraCapture — กล้องสำหรับ enroll (sub-component)
// ============================================================
function CameraCapture({ onCapture, captureCount }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const mountedRef  = useRef(true);
  const detectTimer = useRef(null);

  const [camReady, setCamReady]   = useState(false);
  const [faceFound, setFaceFound] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // ตรวจจับหน้าต่อเนื่อง
  const detect = useCallback(async () => {
    if (!mountedRef.current || !videoRef.current || !camReady) return;
    const result = await faceApi.detectFace(videoRef.current);
    if (mountedRef.current) {
      setFaceFound(!!result);
      detectTimer.current = setTimeout(detect, 600);
    }
  }, [camReady]);

  useEffect(() => {
    if (camReady) detect();
    return () => clearTimeout(detectTimer.current);
  }, [camReady, detect]);

  // เริ่มกล้อง
  useEffect(() => {
    mountedRef.current = true;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    }).then(stream => {
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setCamReady(true);
    }).catch(() => {});

    return () => {
      mountedRef.current = false;
      clearTimeout(detectTimer.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ถ่ายรูป + compute descriptor
  const handleCapture = async () => {
    if (!faceFound || capturing || !videoRef.current) return;
    setCapturing(true);
    try {
      // วาดลง canvas
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0);
      ctx.restore();

      // detect จาก canvas (mirror แล้ว)
      const detection = await faceApi.detectFace(canvas);
      if (!detection) {
        alert('ตรวจจับใบหน้าไม่สำเร็จ ลองใหม่อีกครั้ง');
        return;
      }

      const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
      onCapture({ descriptor: detection.descriptor, thumbnail });
    } finally {
      setCapturing(false);
    }
  };

  const borderColor = faceFound ? 'border-[#C6F45D]' : 'border-slate-300';

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Camera view */}
      <div className={`relative w-72 h-72 rounded-[2.5rem] overflow-hidden border-[6px] ${borderColor} bg-black shadow-md transition-colors`}>
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* กรอบมุม */}
        <div className="absolute inset-3 pointer-events-none">
          {['tl','tr','bl','br'].map(pos => (
            <div key={pos} className={`absolute w-7 h-7 ${
              pos === 'tl' ? 'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg' :
              pos === 'tr' ? 'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg' :
              pos === 'bl' ? 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg' :
                             'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg'
            } ${faceFound ? 'border-[#C6F45D]' : 'border-slate-400'} transition-colors`} />
          ))}
        </div>

        {/* Face status overlay */}
        <div className={`absolute bottom-3 left-3 right-3 py-2 rounded-full text-center text-sm font-bold transition-all ${
          faceFound ? 'bg-[#C6F45D] text-[#222222]' : 'bg-black/50 text-white'
        }`}>
          {faceFound ? '✓ พบใบหน้า — พร้อมถ่าย' : 'หันหน้าตรงเข้ากล้อง'}
        </div>
      </div>

      {/* Capture button */}
      <button
        onClick={handleCapture}
        disabled={!faceFound || capturing}
        className={`px-12 py-5 rounded-full text-2xl font-bold transition-all touch-manipulation ${
          faceFound && !capturing
            ? 'bg-[#7B8CFA] text-white shadow-md active:scale-95'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        {capturing ? 'กำลังประมวลผล...' : `ถ่ายรูป (${captureCount}/${REQUIRED_CAPTURES})`}
      </button>

      <p className="text-slate-400 text-lg">ถ่ายหลายมุม: ตรง, เงยเล็กน้อย, หันซ้าย, หันขวา, ยิ้ม</p>
    </div>
  );
}

// ============================================================
//  EnrollPage main component
// ============================================================
export default function EnrollPage({ employees, onDone, onBack }) {
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [captures, setCaptures]       = useState([]);   // [{ descriptor, thumbnail }]
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState(null);
  const [step, setStep]               = useState('SELECT'); // SELECT | CAPTURE | DONE

  const handleCapture = (data) => {
    setCaptures(prev => {
      const next = [...prev, data];
      return next;
    });
  };

  // เมื่อถ่ายครบ 5 รูป → save อัตโนมัติ
  useEffect(() => {
    if (captures.length === REQUIRED_CAPTURES && step === 'CAPTURE') {
      handleSave(captures);
    }
  }, [captures, step]);

  const handleSave = async (captureList) => {
    if (!selectedEmp) return;
    setSaving(true);
    setSaveError(null);
    try {
      const descriptors = captureList.map(c => c.descriptor);
      const json = faceApi.serializeDescriptors(descriptors);
      await api.enrollFace(selectedEmp.employeeId, json);
      setSaved(true);
      setStep('DONE');
    } catch (err) {
      setSaveError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedEmp(null);
    setCaptures([]);
    setSaved(false);
    setSaveError(null);
    setStep('SELECT');
  };

  // ============================================================
  //  STEP: SELECT — เลือกพนักงาน
  // ============================================================
  if (step === 'SELECT') {
    return (
      <div className="flex flex-col h-full w-full px-8 pt-6 pb-10 animate-fade-in">
        <div className="flex justify-between items-center mb-8 w-full max-w-5xl mx-auto">
          <div>
            <h1 className="text-4xl font-bold text-[#222222]">ลงทะเบียนใบหน้า</h1>
            <p className="text-slate-400 text-xl mt-1">เลือกพนักงานที่ต้องการลงทะเบียน</p>
          </div>
          <button
            onClick={onBack}
            className="bg-[#F2F2F2] text-[#222222] px-6 py-3 rounded-full text-lg font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation"
          >
            ← กลับ
          </button>
        </div>

        <div className="grid grid-cols-4 gap-5 w-full max-w-5xl mx-auto overflow-y-auto pb-4">
          {employees.map(emp => {
            const hasDescriptor = !!emp.faceDescriptorJson;
            return (
              <button
                key={emp.employeeId}
                onClick={() => { setSelectedEmp(emp); setStep('CAPTURE'); }}
                className="bg-white p-6 rounded-[2rem] flex flex-col items-center gap-4 active:scale-95 transition-transform cursor-pointer shadow-sm border-2 border-transparent hover:border-[#7B8CFA] touch-manipulation relative"
              >
                {/* badge ถ้า enrolled แล้ว */}
                {hasDescriptor && (
                  <div className="absolute top-3 right-3 bg-[#C6F45D] text-[#222222] text-xs font-bold px-2 py-0.5 rounded-full">
                    ✓ enrolled
                  </div>
                )}
                <div className="text-2xl font-bold text-slate-500 bg-[#F2F2F2] w-20 h-20 rounded-full flex items-center justify-center">
                  {getInitials(emp.name)}
                </div>
                <span className="text-xl font-bold text-[#222222] text-center leading-tight">{emp.name}</span>
                <span className="text-sm text-slate-400">{emp.department}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================
  //  STEP: CAPTURE — ถ่ายรูป
  // ============================================================
  if (step === 'CAPTURE') {
    return (
      <div className="flex flex-col h-full w-full items-center px-8 pt-6 pb-10 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 w-full max-w-3xl">
          <div>
            <h1 className="text-3xl font-bold text-[#222222]">
              ลงทะเบียน: {selectedEmp?.name}
            </h1>
            <p className="text-slate-400 text-lg mt-1">{selectedEmp?.department}</p>
          </div>
          <button
            onClick={handleReset}
            className="bg-[#F2F2F2] text-[#222222] px-6 py-3 rounded-full text-lg font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation"
          >
            ← เปลี่ยนคน
          </button>
        </div>

        {/* Camera */}
        {!saving && !saved && (
          <CameraCapture
            onCapture={handleCapture}
            captureCount={captures.length}
          />
        )}

        {/* Saving state */}
        {saving && (
          <div className="flex flex-col items-center gap-6 mt-10">
            <div className="w-20 h-20 border-[6px] border-[#F2F2F2] border-t-[#7B8CFA] rounded-full animate-spin" />
            <p className="text-2xl font-bold text-[#222222]">กำลังบันทึก...</p>
          </div>
        )}

        {saveError && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl text-center">
            <p className="text-xl font-bold mb-3">{saveError}</p>
            <button
              onClick={() => handleSave(captures)}
              className="bg-red-500 text-white px-8 py-3 rounded-full font-bold cursor-pointer touch-manipulation"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Thumbnails */}
        {captures.length > 0 && !saving && (
          <div className="flex gap-3 mt-6 flex-wrap justify-center">
            {captures.map((c, i) => (
              <div key={i} className="relative">
                <img
                  src={c.thumbnail}
                  alt={`capture ${i+1}`}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C6F45D]"
                />
                <div className="absolute -top-1 -right-1 bg-[#C6F45D] text-[#222222] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {i+1}
                </div>
              </div>
            ))}
            {Array.from({ length: REQUIRED_CAPTURES - captures.length }).map((_, i) => (
              <div key={`empty-${i}`} className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50" />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  //  STEP: DONE — สำเร็จ
  // ============================================================
  return (
    <div className="flex flex-col h-full w-full items-center justify-center px-8 animate-pop-in">
      <div className="bg-[#C6F45D] p-12 rounded-[3rem] shadow-lg w-full max-w-xl text-center">
        <div className="bg-[#222222] text-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-[#222222] mb-4">ลงทะเบียนสำเร็จ!</h1>
        <p className="text-2xl text-[#222222]/70 mb-10">{selectedEmp?.name}</p>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => { handleReset(); }}
            className="w-full bg-[#222222] text-white py-5 rounded-full text-2xl font-bold active:scale-95 transition-transform cursor-pointer touch-manipulation"
          >
            ลงทะเบียนคนถัดไป
          </button>
          <button
            onClick={() => { onDone?.(); onBack?.(); }}
            className="w-full bg-white/60 text-[#222222] py-4 rounded-full text-xl font-medium active:scale-95 transition-transform cursor-pointer touch-manipulation"
          >
            กลับหน้า Admin
          </button>
        </div>
      </div>
    </div>
  );
}
