// =============================================================
//  ระบบลงเวลาพนักงาน — Google Apps Script (Web App)
//  วิธีใช้:
//    1. เปิด Google Sheet → Extensions → Apps Script
//    2. วางโค้ดทั้งหมดนี้แทนที่โค้ดเดิม
//    3. Deploy → New deployment → Web App
//       - Execute as: Me
//       - Who has access: Anyone
//    4. Copy Web App URL ไปใส่ใน .env ของ React
// =============================================================

// ============================================================
//  CONFIG — เปลี่ยนชื่อ Sheet ตามที่ตั้งไว้จริง
// ============================================================
const SHEET_EMPLOYEES    = 'Employees';
const SHEET_LOGS         = 'AttendanceLogs';
const SHEET_PAYROLL_CFG  = 'PayrollConfig';
const SHEET_AUDIT        = 'AuditLogs';

// ============================================================
//  CORS — GAS Web App จัดการ CORS ให้อัตโนมัติสำหรับ GET
//  สำหรับ POST ให้ React ส่ง Content-Type: text/plain
//  เพื่อหลีกเลี่ยง OPTIONS pre-flight request
// ============================================================
function jsonResponse(data, statusCode) {
  const payload = JSON.stringify({ status: statusCode || 200, ...data });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  doGet — รับ GET request
//  Endpoints:
//    ?action=getEmployees          → รายชื่อพนักงาน + faceDescriptor
//    ?action=getLogs&week=YYYY-WW  → log รายสัปดาห์
//    ?action=getPayroll&week=YYYY-WW → สรุปค่าแรงรายสัปดาห์
//    ?action=getStatus&empId=001   → สถานะวันนี้ของพนักงานคนนั้น
// ============================================================
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getEmployees')  return handleGetEmployees();
    if (action === 'getLogs')       return handleGetLogs(e.parameter);
    if (action === 'getPayroll')    return handleGetPayroll(e.parameter);
    if (action === 'getStatus')     return handleGetStatus(e.parameter);

    return jsonResponse({ error: 'Unknown action' }, 400);

  } catch (err) {
    writeAuditLog('GET_ERROR', err.message, JSON.stringify(e.parameter));
    return jsonResponse({ error: err.message }, 500);
  }
}

// ============================================================
//  doPost — รับ POST request
//  Body JSON:
//    action=logAttendance  → บันทึกเวลา
//    action=enrollFace     → บันทึก face descriptor พนักงาน
// ============================================================
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'logAttendance') return handleLogAttendance(body);
    if (action === 'enrollFace')    return handleEnrollFace(body);

    return jsonResponse({ error: 'Unknown action' }, 400);

  } catch (err) {
    writeAuditLog('POST_ERROR', err.message, e.postData ? e.postData.contents : '');
    return jsonResponse({ error: err.message }, 500);
  }
}

// ============================================================
//  GET: getEmployees
//  คืนค่า: รายชื่อพนักงานทั้งหมดที่ active=TRUE พร้อม faceDescriptor
// ============================================================
function handleGetEmployees() {
  const sheet = getSheet(SHEET_EMPLOYEES);
  const rows  = sheet.getDataRange().getValues();

  // row[0] คือ header: employeeId | name | department | active | rate | rateType | faceDescriptorJson | updatedAt
  const employees = rows.slice(1)
    .filter(r => r[3] === true || r[3] === 'TRUE' || r[3] === true)
    .map(r => ({
      employeeId:         String(r[0]),
      name:               r[1],
      department:         r[2],
      rate:               Number(r[4]) || 0,
      rateType:           r[5] || 'daily',
      faceDescriptorJson: r[6] ? String(r[6]) : null,
      updatedAt:          r[7] ? String(r[7]) : '',
    }));

  return jsonResponse({ employees });
}

// ============================================================
//  POST: logAttendance
//  Body: { action, employeeId, employeeName, actionType,
//          confidenceScore, deviceId }
//  actionType: 'เข้างาน' | 'พักเที่ยง' | 'กลับจากพัก' | 'ออกงาน'
// ============================================================
function handleLogAttendance(body) {
  // Validate required fields
  const required = ['employeeId', 'employeeName', 'actionType'];
  for (const field of required) {
    if (!body[field]) {
      return jsonResponse({ error: `Missing field: ${field}` }, 400);
    }
  }

  const now       = new Date();
  const dateStr   = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd');
  const timeStr   = Utilities.formatDate(now, 'Asia/Bangkok', 'HH:mm:ss');
  const id        = `LOG-${now.getTime()}`;

  const sheet = getSheet(SHEET_LOGS);
  sheet.appendRow([
    id,                                    // A: id
    String(body.employeeId),               // B: employeeId
    body.employeeName,                     // C: name
    body.actionType,                       // D: actionType
    `${dateStr} ${timeStr}`,               // E: timestampServer
    dateStr,                               // F: dateStr (สำหรับ filter)
    timeStr,                               // G: timeStr
    Number(body.confidenceScore) || 0,     // H: confidenceScore
    body.deviceId || 'iPad-01',            // I: deviceId
    now,                                   // J: createdAt (raw Date)
  ]);

  writeAuditLog('LOG_ATTENDANCE',
    `${body.employeeName} → ${body.actionType}`,
    JSON.stringify(body));

  return jsonResponse({
    success:   true,
    id,
    timestamp: `${dateStr} ${timeStr}`,
    message:   `บันทึก ${body.actionType} สำเร็จ`,
  });
}

// ============================================================
//  POST: enrollFace
//  Body: { action, employeeId, faceDescriptorJson }
//  ใช้ตอนลงทะเบียนใบหน้าพนักงานใหม่ / อัปเดตใบหน้า
// ============================================================
function handleEnrollFace(body) {
  if (!body.employeeId || !body.faceDescriptorJson) {
    return jsonResponse({ error: 'Missing employeeId or faceDescriptorJson' }, 400);
  }

  const sheet = getSheet(SHEET_EMPLOYEES);
  const rows  = sheet.getDataRange().getValues();

  let found = false;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(body.employeeId)) {
      // อัปเดต column G (faceDescriptorJson) และ H (updatedAt)
      sheet.getRange(i + 1, 7).setValue(body.faceDescriptorJson);
      sheet.getRange(i + 1, 8).setValue(new Date());
      found = true;
      break;
    }
  }

  if (!found) {
    return jsonResponse({ error: `ไม่พบพนักงาน ID: ${body.employeeId}` }, 404);
  }

  writeAuditLog('ENROLL_FACE', `Updated face for empId=${body.employeeId}`, '');
  return jsonResponse({ success: true, message: 'บันทึก face descriptor สำเร็จ' });
}

// ============================================================
//  GET: getLogs
//  Params: week=YYYY-WW หรือ date=YYYY-MM-DD
//  คืนค่า: log ทั้งหมดในช่วงนั้น
// ============================================================
function handleGetLogs(params) {
  const sheet = getSheet(SHEET_LOGS);
  const rows  = sheet.getDataRange().getValues();

  // header: id | employeeId | name | actionType | timestamp | dateStr | timeStr | confidence | deviceId | createdAt
  let logs = rows.slice(1).map(r => ({
    id:              r[0],
    employeeId:      String(r[1]),
    name:            r[2],
    actionType:      r[3],
    timestamp:       r[4],
    dateStr:         r[5],
    timeStr:         r[6],
    confidenceScore: r[7],
    deviceId:        r[8],
  }));

  // Filter by date ถ้าระบุมา
  if (params.date) {
    logs = logs.filter(l => l.dateStr === params.date);
  }

  // Filter by week ถ้าระบุมา (format: YYYY-WW)
  if (params.week) {
    const weekDates = getWeekDates(params.week);
    logs = logs.filter(l => l.dateStr >= weekDates.start && l.dateStr <= weekDates.end);
  }

  // Group by employeeId+date เพื่อแสดงเป็นแถวรายวัน
  const grouped = groupLogsToDaily(logs);

  return jsonResponse({ logs: grouped, raw: logs });
}

// ============================================================
//  GET: getPayroll
//  Params: week=YYYY-WW
//  คืนค่า: สรุปค่าแรงรายคนในสัปดาห์นั้น
// ============================================================
function handleGetPayroll(params) {
  const week = params.week || getCurrentWeekStr();

  // ดึง logs
  const logResult = handleGetLogs({ week });
  const logData   = JSON.parse(logResult.getContent());
  const daily     = logData.logs; // grouped daily records

  // ดึง config ค่าแรง
  const cfgSheet = getSheet(SHEET_PAYROLL_CFG);
  const cfgRows  = cfgSheet.getDataRange().getValues();
  // header: employeeId | name | rate | rateType
  const rateMap = {};
  cfgRows.slice(1).forEach(r => {
    rateMap[String(r[0])] = { rate: Number(r[2]), rateType: r[3] };
  });

  // คำนวณต่อพนักงาน
  const summary = {};
  daily.forEach(row => {
    const empId = String(row.employeeId);
    if (!summary[empId]) {
      summary[empId] = {
        employeeId: empId,
        name:       row.name,
        days:       0,
        hours:      0,
        rate:       rateMap[empId] ? rateMap[empId].rate : 0,
        rateType:   rateMap[empId] ? rateMap[empId].rateType : 'daily',
        total:      0,
      };
    }

    if (row.workedHours > 0) {
      summary[empId].days  += 1;
      summary[empId].hours += row.workedHours;
    }
  });

  // คำนวณยอดรวม
  Object.values(summary).forEach(emp => {
    emp.hours = Math.round(emp.hours * 100) / 100;
    if (emp.rateType === 'daily') {
      emp.total = emp.days * emp.rate;
    } else {
      emp.total = Math.round(emp.hours * emp.rate * 100) / 100;
    }
  });

  const payroll    = Object.values(summary);
  const grandTotal = payroll.reduce((s, e) => s + e.total, 0);

  return jsonResponse({ week, payroll, grandTotal });
}

// ============================================================
//  GET: getStatus
//  Params: empId=001&date=YYYY-MM-DD
//  คืนค่า: สถานะล่าสุดของพนักงานวันนี้ (เพื่อ disable ปุ่มใน kiosk)
// ============================================================
function handleGetStatus(params) {
  if (!params.empId) return jsonResponse({ error: 'Missing empId' }, 400);

  const today = params.date ||
    Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');

  const sheet = getSheet(SHEET_LOGS);
  const rows  = sheet.getDataRange().getValues();

  const todayLogs = rows.slice(1)
    .filter(r => String(r[1]) === String(params.empId) && r[5] === today)
    .map(r => ({ actionType: r[3], timeStr: r[6] }));

  const actions = todayLogs.map(l => l.actionType);
  const lastAction = actions.length > 0 ? actions[actions.length - 1] : null;

  // บอกว่า action ไหนทำได้ต่อไป
  const nextAllowed = getNextAllowedActions(lastAction);

  return jsonResponse({ empId: params.empId, date: today, todayLogs, lastAction, nextAllowed });
}

// ============================================================
//  HELPER: nextAllowedActions
//  ลำดับ: เข้างาน → พักเที่ยง → กลับจากพัก → ออกงาน
// ============================================================
function getNextAllowedActions(lastAction) {
  const flow = ['เข้างาน', 'พักเที่ยง', 'กลับจากพัก', 'ออกงาน'];
  if (!lastAction)             return ['เข้างาน'];
  const idx = flow.indexOf(lastAction);
  if (idx === -1 || idx === flow.length - 1) return [];
  return [flow[idx + 1]];
}

// ============================================================
//  HELPER: groupLogsToDaily
//  แปลง raw logs → แถวรายวัน (employeeId + date)
//  คำนวณ workedHours จากเวลาเข้า-ออกพร้อมหักพัก
// ============================================================
function groupLogsToDaily(logs) {
  const map = {};

  logs.forEach(log => {
    const key = `${log.employeeId}_${log.dateStr}`;
    if (!map[key]) {
      map[key] = {
        employeeId:  log.employeeId,
        name:        log.name,
        date:        log.dateStr,
        in:          '-',
        breakOut:    '-',
        breakIn:     '-',
        out:         '-',
        workedHours: 0,
        status:      'incomplete',
      };
    }
    const entry = map[key];
    if (log.actionType === 'เข้างาน')      entry.in       = log.timeStr;
    if (log.actionType === 'พักเที่ยง')    entry.breakOut = log.timeStr;
    if (log.actionType === 'กลับจากพัก')  entry.breakIn  = log.timeStr;
    if (log.actionType === 'ออกงาน')       entry.out      = log.timeStr;
  });

  // คำนวณ workedHours
  Object.values(map).forEach(entry => {
    if (entry.in !== '-' && entry.out !== '-') {
      const inMins   = timeToMinutes(entry.in);
      const outMins  = timeToMinutes(entry.out);
      let breakMins  = 0;

      if (entry.breakOut !== '-' && entry.breakIn !== '-') {
        breakMins = timeToMinutes(entry.breakIn) - timeToMinutes(entry.breakOut);
      }

      const totalMins  = outMins - inMins - breakMins;
      entry.workedHours = Math.round((totalMins / 60) * 100) / 100;
      entry.status      = 'complete';
    }
  });

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
//  HELPER: timeToMinutes("08:30:00") → 510
// ============================================================
function timeToMinutes(timeStr) {
  const parts = String(timeStr).split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// ============================================================
//  HELPER: getCurrentWeekStr → "2026-14" (YYYY-WW)
// ============================================================
function getCurrentWeekStr() {
  const now       = new Date();
  const startYear = new Date(now.getFullYear(), 0, 1);
  const week      = Math.ceil(((now - startYear) / 86400000 + startYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(week).padStart(2, '0')}`;
}

// ============================================================
//  HELPER: getWeekDates("2026-14") → { start: "2026-03-30", end: "2026-04-05" }
// ============================================================
function getWeekDates(weekStr) {
  const [year, week] = weekStr.split('-').map(Number);
  const jan1         = new Date(year, 0, 1);
  const startDay     = new Date(jan1.getTime() + (week - 1) * 7 * 86400000);
  // หา Monday ของสัปดาห์นั้น
  const dayOfWeek    = startDay.getDay() || 7;
  const monday       = new Date(startDay.getTime() - (dayOfWeek - 1) * 86400000);
  const sunday       = new Date(monday.getTime() + 6 * 86400000);

  return {
    start: Utilities.formatDate(monday, 'Asia/Bangkok', 'yyyy-MM-dd'),
    end:   Utilities.formatDate(sunday, 'Asia/Bangkok', 'yyyy-MM-dd'),
  };
}

// ============================================================
//  HELPER: getSheet — หา sheet ตามชื่อ, ถ้าไม่มีสร้างใหม่พร้อม header
// ============================================================
function getSheet(name) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheetHeaders(sheet, name);
  }

  return sheet;
}

// ============================================================
//  HELPER: initSheetHeaders — ใส่ header row อัตโนมัติตอนสร้าง sheet ใหม่
// ============================================================
function initSheetHeaders(sheet, name) {
  const headers = {
    [SHEET_EMPLOYEES]: [
      'employeeId', 'name', 'department', 'active',
      'rate', 'rateType', 'faceDescriptorJson', 'updatedAt',
    ],
    [SHEET_LOGS]: [
      'id', 'employeeId', 'name', 'actionType',
      'timestampServer', 'dateStr', 'timeStr',
      'confidenceScore', 'deviceId', 'createdAt',
    ],
    [SHEET_PAYROLL_CFG]: [
      'employeeId', 'name', 'rate', 'rateType',
    ],
    [SHEET_AUDIT]: [
      'eventType', 'detail', 'payload', 'createdAt',
    ],
  };

  const h = headers[name];
  if (h) {
    sheet.appendRow(h);
    sheet.getRange(1, 1, 1, h.length)
      .setFontWeight('bold')
      .setBackground('#7B8CFA')
      .setFontColor('white');
    sheet.setFrozenRows(1);
  }
}

// ============================================================
//  HELPER: writeAuditLog — บันทึก event ทุกอย่างลง AuditLogs
// ============================================================
function writeAuditLog(eventType, detail, payload) {
  try {
    const sheet = getSheet(SHEET_AUDIT);
    sheet.appendRow([eventType, detail, payload, new Date()]);
  } catch (_) {
    // ไม่ให้ audit error ทำให้ main flow พัง
  }
}

// ============================================================
//  SETUP: setupSheets
//  รันครั้งเดียวเพื่อสร้าง sheet ทั้งหมดพร้อม header
//  วิธีรัน: Apps Script Editor → เลือก setupSheets → กด Run
// ============================================================
function setupSheets() {
  [SHEET_EMPLOYEES, SHEET_LOGS, SHEET_PAYROLL_CFG, SHEET_AUDIT].forEach(name => {
    getSheet(name); // สร้างถ้ายังไม่มี
  });

  // ใส่ข้อมูลตัวอย่าง Employees (ลบออกได้หลัง setup)
  const empSheet = getSheet(SHEET_EMPLOYEES);
  if (empSheet.getLastRow() <= 1) {
    const sample = [
      ['001', 'สมชาย ใจดี',   'ขาย',    true, 400, 'daily',  '', new Date()],
      ['002', 'สมศรี มีสุข',  'บริการ', true, 400, 'daily',  '', new Date()],
      ['003', 'วิชัย รักดี',  'คลัง',   true, 50,  'hourly', '', new Date()],
    ];
    sample.forEach(row => empSheet.appendRow(row));
  }

  // ใส่ PayrollConfig
  const cfgSheet = getSheet(SHEET_PAYROLL_CFG);
  if (cfgSheet.getLastRow() <= 1) {
    const sample = [
      ['001', 'สมชาย ใจดี',  400, 'daily'],
      ['002', 'สมศรี มีสุข', 400, 'daily'],
      ['003', 'วิชัย รักดี', 50,  'hourly'],
    ];
    sample.forEach(row => cfgSheet.appendRow(row));
  }

  SpreadsheetApp.getUi().alert('✅ Setup เสร็จแล้ว! Sheet ทั้งหมดพร้อมใช้งาน');
}

// ============================================================
//  TEST: testLogAttendance
//  รันใน Apps Script Editor เพื่อทดสอบก่อน deploy
// ============================================================
function testLogAttendance() {
  const fakePost = {
    postData: {
      contents: JSON.stringify({
        action:          'logAttendance',
        employeeId:      '001',
        employeeName:    'สมชาย ใจดี',
        actionType:      'เข้างาน',
        confidenceScore: 0.95,
        deviceId:        'iPad-01',
      }),
    },
  };

  const result = doPost(fakePost);
  Logger.log(result.getContent());
}

function testGetEmployees() {
  const result = doGet({ parameter: { action: 'getEmployees' } });
  Logger.log(result.getContent());
}
