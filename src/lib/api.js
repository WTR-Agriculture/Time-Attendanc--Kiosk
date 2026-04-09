// ============================================================
//  GAS API Service
//  ใช้ text/plain สำหรับ POST เพื่อหลีกเลี่ยง CORS pre-flight
//  GAS อ่าน e.postData.contents ได้ปกติไม่ว่า content-type จะเป็นอะไร
// ============================================================

const GAS_URL = import.meta.env.VITE_GAS_URL;

// --- core fetchers ---

async function gasGet(params) {
  const url = new URL(GAS_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { redirect: 'follow' });
  if (!res.ok) throw new Error(`GAS GET error: ${res.status}`);
  return res.json();
}

async function gasPost(body) {
  // Content-Type: text/plain หลีกเลี่ยง OPTIONS pre-flight request
  const res = await fetch(GAS_URL, {
    method:   'POST',
    headers:  { 'Content-Type': 'text/plain;charset=UTF-8' },
    body:     JSON.stringify(body),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`GAS POST error: ${res.status}`);
  return res.json();
}

// ============================================================
//  getEmployees — โหลดรายชื่อพนักงานทั้งหมด พร้อม faceDescriptor
//  return: { employees: [...] }
// ============================================================
export async function getEmployees() {
  return gasGet({ action: 'getEmployees' });
}

// ============================================================
//  getStatus — สถานะลงเวลาวันนี้ของพนักงานคนนั้น
//  return: { lastAction, nextAllowed: [...], todayLogs: [...] }
// ============================================================
export async function getStatus(empId) {
  return gasGet({ action: 'getStatus', empId });
}

// ============================================================
//  logAttendance — บันทึกเวลา
//  return: { success, id, timestamp, message }
// ============================================================
export async function logAttendance({ employeeId, employeeName, actionType, confidenceScore, deviceId }) {
  return gasPost({
    action: 'logAttendance',
    employeeId,
    employeeName,
    actionType,
    confidenceScore: confidenceScore ?? 0,
    deviceId:        deviceId ?? 'iPad-01',
  });
}

// ============================================================
//  enrollFace — บันทึก face descriptor สำหรับพนักงาน
//  return: { success, message }
// ============================================================
export async function enrollFace(employeeId, faceDescriptorJson) {
  return gasPost({ action: 'enrollFace', employeeId, faceDescriptorJson });
}

// ============================================================
//  getLogs — ดึง attendance log
//  params: { week: 'YYYY-WW' } หรือ { date: 'YYYY-MM-DD' }
//  return: { logs: [...], raw: [...] }
// ============================================================
export async function getLogs(params = {}) {
  return gasGet({ action: 'getLogs', ...params });
}

// ============================================================
//  getPayroll — สรุปค่าแรงรายสัปดาห์
//  params: { week: 'YYYY-WW' }
//  return: { week, payroll: [...], grandTotal }
// ============================================================
export async function getPayroll(params = {}) {
  return gasGet({ action: 'getPayroll', ...params });
}

// ============================================================
//  logOT — บันทึก OT
//  params: { employeeId, employeeName, date: 'YYYY-MM-DD', hours }
//  return: { success, message }
// ============================================================
export async function logOT({ employeeId, employeeName, date, hours, note }) {
  return gasPost({ action: 'logOT', employeeId, employeeName, date, hours, note: note || '' });
}

// ============================================================
//  getOT — ดึงรายการ OT
//  params: { week: 'YYYY-WW' } หรือไม่ส่งก็ได้ (ดึงทั้งหมด)
//  return: { otLogs: [...] }
// ============================================================
export async function getOT(params = {}) {
  return gasGet({ action: 'getOT', ...params });
}

// ============================================================
//  getCurrentWeekStr — helper คืน "YYYY-WW" สัปดาห์ปัจจุบัน
// ============================================================
export function getCurrentWeekStr() {
  const now       = new Date();
  const startYear = new Date(now.getFullYear(), 0, 1);
  const week      = Math.ceil(((now - startYear) / 86400000 + startYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(week).padStart(2, '0')}`;
}
