// ============================================================
//  ScanScreen — Fast recognition (no blink required)
//  Flow: STARTING → detect face → quality ok → send server → done
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceApi from '../lib/faceApi';
import * as api     from '../lib/api';

function captureBase64(videoEl, quality = 0.8) {
  const maxSize = 320;
  const scale = Math.min(1, maxSize / Math.max(videoEl.videoWidth, videoEl.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(videoEl.videoWidth  * scale);
  canvas.height = Math.round(videoEl.videoHeight * scale);
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

// scan interval ms
const SCAN_MS         = 350;
// ต้องเจอหน้าติดกัน N ครั้งก่อนส่ง (ป้องกัน false positive)
const STABLE_FRAMES   = 2;
// timeout ถ้าไม่เจอหน้าเลย
const NO_FACE_TIMEOUT = 14000;

const STATUS = {
  starting:  { text: 'กำลังเปิดกล้อง...',                    border: 'border-slate-300', pill: 'bg-white'        },
  scanning:  { text: 'กำลังค้นหาใบหน้า...',                   border: 'border-[#7B8CFA]', pill: 'bg-white'        },
  no_face:   { text: 'ไม่พบใบหน้า — ยืนหน้ากล้องให้ชัดขึ้น', border: 'border-slate-300', pill: 'bg-white'        },
  too_far:   { text: 'ขยับใกล้กล้องอีกนิด',                   border: 'border-amber-400', pill: 'bg-amber-50'     },
  dark:      { text: 'แสงน้อยเกินไป — หาที่สว่างกว่านี้',    border: 'border-amber-400', pill: 'bg-amber-50'     },
  blurry:    { text: 'ภาพไม่ชัด — ลองปรับมุมใหม่',           border: 'border-amber-400', pill: 'bg-amber-50'     },
  matching:  { text: 'กำลังระบุตัวตน...',                      border: 'border-[#C6F45D]', pill: 'bg-[#C6F45D]/20' },
  no_match:  { text: 'ไม่พบใบหน้าในระบบ — ลองใหม่อีกครั้ง', border: 'border-red-300',   pill: 'bg-red-50'       },
};

export default function ScanScreen({ employees, onMatch, onNoFace, onError }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const timerRef    = useRef(null);
  const mountedRef  = useRef(true);
  const stableRef   = useRef(0);   // consecutive good-quality frames
  const sendingRef  = useRef(false);
  const noFaceTimer = useRef(null);
  const stateRef    = useRef('starting');

  const [status, setStatus] = useState('starting');

  const setS = useCallback((s) => { stateRef.current = s; setStatus(s); }, []);

  const stopCamera = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(noFaceTimer.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ============================================================
  //  detection loop
  // ============================================================
  const loop = useCallback(async () => {
    if (!mountedRef.current || sendingRef.current) return;

    const video = videoRef.current;
    if (!video) return;

    const detection = await faceApi.detectFace(video);
    if (!mountedRef.current) return;

    // ---- no face ----
    if (!detection) {
      stableRef.current = 0;
      setS('no_face');
      timerRef.current = setTimeout(loop, SCAN_MS);
      return;
    }

    // reset no-face timeout
    clearTimeout(noFaceTimer.current);
    noFaceTimer.current = setTimeout(() => { if (mountedRef.current) onNoFace?.(); }, NO_FACE_TIMEOUT);

    // ---- quality check ----
    const quality = faceApi.checkFaceQuality(detection, video);
    if (!quality.ok) {
      stableRef.current = 0;
      setS(quality.reason);
      timerRef.current = setTimeout(loop, SCAN_MS);
      return;
    }

    // ---- stable face found ----
    stableRef.current += 1;
    setS('scanning');

    if (stableRef.current < STABLE_FRAMES) {
      timerRef.current = setTimeout(loop, SCAN_MS);
      return;
    }

    // ---- ส่ง server ----
    sendingRef.current = true;
    setS('matching');

    try {
      const imageBase64 = captureBase64(video);
      const result = await api.recognize(imageBase64);
      if (!mountedRef.current) return;

      if (!result.matched) {
        stableRef.current = 0;
        sendingRef.current = false;
        setS('no_match');
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) { setS('scanning'); loop(); }
        }, 1800);
        return;
      }

      stopCamera();
      onMatch?.({
        employee:   result.employee,
        confidence: result.confidence / 100,
        level:      result.confidence >= 70 ? 'high' : result.confidence >= 40 ? 'medium' : 'low',
        distance:   0,
      });
    } catch {
      if (!mountedRef.current) return;
      stableRef.current = 0;
      sendingRef.current = false;
      setS('no_match');
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) { setS('scanning'); loop(); }
      }, 1800);
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

        noFaceTimer.current = setTimeout(() => { if (mountedRef.current) onNoFace?.(); }, NO_FACE_TIMEOUT);
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
  const showWarning  = ['too_far', 'dark', 'blurry'].includes(status);
  const showMatching = status === 'matching';
  const showNoMatch  = status === 'no_match';

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

        {/* scan line */}
        {(status === 'scanning' || status === 'no_face') && (
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#7B8CFA]/0 to-[#7B8CFA]/30 animate-scan pointer-events-none">
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#7B8CFA] shadow-[0_0_12px_#7B8CFA]" />
          </div>
        )}

        {/* matching overlay */}
        {showMatching && (
          <div className="absolute inset-0 bg-[#C6F45D]/20 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 rounded-full px-5 py-3 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span className="text-white text-sm font-bold">กำลังระบุ...</span>
            </div>
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
