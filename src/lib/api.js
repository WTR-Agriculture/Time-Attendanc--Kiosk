// ============================================================
//  FastAPI Backend Service
//  Base URL: VITE_API_URL (e.g. https://api.wtr-attendance.online)
// ============================================================

const API_URL = import.meta.env.VITE_API_URL;

// --- core fetchers ---

async function apiGet(path, params = {}) {
  const url = new URL(API_URL + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API GET error: ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(API_URL + path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST error: ${res.status}`);
  return res.json();
}

// ============================================================
//  getEmployees — โหลดรายชื่อพนักงานทั้งหมด พร้อม faceDescriptor
//  return: { employees: [...] }
// ============================================================
export async function getEmployees() {
  return apiGet('/api/employees');
}

// ============================================================
//  getStatus — สถานะลงเวลาวันนี้ของพนักงานคนนั้น
//  return: { lastAction, nextAllowed: [...], todayLogs: [...] }
// ============================================================
export async function getStatus(empId) {
  return apiGet('/api/status', { empId });
}

// ============================================================
//  logAttendance — บันทึกเวลา
//  return: { success, id, timestamp, message }
// ============================================================
export async function logAttendance({ employeeId, employeeName, actionType, confidenceScore, deviceId }) {
  return apiPost('/api/attendance', {
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
  return apiPost('/api/enroll', { employeeId, faceDescriptorJson });
}

// ============================================================
//  getLogs — ดึง attendance log
//  params: { week: 'YYYY-WW' } หรือ { date: 'YYYY-MM-DD' }
//  return: { logs: [...] }
// ============================================================
export async function getLogs(params = {}) {
  return apiGet('/api/logs', params);
}

// ============================================================
//  getPayroll — สรุปค่าแรงรายสัปดาห์
//  params: { week: 'YYYY-WW' }
//  return: { week, payroll: [...], grandTotal }
// ============================================================
export async function getPayroll(params = {}) {
  return apiGet('/api/payroll', params);
}

// ============================================================
//  logOT — บันทึก OT
//  params: { employeeId, employeeName, date: 'YYYY-MM-DD', hours, note }
//  return: { success, message }
// ============================================================
export async function logOT({ employeeId, employeeName, date, hours, note, otRate }) {
  return apiPost('/api/ot', { employeeId, employeeName, date, hours, note: note || '', otRate: otRate ?? 1.0 });
}

// ============================================================
//  getOT — ดึงรายการ OT
//  params: { week: 'YYYY-WW' } หรือไม่ส่งก็ได้ (ดึงทั้งหมด)
//  return: { otLogs: [...] }
// ============================================================
export async function getOT(params = {}) {
  return apiGet('/api/ot', params);
}

// ============================================================
//  getNextEmployeeId — ดึงรหัสพนักงานถัดไป (auto increment)
//  return: { nextId: '1001' }
// ============================================================
export async function getNextEmployeeId() {
  return apiGet('/api/employees/next-id');
}

// ============================================================
//  createEmployee — เพิ่มพนักงานใหม่
//  params: { employeeId, name, department, rate, rateType }
//  return: { success, message }
// ============================================================
export async function createEmployee({ employeeId, name, department, rate, rateType }) {
  return apiPost('/api/employees', { employeeId, name, department, rate, rateType });
}

// ============================================================
//  deleteEmployee — ปิดใช้งานพนักงาน (soft delete)
//  return: { success, message }
// ============================================================
export async function deleteEmployee(employeeId) {
  const res = await fetch(`${API_URL}/api/employees/${encodeURIComponent(employeeId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API DELETE error: ${res.status}`);
  return res.json();
}

// ============================================================
//  updateEmployee — แก้ไขข้อมูลพนักงาน
// ============================================================
export async function updateEmployee(employeeId, { name, department, rate, rateType }) {
  const res = await fetch(`${API_URL}/api/employees/${encodeURIComponent(employeeId)}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, department, rate, rateType }),
  });
  if (!res.ok) throw new Error(`API PUT error: ${res.status}`);
  return res.json();
}

// ============================================================
//  Payroll Periods
// ============================================================
export async function createPayrollPeriod({ startDate, endDate }) {
  return apiPost('/api/payroll/periods', { startDate, endDate });
}

export async function getPayrollPeriods() {
  return apiGet('/api/payroll/periods');
}

export async function getPayrollPeriodDetail(periodId) {
  return apiGet(`/api/payroll/periods/${periodId}`);
}

export async function payPayrollPeriod(periodId) {
  const res = await fetch(`${API_URL}/api/payroll/periods/${periodId}/pay`, { method: 'PUT' });
  if (!res.ok) throw new Error(`API PUT error: ${res.status}`);
  return res.json();
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
