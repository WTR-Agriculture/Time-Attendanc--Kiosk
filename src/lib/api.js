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
//  getEmployeeLogs — ประวัติการมาทำงานรายคน
// ============================================================
export async function getEmployeeLogs(employeeId, limit = 60) {
  return apiGet(`/api/employees/${encodeURIComponent(employeeId)}/logs`, { limit });
}

// ============================================================
//  getEmployeePayroll — ประวัติงวดค่าแรงรายคน
// ============================================================
export async function getEmployeePayroll(employeeId) {
  return apiGet(`/api/employees/${encodeURIComponent(employeeId)}/payroll`);
}

// ============================================================
//  updateEmployee — แก้ไขข้อมูลพนักงาน
// ============================================================
export async function setEmployeeActive(employeeId, isActive) {
  const res = await fetch(`${API_URL}/api/employees/${encodeURIComponent(employeeId)}/active`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new Error(`API PUT error: ${res.status}`);
  return res.json();
}

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
export async function getPayrollSummary(params = {}) {
  return apiGet('/api/payroll/summary', params);
}

export async function createPayrollPeriod({ startDate, endDate }) {
  return apiPost('/api/payroll/periods', { startDate, endDate });
}

export async function getPayrollPeriods() {
  return apiGet('/api/payroll/periods');
}

export async function getPayrollPeriodDetail(periodId) {
  return apiGet(`/api/payroll/periods/${periodId}`);
}

export async function deletePayrollPeriod(periodId) {
  const res = await fetch(`${API_URL}/api/payroll/periods/${periodId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API DELETE error: ${res.status}`);
  return res.json();
}

export async function payPayrollPeriod(periodId) {
  const res = await fetch(`${API_URL}/api/payroll/periods/${periodId}/pay`, { method: 'PUT' });
  if (!res.ok) throw new Error(`API PUT error: ${res.status}`);
  return res.json();
}

export async function toggleDeferPayrollItem(periodId, employeeId) {
  const res = await fetch(`${API_URL}/api/payroll/periods/${periodId}/items/${encodeURIComponent(employeeId)}/defer`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`API PUT error: ${res.status}`);
  return res.json();
}

export async function payPayrollPeriodItem(periodId, employeeId, paymentMethod) {
  const res = await fetch(`${API_URL}/api/payroll/periods/${periodId}/items/${encodeURIComponent(employeeId)}/pay`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethod }),
  });
  if (!res.ok) throw new Error(`API PUT error: ${res.status}`);
  return res.json();
}

// ============================================================
//  Attendance Day (card layout)
// ============================================================
export async function getAttendanceDay(date) {
  return apiGet('/api/attendance/day', { date });
}

export async function saveAttendanceDay({ employeeId, employeeName, date, inTime, outTime, note }) {
  return apiPost('/api/attendance/day', { employeeId, employeeName, date, inTime, outTime, note: note || '' });
}

// ============================================================
//  Piece Rate
// ============================================================
export async function getPieceRateCategories() {
  return apiGet('/api/piece_rate/categories');
}

export async function createPieceRateCategory(body) {
  return apiPost('/api/piece_rate/categories', body);
}

export async function updatePieceRateCategory(id, body) {
  const res = await fetch(`${API_URL}/api/piece_rate/categories/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API PUT error: ${res.status}`);
  return res.json();
}

export async function deletePieceRateCategory(id) {
  const res = await fetch(`${API_URL}/api/piece_rate/categories/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API DELETE error: ${res.status}`);
  return res.json();
}

export async function getPieceRateJobs() {
  return apiGet('/api/piece_rate/jobs');
}

export async function createPieceRateJob(body) {
  return apiPost('/api/piece_rate/jobs', body);
}

export async function updatePieceRateJob(id, body) {
  const res = await fetch(`${API_URL}/api/piece_rate/jobs/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API PUT error: ${res.status}`);
  return res.json();
}

export async function deletePieceRateJob(id) {
  const res = await fetch(`${API_URL}/api/piece_rate/jobs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API DELETE error: ${res.status}`);
  return res.json();
}

export async function getPieceRateLogs(params = {}) {
  return apiGet('/api/piece_rate/logs', params);
}

export async function createPieceRateLog(body) {
  return apiPost('/api/piece_rate/logs', body);
}

export async function deletePieceRateLog(id) {
  const res = await fetch(`${API_URL}/api/piece_rate/logs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API DELETE error: ${res.status}`);
  return res.json();
}

// ============================================================
//  addPeriodPieceRate — เพิ่มงานเหมาเข้างวดการจ่าย
// ============================================================
export async function addPeriodPieceRate(periodId, body) {
  return apiPost(`/api/payroll/periods/${periodId}/piece_rate`, body);
}

// ============================================================
//  Wage Advances
// ============================================================
export async function getAdvances() {
  return apiGet('/api/advances');
}

export async function getAdvanceHistory(empId) {
  return apiGet(`/api/advances/${encodeURIComponent(empId)}/history`);
}

export async function createAdvance(body) {
  return apiPost('/api/advances', body);
}

export async function setAdvanceDeduction(periodId, employeeId, amount) {
  const res = await fetch(`${API_URL}/api/payroll/periods/${periodId}/advance`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, amount }),
  });
  if (!res.ok) throw new Error(`API PUT error: ${res.status}`);
  return res.json();
}

// ============================================================
//  getCurrentWeekStr — helper คืน "YYYY-WW" สัปดาห์ปัจจุบัน
// ============================================================
export function getCurrentWeekStr() {
  const now  = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  // Monday-based week number (matches Python's %W)
  const jan1MondayBased = (jan1.getDay() + 6) % 7; // Mon=0 … Sun=6
  const dayOfYear = Math.floor((now - jan1) / 86400000); // 0-indexed
  const week = Math.floor((dayOfYear + jan1MondayBased) / 7);
  return `${now.getFullYear()}-${String(week).padStart(2, '0')}`;
}
