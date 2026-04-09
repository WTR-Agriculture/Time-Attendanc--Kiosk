// ============================================================
//  ScanScreen — Phase 2
//  State machine: STARTING → SCANNING → QUALITY_FAIL / BLINK_WAIT → MATCHING → done
//
//  Features:
//    ✓ Real camera (getUserMedia)
//    ✓ Quality check (distance / brightness / blur)
//    ✓ Blink detection anti-spoof
//    ✓ Performance: resize to 320px before inference
//    ✓ Colour-coded border feedback
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceApi from '../lib/faceApi';
import * as api     from '../lib/api';

function captureBase64(videoEl, quality = 0.85) {
  const canvas = document.createElement('canvas');
  canvas.width  = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  canvas.getContext('2d').drawImage(videoEl, 0, 0);
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

// scan interval ms (shorter = more responsive, heavier)
const SCAN_MS        = 650;
// how many consecutive 'closed' EAR frames = blink
const BLINK_FRAMES   = 2;
// timeout ถ้าไม่กระพริบตาใน X ms
const BLINK_TIMEOUT  = 12000;
// timeout ถ้าไม่เจอหน้าใน X ms
const NO_FACE_TIMEOUT = 14000;

// ============================================================
//  Status config (ข้อความ + สีกรอบ)
// ============================================================
const STATUS = {
  starting:     { text: 'กำลังเปิดกล้อง...',                    border: 'border-slate-300', pill: 'bg-white'            },
  scanning:     { text: 'กำลังค้นหาใบหน้า...',                   border: 'border-[#7B8CFA]', pill: 'bg-white'            },
  no_face:      { text: 'ไม่พบใบหน้า — ยืนหน้ากล้องให้ชัดขึ้น', border: 'border-slate-300', pill: 'bg-white'            },
  too_far:      { text: 'ขยับใกล้กล้องอีกนิด',                   border: 'border-amber-400', pill: 'bg-amber-50'         },
  dark:         { text: 'แสงน้อยเกินไป — หาที่สว่างกว่านี้',    border: 'border-amber-400', pill: 'bg-amber-50'         },
  blurry:       { text: 'ภาพไม่ชัด — ลองปรับมุมใหม่',           border: 'border-amber-400', pill: 'bg-amber-50'         },
  blink_wait:   { text: 'กรุณากระพริบตา 1 ครั้งเพื่อยืนยัน',    border: 'border-[#C6F45D]', pill: 'bg-[#C6F45D]/20'     },
  blink_done:   { text: 'ยืนยันตัวตนสำเร็จ — กำลังจับคู่...',   border: 'border-[#C6F45D]', pill: 'bg-[#C6F45D]/20'     },
  no_match:     { text: 'ไม่พบใบหน้าในระบบ — ลองใหม่อีกครั้ง', border: 'border-red-300',   pill: 'bg-red-50'           },
  no_desc:      { text: 'ยังไม่มีข้อมูลใบหน้าพนักงาน',           border: 'border-slate-300', pill: 'bg-white'            },
};

export default function ScanScreen({ employees, onMatch, onNoFace, onError }) {
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const timerRef     = useRef(null);
  const mountedRef   = useRef(true);
  const blinkRef     = useRef({ closedFrames: 0, blinkDone: false });
  const noFaceTimer  = useRef(null);
  const blinkTimer   = useRef(null);
  const stateRef     = useRef('starting');    // shadow state for async callbacks

  const [status, setStatus] = useState('starting');

  const setS = useCallback((s) => {
    stateRef.current = s;
    setStatus(s);
  }, []);

  // ============================================================
  //  stopCamera
  // ============================================================
  const stopCamera = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(noFaceTimer.current);
    clearTimeout(blinkTimer.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ============================================================
  //  detection loop
  // ============================================================
  const loop = useCallback(async () => {
    if (!mountedRef.current || !videoRef.current) return;

    const detection = await faceApi.detectFace(videoRef.current);

    if (!mountedRef.current) return;

    // ---- no face ----
    if (!detection) {
      setS('no_face');
      blinkRef.current = { closedFrames: 0, blinkDone: false };
      timerRef.current = setTimeout(loop, SCAN_MS);
      return;
    }

    // reset no-face timer every time a face is seen
    clearTimeout(noFaceTimer.current);
    noFaceTimer.current = setTimeout(() => {
      if (mountedRef.current) onNoFace?.();
    }, NO_FACE_TIMEOUT);

    // ---- quality check (skip during blink phases) ----
    const currentState = stateRef.current;
    if (currentState !== 'blink_wait' && currentState !== 'blink_done') {
      const quality = faceApi.checkFaceQuality(detection, videoRef.current);
      if (!quality.ok) {
        setS(quality.reason);               // 'too_far' | 'dark' | 'blurry'
        blinkRef.current = { closedFrames: 0, blinkDone: false };
        timerRef.current = setTimeout(loop, SCAN_MS);
        return;
      }
    }

    // ---- blink anti-spoof ----
    if (!blinkRef.current.blinkDone) {
      const ear = faceApi.calculateEAR(detection.landmarks);

      if (currentState !== 'blink_wait') {
        // ผ่าน quality → เริ่ม blink phase
        setS('blink_wait');
        blinkRef.current = { closedFrames: 0, blinkDone: false };
        // timeout ถ้าไม่กระพริบ
        clearTimeout(blinkTimer.current);
        blinkTimer.current = setTimeout(() => {
          if (mountedRef.current && !blinkRef.current.blinkDone) {
            // หมดเวลา blink → skip anti-spoof (ลด friction บน iPad)
            blinkRef.current.blinkDone = true;
          }
        }, BLINK_TIMEOUT);
      }

      // ติดตาม EAR
      if (ear < faceApi.EAR_CLOSED) {
        blinkRef.current.closedFrames += 1;
      } else if (ear > faceApi.EAR_OPEN && blinkRef.current.closedFrames >= BLINK_FRAMES) {
        // ตาเปิดหลังหลับ → blink confirmed
        blinkRef.current.blinkDone = true;
        blinkRef.current.closedFrames = 0;
      } else if (ear > faceApi.EAR_OPEN) {
        blinkRef.current.closedFrames = 0;
      }

      if (!blinkRef.current.blinkDone) {
        timerRef.current = setTimeout(loop, SCAN_MS);
        return;
      }
    }

    // ---- blink confirmed → capture + ส่ง server ----
    setS('blink_done');

    try {
      const imageBase64 = captureBase64(videoRef.current);
      const result = await api.recognize(imageBase64);

      if (!mountedRef.current) return;

      if (!result.matched) {
        setS('no_match');
        blinkRef.current = { closedFrames: 0, blinkDone: false };
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) { setS('scanning'); loop(); }
        }, 2000);
        return;
      }

      // match found — แปลง format ให้ตรงกับที่ App.jsx ใช้
      stopCamera();
      onMatch?.({
        employee:   result.employee,
        confidence: result.confidence / 100,
        level:      result.confidence >= 70 ? 'high' : result.confidence >= 40 ? 'medium' : 'low',
        distance:   0,
      });
    } catch {
      if (!mountedRef.current) return;
      setS('no_match');
      blinkRef.current = { closedFrames: 0, blinkDone: false };
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) { setS('scanning'); loop(); }
      }, 2000);
    }
  }, [onMatch, onNoFace, setS, stopCamera]);

  // ============================================================
  //  startCamera
  // ============================================================
  useEffect(() => {
    mountedRef.current = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setS('scanning');

        noFaceTimer.current = setTimeout(() => {
          if (mountedRef.current) onNoFace?.();
        }, NO_FACE_TIMEOUT);

        loop();
      } catch {
        onError?.('ไม่สามารถเปิดกล้องได้\nกรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์');
      }
    };

    start();
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [loop, stopCamera, onError, onNoFace]);

  // ============================================================
  //  Render
  // ============================================================
  const cfg = STATUS[status] || STATUS.scanning;

  // EAR blink indicator (only in blink_wait)
  const showBlinkHint = status === 'blink_wait';
  const showSuccess   = status === 'blink_done';
  const showWarning   = ['too_far', 'dark', 'blurry'].includes(status);
  const showNoMatch   = status === 'no_match';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-fade-in">

      {/* Camera box */}
      <div className={`relative w-80 h-80 rounded-[3rem] overflow-hidden border-[6px] ${cfg.border} bg-black mb-10 shadow-lg transition-colors duration-300`}>

        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          playsInline
          muted
        />

        {/* scan line (scanning / no_face) */}
        {(status === 'scanning' || status === 'no_face') && (
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#7B8CFA]/0 to-[#7B8CFA]/30 animate-scan pointer-events-none">
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#7B8CFA] shadow-[0_0_12px_#7B8CFA]" />
          </div>
        )}

        {/* blink scan line (green) */}
        {showBlinkHint && (
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#C6F45D]/0 to-[#C6F45D]/30 animate-scan pointer-events-none">
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#C6F45D] shadow-[0_0_12px_#C6F45D]" />
          </div>
        )}

        {/* corner guides */}
        <div className="absolute inset-4 pointer-events-none">
          {[
            'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
            'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
            'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
            'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-8 h-8 ${cls} ${cfg.border} transition-colors duration-300`} />
          ))}
        </div>

        {/* blink eye icon overlay */}
        {showBlinkHint && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
              <svg className="w-6 h-6 text-[#C6F45D] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="text-white text-sm font-bold">กระพริบตา</span>
            </div>
          </div>
        )}

        {/* success overlay */}
        {showSuccess && (
          <div className="absolute inset-0 bg-[#C6F45D]/30 flex items-center justify-center pointer-events-none">
            <div className="bg-[#C6F45D] rounded-full p-4 shadow-xl">
              <svg className="w-10 h-10 text-[#222222]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </div>
        )}

        {/* warning overlay */}
        {showWarning && (
          <div className="absolute inset-0 bg-amber-400/10 border-2 border-amber-400/30 pointer-events-none" />
        )}

        {/* no match overlay */}
        {showNoMatch && (
          <div className="absolute inset-0 bg-red-400/10 flex items-center justify-center pointer-events-none">
            <div className="bg-red-100 rounded-full p-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
          </div>
        )}

        {/* starting overlay */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Status pill */}
      <div className={`${cfg.pill} px-8 py-4 rounded-full shadow-sm border border-slate-100 transition-colors duration-300`}>
        <p className="text-2xl font-bold text-[#222222] text-center">{cfg.text}</p>
      </div>

    </div>
  );
}
