// ============================================================
//  Face API Wrapper — @vladmandic/face-api  (Phase 1 + 2)
// ============================================================
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';

// ============================================================
//  Default thresholds (overridable via setThresholds)
// ============================================================
let _thresholds = {
  high:   0.42,   // distance ≤ high   → confident (green)
  medium: 0.55,   // distance ≤ medium → ask confirm (amber)
  // > medium → no match
};

export function setThresholds(t) {
  _thresholds = { ..._thresholds, ...t };
}
export function getThresholds() { return { ..._thresholds }; }

// ============================================================
//  Quality thresholds
// ============================================================
const QUALITY = {
  minFaceRatio:  0.16,   // face height / video height  (too small = too far)
  minBrightness: 55,     // avg pixel brightness 0-255  (< 55 = too dark)
  minScore:      0.65,   // SSD detection confidence
};

// ============================================================
//  Model loading
// ============================================================
let _loaded  = false;
let _loading = false;
let _loadingPromise = null;

export async function loadModels(onProgress) {
  if (_loaded) return;
  if (_loading) return _loadingPromise;
  _loading = true;
  _loadingPromise = (async () => {
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      onProgress?.(33);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      onProgress?.(66);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      onProgress?.(100);
      _loaded = true;
    } finally {
      _loading = false;
    }
  })();
  return _loadingPromise;
}

export const isLoaded  = () => _loaded;
export const isLoading = () => _loading;

// ============================================================
//  Optimised detect — resize to 320px before inference
//  ลด computation บน iPad อย่างน้อย 4× เทียบกับ 640px
// ============================================================
const _offscreen = document.createElement('canvas');

export async function detectFace(mediaEl) {
  if (!_loaded) return null;
  try {
    // resize ให้กว้างสูงสุด 320px
    const srcW = mediaEl.videoWidth  || mediaEl.width;
    const srcH = mediaEl.videoHeight || mediaEl.height;
    const scale = Math.min(1, 320 / srcW);
    _offscreen.width  = Math.round(srcW * scale);
    _offscreen.height = Math.round(srcH * scale);
    const ctx = _offscreen.getContext('2d');
    ctx.drawImage(mediaEl, 0, 0, _offscreen.width, _offscreen.height);

    const result = await faceapi
      .detectSingleFace(_offscreen, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    return result || null;
  } catch {
    return null;
  }
}

// ============================================================
//  checkFaceQuality — ตรวจคุณภาพก่อนนำไปจับคู่
//  return: { ok, reason, message }
// ============================================================
export function checkFaceQuality(detection, mediaEl) {
  const srcW = mediaEl.videoWidth  || mediaEl.width  || _offscreen.width;
  const srcH = mediaEl.videoHeight || mediaEl.height || _offscreen.height;

  // --- 1. face size (ใกล้พอไหม) ---
  const box        = detection.detection.box;
  // box อยู่ใน space ของ _offscreen ดังนั้นแปลงกลับ
  const scale      = srcH > 0 ? (_offscreen.height / srcH) : 1;
  const faceRatio  = (box.height / scale) / srcH;
  if (faceRatio < QUALITY.minFaceRatio) {
    return { ok: false, reason: 'too_far', message: 'ขยับใกล้กล้องอีกนิด' };
  }

  // --- 2. detection confidence ---
  if (detection.detection.score < QUALITY.minScore) {
    return { ok: false, reason: 'blurry', message: 'ภาพไม่ชัด — ลองปรับมุมใหม่' };
  }

  // --- 3. brightness ---
  const brightness = getFaceBrightness(box);
  if (brightness < QUALITY.minBrightness) {
    return { ok: false, reason: 'dark', message: 'แสงน้อยเกินไป — หาที่สว่างกว่านี้' };
  }

  return { ok: true, reason: null, message: null };
}

function getFaceBrightness(box) {
  try {
    const size = 32;
    const tmp  = document.createElement('canvas');
    tmp.width  = tmp.height = size;
    const ctx  = tmp.getContext('2d');
    ctx.drawImage(_offscreen, box.x, box.y, box.width, box.height, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    return sum / (size * size);
  } catch {
    return 128; // default — ถ้า error ให้ผ่าน
  }
}

// ============================================================
//  calculateEAR — Eye Aspect Ratio สำหรับ blink detection
//  ใช้ face landmarks 68 จุด
//  EAR < 0.22 = ตาหลับ  |  EAR > 0.28 = ตาเปิด
// ============================================================
export const EAR_CLOSED = 0.22;
export const EAR_OPEN   = 0.28;

export function calculateEAR(landmarks) {
  try {
    const pts = landmarks.positions;
    // left eye  36-41,  right eye 42-47
    const leftEAR  = eyeAR([36, 37, 38, 39, 40, 41].map(i => pts[i]));
    const rightEAR = eyeAR([42, 43, 44, 45, 46, 47].map(i => pts[i]));
    return (leftEAR + rightEAR) / 2;
  } catch {
    return 0.3; // default open
  }
}

function eyeAR(eye) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const A = d(eye[1], eye[5]);
  const B = d(eye[2], eye[4]);
  const C = d(eye[0], eye[3]);
  return C > 0 ? (A + B) / (2 * C) : 0.3;
}

// ============================================================
//  matchDescriptor — เทียบ descriptor กับพนักงาน
// ============================================================
export function matchDescriptor(queryDescriptor, employees) {
  let bestEmployee = null;
  let bestDistance = Infinity;

  for (const emp of employees) {
    if (!emp.faceDescriptorJson) continue;
    try {
      const stored = JSON.parse(emp.faceDescriptorJson);
      const descriptors = Array.isArray(stored[0])
        ? stored.map(d => new Float32Array(d))
        : [new Float32Array(stored)];

      for (const d of descriptors) {
        const dist = faceapi.euclideanDistance(queryDescriptor, d);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestEmployee = emp;
        }
      }
    } catch (e) {
      console.warn('[faceApi] parse error', emp.name, e);
    }
  }

  const { high, medium } = _thresholds;
  const confidence = Math.max(0, Math.min(1, 1 - bestDistance / 0.6));
  const level = bestDistance <= high
    ? 'high'
    : bestDistance <= medium
      ? 'medium'
      : 'low';

  return { employee: bestEmployee, distance: bestDistance, confidence, level };
}

export function serializeDescriptors(descriptors) {
  return JSON.stringify(descriptors.map(d => Array.from(d)));
}

export function getConfidencePercent(distance) {
  return Math.round(Math.max(0, Math.min(1, 1 - distance / 0.6)) * 100);
}
