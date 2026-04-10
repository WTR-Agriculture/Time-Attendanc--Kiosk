"""
Time Attendance Kiosk — FastAPI Backend
รันด้วย: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pyodbc
import insightface
import numpy as np
import base64
import cv2
import json
from datetime import datetime, date
import pytz

# ============================================================
#  Config
# ============================================================
DB_CONN_STR = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=NAT\\CHORPHAGA;"
    "DATABASE=TimeAttendanceDB;"
    "Trusted_Connection=yes;"
)
BANGKOK_TZ = pytz.timezone('Asia/Bangkok')
SCHEDULE = {
    'เข้างาน':     {'expected': '08:00', 'graceMin': 20},
    'เข้างานบ่าย': {'expected': '13:00', 'graceMin': 20},
}
WORK_MINS_PER_DAY = 480

# ============================================================
#  App
# ============================================================
app = FastAPI(title="Time Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
#  Face Recognition — โหลดโมเดลครั้งเดียวตอน startup
# ============================================================
face_app = None

# embedding cache: list of { employeeId, name, department, rate, rateType, embedding: np.array }
_embed_cache: list = []

def reload_embed_cache():
    """โหลด embeddings ทั้งหมดจาก DB เข้า memory (เรียกตอน startup และหลัง enroll)"""
    global _embed_cache
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT EmployeeId, Name, Department, Rate, RateType, FaceDescriptorJson
        FROM Employees WHERE IsActive = 1 AND FaceDescriptorJson IS NOT NULL
    """)
    rows = cursor.fetchall()
    conn.close()
    cache = []
    for r in rows:
        try:
            emb = np.array(json.loads(r[5]), dtype=np.float32)
            cache.append({
                "employeeId": r[0], "name": r[1], "department": r[2],
                "rate": float(r[3]), "rateType": r[4], "embedding": emb,
            })
        except Exception:
            continue
    _embed_cache = cache
    print(f"Embedding cache loaded: {len(_embed_cache)} employees")

def decode_and_resize(img_b64: str, max_size: int = 320):
    """Decode base64 image and resize to max_size (keeps aspect ratio)."""
    img_bytes = base64.b64decode(img_b64)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        return None
    h, w = img.shape[:2]
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return img

@app.on_event("startup")
async def startup():
    global face_app
    print("Loading InsightFace model...")
    face_app = insightface.app.FaceAnalysis(name="buffalo_sc", providers=["CPUExecutionProvider"])
    face_app.prepare(ctx_id=0, det_size=(320, 320))
    print("InsightFace ready!")
    reload_embed_cache()

# ============================================================
#  DB helper
# ============================================================
def get_db():
    return pyodbc.connect(DB_CONN_STR)

def get_bangkok_now():
    return datetime.now(BANGKOK_TZ)

# ============================================================
#  Models
# ============================================================
class LogAttendanceBody(BaseModel):
    employeeId: str
    employeeName: str
    actionType: str
    confidenceScore: Optional[float] = 0
    deviceId: Optional[str] = "iPad-01"

class EnrollFaceBody(BaseModel):
    employeeId: str
    images: list[str]  # list of JPEG base64 (1 per pose)

class RecognizeFaceBody(BaseModel):
    imageBase64: str  # JPEG base64 จาก iPad

class LogOTBody(BaseModel):
    employeeId: str
    employeeName: str
    date: str
    hours: float
    note: Optional[str] = ""
    otRate: Optional[float] = 1.0

class UpdateEmployeeBody(BaseModel):
    name: str
    department: Optional[str] = ""
    rate: float
    rateType: str

class CreatePayrollPeriodBody(BaseModel):
    startDate: str  # YYYY-MM-DD
    endDate: str    # YYYY-MM-DD

class CreateEmployeeBody(BaseModel):
    employeeId: str
    name: str
    department: Optional[str] = ""
    rate: float = 0
    rateType: str = "daily"  # 'daily' | 'hourly'

# ============================================================
#  GET /api/employees
# ============================================================
@app.get("/api/employees/next-id")
def get_next_employee_id():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT MAX(CAST(EmployeeId AS INT)) FROM Employees
        WHERE EmployeeId NOT LIKE '%[^0-9]%'
    """)
    row = cursor.fetchone()
    conn.close()
    max_id = row[0] if row[0] else 1000
    return {"nextId": str(max_id + 1)}

@app.get("/api/employees")
def get_employees():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT EmployeeId, Name, Department, Rate, RateType, FaceDescriptorJson
        FROM Employees WHERE IsActive = 1
    """)
    rows = cursor.fetchall()
    conn.close()

    employees = []
    for r in rows:
        employees.append({
            "employeeId":         r[0],
            "name":               r[1],
            "department":         r[2],
            "rate":               float(r[3]),
            "rateType":           r[4],
            "faceDescriptorJson": r[5],
        })
    return {"employees": employees}

# ============================================================
#  POST /api/recognize — ส่งรูปมา server จับหน้าเทียบ
# ============================================================
@app.post("/api/recognize")
def recognize_face(body: RecognizeFaceBody):
    img = decode_and_resize(body.imageBase64, max_size=320)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    # detect face
    faces = face_app.get(img)
    if not faces:
        return {"matched": False, "message": "ไม่พบใบหน้าในรูป"}

    query_embedding = faces[0].embedding  # ใช้หน้าแรกที่เจอ
    q_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-10)

    best_match = None
    best_score = -1

    for emp in _embed_cache:
        stored = emp["embedding"]
        s_norm = stored / (np.linalg.norm(stored) + 1e-10)
        score = float(np.dot(q_norm, s_norm))
        if score > best_score:
            best_score = score
            best_match = {k: emp[k] for k in ("employeeId", "name", "department", "rate", "rateType")}

    THRESHOLD = 0.4  # ปรับได้ใน settings
    if best_score >= THRESHOLD:
        return {
            "matched":    True,
            "employee":   best_match,
            "confidence": round(best_score * 100, 1),
        }
    return {"matched": False, "message": "ไม่พบพนักงานที่ตรงกัน", "confidence": round(best_score * 100, 1)}

# ============================================================
#  POST /api/enroll — บันทึกใบหน้าพนักงาน
# ============================================================
@app.post("/api/enroll")
def enroll_face(body: EnrollFaceBody):
    if not body.images:
        raise HTTPException(status_code=400, detail="ไม่มีรูปภาพ")

    embeddings = []
    for img_b64 in body.images:
        try:
            img = decode_and_resize(img_b64, max_size=320)
            if img is None:
                continue
            faces = face_app.get(img)
            if faces:
                embeddings.append(faces[0].embedding)
        except Exception:
            continue

    if not embeddings:
        raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในรูปที่ส่งมา")

    # Average embedding จากทุก pose
    avg_embedding = np.mean(embeddings, axis=0).tolist()
    descriptor_json = json.dumps(avg_embedding)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Employees SET FaceDescriptorJson = ?
        WHERE EmployeeId = ?
    """, descriptor_json, body.employeeId)

    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail=f"ไม่พบพนักงาน ID: {body.employeeId}")

    conn.commit()
    conn.close()
    reload_embed_cache()  # อัปเดต cache ทันที
    return {"success": True, "message": f"บันทึกใบหน้าจาก {len(embeddings)} ท่า สำเร็จ"}

# ============================================================
#  POST /api/attendance — บันทึกเวลาเข้าออก
# ============================================================
@app.post("/api/attendance")
def log_attendance(body: LogAttendanceBody):
    now      = get_bangkok_now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    log_id   = f"LOG-{int(now.timestamp() * 1000)}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO AttendanceLogs
            (Id, EmployeeId, EmployeeName, ActionType, TimestampServer, DateStr, TimeStr, ConfidenceScore, DeviceId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, log_id, body.employeeId, body.employeeName, body.actionType,
        f"{date_str} {time_str}", date_str, time_str,
        body.confidenceScore, body.deviceId)
    conn.commit()
    conn.close()

    return {
        "success":   True,
        "id":        log_id,
        "timestamp": f"{date_str} {time_str}",
        "message":   f"บันทึก {body.actionType} สำเร็จ",
    }

# ============================================================
#  GET /api/status?empId=001
# ============================================================
@app.get("/api/status")
def get_status(empId: str):
    today = get_bangkok_now().strftime("%Y-%m-%d")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ActionType, TimeStr FROM AttendanceLogs
        WHERE EmployeeId = ? AND CAST(DateStr AS DATE) = ?
        ORDER BY TimeStr
    """, empId, today)
    rows = cursor.fetchall()
    conn.close()

    actions_done = [r[0] for r in rows]
    all_actions  = ['เข้างาน', 'พักเที่ยง', 'เข้างานบ่าย', 'ออกงาน']
    next_allowed = [a for a in all_actions if a not in actions_done]

    return {
        "empId":       empId,
        "date":        today,
        "todayLogs":   [{"actionType": r[0], "timeStr": str(r[1])} for r in rows],
        "lastAction":  actions_done[-1] if actions_done else None,
        "nextAllowed": next_allowed,
    }

# ============================================================
#  GET /api/logs?week=2026-14
# ============================================================
@app.get("/api/logs")
def get_logs(week: Optional[str] = None, date: Optional[str] = None,
             page: int = 1, page_size: int = 20):
    conn = get_db()
    cursor = conn.cursor()

    if date:
        cursor.execute("""
            SELECT EmployeeId, EmployeeName, ActionType, DateStr, TimeStr
            FROM AttendanceLogs WHERE CAST(DateStr AS DATE) = ?
            ORDER BY DateStr, TimeStr
        """, date)
    elif week:
        start, end = week_to_dates(week)
        cursor.execute("""
            SELECT EmployeeId, EmployeeName, ActionType, DateStr, TimeStr
            FROM AttendanceLogs
            WHERE CAST(DateStr AS DATE) BETWEEN ? AND ?
            ORDER BY DateStr, TimeStr
        """, start, end)
    else:
        cursor.execute("""
            SELECT EmployeeId, EmployeeName, ActionType, DateStr, TimeStr
            FROM AttendanceLogs ORDER BY DateStr DESC, TimeStr DESC
        """)

    rows = cursor.fetchall()
    conn.close()

    all_logs = group_logs_to_daily(rows)
    total = len(all_logs)
    start_i = (page - 1) * page_size
    logs = all_logs[start_i: start_i + page_size]
    return {"logs": logs, "total": total, "page": page, "page_size": page_size}

# ============================================================
#  GET /api/payroll?week=2026-14
# ============================================================
@app.get("/api/payroll")
def get_payroll(week: Optional[str] = None):
    if not week:
        week = get_current_week_str()

    start, end = week_to_dates(week)

    conn = get_db()
    cursor = conn.cursor()

    # ดึง logs
    cursor.execute("""
        SELECT EmployeeId, EmployeeName, ActionType, DateStr, TimeStr
        FROM AttendanceLogs
        WHERE CAST(DateStr AS DATE) BETWEEN ? AND ?
        ORDER BY DateStr, TimeStr
    """, start, end)
    log_rows = cursor.fetchall()

    # ดึง payroll config
    cursor.execute("SELECT EmployeeId, Rate, RateType FROM PayrollConfig")
    cfg_rows = cursor.fetchall()
    rate_map = {r[0]: {"rate": float(r[1]), "rateType": r[2]} for r in cfg_rows}

    # ดึง OT
    cursor.execute("""
        SELECT EmployeeId, SUM(Hours) FROM OTLogs
        WHERE DateWork BETWEEN ? AND ? GROUP BY EmployeeId
    """, start, end)
    ot_map = {r[0]: float(r[1]) for r in cursor.fetchall()}

    conn.close()

    daily = group_logs_to_daily(log_rows)

    summary = {}
    for row in daily:
        emp_id = row["employeeId"]
        if emp_id not in summary:
            cfg = rate_map.get(emp_id, {"rate": 0, "rateType": "daily"})
            summary[emp_id] = {
                "employeeId":    emp_id,
                "name":          row["name"],
                "days":          0,
                "hours":         0.0,
                "rate":          cfg["rate"],
                "rateType":      cfg["rateType"],
                "total":         0.0,
                "lateDeduction": 0.0,
                "otHours":       0.0,
                "otAmount":      0.0,
                "netTotal":      0.0,
            }

        if row["workedHours"] > 0:
            summary[emp_id]["days"]  += 1
            summary[emp_id]["hours"] += row["workedHours"]

        if row.get("lateMins", 0) > 0 and summary[emp_id]["rateType"] == "daily":
            rate_per_min = summary[emp_id]["rate"] / WORK_MINS_PER_DAY
            summary[emp_id]["lateDeduction"] += row["lateMins"] * rate_per_min

    for emp in summary.values():
        emp["hours"] = round(emp["hours"], 2)
        if emp["rateType"] == "daily":
            emp["total"] = emp["days"] * emp["rate"]
        else:
            emp["total"] = round(emp["hours"] * emp["rate"], 2)
        emp["lateDeduction"] = round(emp["lateDeduction"], 2)
        emp["otHours"]  = round(ot_map.get(emp["employeeId"], 0), 2)
        emp["otAmount"] = round(emp["otHours"] * (emp["rate"] / 8), 2)
        emp["netTotal"] = round(emp["total"] - emp["lateDeduction"] + emp["otAmount"], 2)

    payroll        = list(summary.values())
    grand_total    = round(sum(e["total"] for e in payroll), 2)
    total_deduct   = round(sum(e["lateDeduction"] for e in payroll), 2)
    total_ot       = round(sum(e["otAmount"] for e in payroll), 2)
    grand_net      = round(sum(e["netTotal"] for e in payroll), 2)

    return {
        "week":           week,
        "payroll":        payroll,
        "grandTotal":     grand_total,
        "totalDeduction": total_deduct,
        "totalOT":        total_ot,
        "grandNetTotal":  grand_net,
    }

# ============================================================
#  POST /api/ot — บันทึก OT
# ============================================================
@app.post("/api/ot")
def log_ot(body: LogOTBody):
    conn = get_db()
    cursor = conn.cursor()

    # overwrite ถ้ามีอยู่แล้ว (MERGE)
    ot_rate = body.otRate if body.otRate else 1.0
    cursor.execute("""
        MERGE OTLogs AS target
        USING (SELECT ? AS EmployeeId, ? AS DateWork) AS source
        ON target.EmployeeId = source.EmployeeId AND target.DateWork = source.DateWork
        WHEN MATCHED THEN
            UPDATE SET Hours = ?, Note = ?, OTRate = ?, CreatedAt = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (EmployeeId, Name, DateWork, Hours, Note, OTRate)
            VALUES (?, ?, ?, ?, ?, ?);
    """, body.employeeId, body.date,
        body.hours, body.note, ot_rate,
        body.employeeId, body.employeeName, body.date, body.hours, body.note, ot_rate)

    conn.commit()
    conn.close()
    return {"success": True, "message": f"บันทึก OT {body.hours} ชม. สำเร็จ"}

# ============================================================
#  GET /api/dashboard?date=2026-04-09
# ============================================================
@app.get("/api/dashboard")
def get_dashboard(date: Optional[str] = None):
    target_date = date or get_bangkok_now().strftime("%Y-%m-%d")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT EmployeeId, Name FROM Employees WHERE IsActive = 1")
    all_employees = [{"employeeId": r[0], "name": r[1]} for r in cursor.fetchall()]

    cursor.execute("""
        SELECT EmployeeId, ActionType, TimeStr FROM AttendanceLogs
        WHERE CAST(DateStr AS DATE) = ?
        ORDER BY TimeStr
    """, target_date)
    log_rows = cursor.fetchall()
    conn.close()

    checked_in = {}
    for r in log_rows:
        emp_id, action, time_str = r[0], r[1], str(r[2])
        if emp_id not in checked_in:
            checked_in[emp_id] = {"actions": [], "inTime": None}
        checked_in[emp_id]["actions"].append(action)
        if action == "เข้างาน" and not checked_in[emp_id]["inTime"]:
            checked_in[emp_id]["inTime"] = time_str

    present, absent, late = [], [], []
    for emp in all_employees:
        emp_id = emp["employeeId"]
        if emp_id in checked_in:
            info = checked_in[emp_id]
            late_mins = 0
            if info["inTime"]:
                in_mins  = time_to_minutes(info["inTime"])
                exp_mins = time_to_minutes(SCHEDULE["เข้างาน"]["expected"])
                grace    = SCHEDULE["เข้างาน"]["graceMin"]
                diff     = in_mins - exp_mins
                if diff >= grace:
                    late_mins = diff

            entry = {**emp, "inTime": info["inTime"], "actions": info["actions"], "lateMins": late_mins}
            present.append(entry)
            if late_mins > 0:
                late.append(entry)
        else:
            absent.append(emp)

    return {
        "date":    target_date,
        "total":   len(all_employees),
        "present": present,
        "absent":  absent,
        "late":    late,
    }

# ============================================================
#  POST /api/employees — เพิ่มพนักงานใหม่
# ============================================================
@app.post("/api/employees")
def create_employee(body: CreateEmployeeBody):
    conn = get_db()
    cursor = conn.cursor()
    # ตรวจว่า employeeId ซ้ำมั้ย
    cursor.execute("SELECT 1 FROM Employees WHERE EmployeeId = ?", body.employeeId)
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="EmployeeId นี้มีอยู่แล้ว")

    cursor.execute("""
        INSERT INTO Employees (EmployeeId, Name, Department, IsActive, Rate, RateType)
        VALUES (?, ?, ?, 1, ?, ?)
    """, body.employeeId, body.name, body.department, body.rate, body.rateType)

    # sync PayrollConfig ด้วย
    cursor.execute("""
        MERGE PayrollConfig AS target
        USING (SELECT ? AS EmployeeId, ? AS Name, ? AS Rate, ? AS RateType) AS src
        ON target.EmployeeId = src.EmployeeId
        WHEN MATCHED THEN UPDATE SET Name=src.Name, Rate=src.Rate, RateType=src.RateType
        WHEN NOT MATCHED THEN INSERT (EmployeeId, Name, Rate, RateType) VALUES (src.EmployeeId, src.Name, src.Rate, src.RateType);
    """, body.employeeId, body.name, body.rate, body.rateType)

    conn.commit()
    conn.close()
    return {"success": True, "message": f"เพิ่มพนักงาน {body.name} เรียบร้อย"}

# ============================================================
#  PUT /api/employees/{employeeId} — แก้ไขข้อมูลพนักงาน
# ============================================================
@app.put("/api/employees/{employee_id}")
def update_employee(employee_id: str, body: UpdateEmployeeBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Employees SET Name=?, Department=?, Rate=?, RateType=?
        WHERE EmployeeId=? AND IsActive=1
    """, body.name, body.department, body.rate, body.rateType, employee_id)
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบพนักงาน")
    cursor.execute("""
        MERGE PayrollConfig AS target
        USING (SELECT ? AS EmployeeId, ? AS Name, ? AS Rate, ? AS RateType) AS src
        ON target.EmployeeId = src.EmployeeId
        WHEN MATCHED THEN UPDATE SET Name=src.Name, Rate=src.Rate, RateType=src.RateType
        WHEN NOT MATCHED THEN INSERT (EmployeeId, Name, Rate, RateType) VALUES (src.EmployeeId, src.Name, src.Rate, src.RateType);
    """, employee_id, body.name, body.rate, body.rateType)
    conn.commit()
    conn.close()
    return {"success": True, "message": f"อัปเดตข้อมูล {body.name} เรียบร้อย"}

# ============================================================
#  DELETE /api/employees/{employeeId} — ปิดใช้งานพนักงาน
# ============================================================
@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE Employees SET IsActive = 0 WHERE EmployeeId = ?", employee_id)
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบพนักงาน")
    conn.commit()
    conn.close()
    return {"success": True, "message": "ปิดใช้งานพนักงานแล้ว"}

# ============================================================
#  GET /api/employees/{id}/logs — ประวัติการมาทำงานรายคน
# ============================================================
@app.get("/api/employees/{employee_id}/logs")
def get_employee_logs(employee_id: str, limit: int = 60):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT TOP (?) EmployeeId, EmployeeName, ActionType, DateStr, TimeStr
        FROM AttendanceLogs
        WHERE EmployeeId = ?
        ORDER BY DateStr DESC, TimeStr DESC
    """, limit, employee_id)
    rows = cursor.fetchall()
    conn.close()
    return {"logs": group_logs_to_daily(rows)}

# ============================================================
#  GET /api/employees/{id}/payroll — ประวัติงวดค่าแรงรายคน
# ============================================================
@app.get("/api/employees/{employee_id}/payroll")
def get_employee_payroll(employee_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT pp.Id, pp.StartDate, pp.EndDate, pp.Status, pp.PaidAt,
               pi.WorkDays, pi.BaseAmount, pi.LateDeduction, pi.OTHours, pi.OTAmount, pi.NetTotal
        FROM PayrollPeriodItems pi
        JOIN PayrollPeriods pp ON pi.PeriodId = pp.Id
        WHERE pi.EmployeeId = ?
        ORDER BY pp.Id DESC
    """, employee_id)
    rows = cursor.fetchall()
    conn.close()
    return {"history": [
        {
            "periodId":      r[0],
            "startDate":     str(r[1]),
            "endDate":       str(r[2]),
            "status":        r[3],
            "paidAt":        str(r[4]) if r[4] else None,
            "workDays":      r[5],
            "baseAmount":    float(r[6]),
            "lateDeduction": float(r[7]),
            "otHours":       float(r[8]),
            "otAmount":      float(r[9]),
            "netTotal":      float(r[10]),
        } for r in rows
    ]}

# ============================================================
#  POST /api/payroll/periods — สร้างงวดการจ่าย (snapshot)
# ============================================================
@app.post("/api/payroll/periods")
def create_payroll_period(body: CreatePayrollPeriodBody):
    import datetime as dt
    conn = get_db()
    cursor = conn.cursor()

    # โหลด employees
    cursor.execute("SELECT EmployeeId, Name, Department, Rate, RateType FROM Employees WHERE IsActive=1")
    employees = cursor.fetchall()

    # โหลด attendance logs ในช่วงวันที่
    cursor.execute("""
        SELECT EmployeeId, Name, ActionType, DateStr, TimeStr
        FROM AttendanceLogs
        WHERE CAST(DateStr AS DATE) BETWEEN ? AND ?
        ORDER BY EmployeeId, DateStr, TimeStr
    """, body.startDate, body.endDate)
    log_rows = cursor.fetchall()

    # โหลด OT logs ในช่วงวันที่
    cursor.execute("""
        SELECT EmployeeId, Hours, OTRate
        FROM OTLogs
        WHERE DateWork BETWEEN ? AND ?
    """, body.startDate, body.endDate)
    ot_rows = cursor.fetchall()

    # รวม OT ต่อคน
    ot_map = {}
    for r in ot_rows:
        emp_id, hrs, rate = r[0], float(r[1]), float(r[2])
        if emp_id not in ot_map:
            ot_map[emp_id] = {"hours": 0, "amount": 0}
        ot_map[emp_id]["hours"] += hrs

    # คำนวณ payroll ต่อคน
    daily_logs = group_logs_to_daily(log_rows)
    emp_map = {r[0]: r for r in employees}

    items = []
    grand_total = 0

    for emp_id, emp_data in emp_map.items():
        name, dept, rate, rate_type = emp_data[1], emp_data[2], float(emp_data[3]), emp_data[4]
        hourly_rate = rate / 8

        # กรอง logs ของคนนี้
        emp_daily = [d for d in daily_logs.values() if d["employeeId"] == emp_id]
        work_days = len([d for d in emp_daily if d["in"] != "-"])
        base = rate * work_days if rate_type == "daily" else 0

        # หักมาสาย (นาที → บาท)
        late_deduction = 0
        for d in emp_daily:
            if d.get("lateMins", 0) > 0:
                late_deduction += round(hourly_rate / 60 * d["lateMins"], 2)

        # OT
        ot_hours = ot_map.get(emp_id, {}).get("hours", 0)
        ot_amount = round(hourly_rate * ot_hours, 2)

        net = round(base - late_deduction + ot_amount, 2)
        grand_total += net

        items.append({
            "employeeId":    emp_id,
            "name":          name,
            "department":    dept or "",
            "workDays":      work_days,
            "baseAmount":    base,
            "lateDeduction": late_deduction,
            "otHours":       ot_hours,
            "otAmount":      ot_amount,
            "netTotal":      net,
        })

    # บันทึก PayrollPeriods
    cursor.execute("""
        INSERT INTO PayrollPeriods (StartDate, EndDate, GrandTotal, Status)
        VALUES (?, ?, ?, 'Unpaid')
    """, body.startDate, body.endDate, round(grand_total, 2))
    period_id = cursor.execute("SELECT @@IDENTITY").fetchone()[0]

    # บันทึก PayrollPeriodItems
    for item in items:
        cursor.execute("""
            INSERT INTO PayrollPeriodItems
              (PeriodId, EmployeeId, Name, Department, WorkDays, BaseAmount, LateDeduction, OTHours, OTAmount, NetTotal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, period_id, item["employeeId"], item["name"], item["department"],
            item["workDays"], item["baseAmount"], item["lateDeduction"],
            item["otHours"], item["otAmount"], item["netTotal"])

    conn.commit()
    conn.close()
    return {"success": True, "periodId": int(period_id), "grandTotal": round(grand_total, 2), "items": items}

# ============================================================
#  GET /api/payroll/periods — ดูประวัติงวดทั้งหมด
# ============================================================
@app.get("/api/payroll/periods")
def get_payroll_periods():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT Id, StartDate, EndDate, GrandTotal, Status, PaidAt, CreatedAt
        FROM PayrollPeriods ORDER BY Id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return {"periods": [
        {
            "id":         r[0],
            "startDate":  str(r[1]),
            "endDate":    str(r[2]),
            "grandTotal": float(r[3]),
            "status":     r[4],
            "paidAt":     str(r[5]) if r[5] else None,
            "createdAt":  str(r[6]),
        } for r in rows
    ]}

# ============================================================
#  GET /api/payroll/periods/{id} — ดูรายละเอียดงวด
# ============================================================
@app.get("/api/payroll/periods/{period_id}")
def get_payroll_period_detail(period_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT Id, StartDate, EndDate, GrandTotal, Status, PaidAt FROM PayrollPeriods WHERE Id=?", period_id)
    p = cursor.fetchone()
    if not p:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบงวดนี้")
    cursor.execute("""
        SELECT EmployeeId, Name, Department, WorkDays, BaseAmount, LateDeduction, OTHours, OTAmount, NetTotal
        FROM PayrollPeriodItems WHERE PeriodId=?
    """, period_id)
    items = [{"employeeId": r[0], "name": r[1], "department": r[2], "workDays": r[3],
              "baseAmount": float(r[4]), "lateDeduction": float(r[5]),
              "otHours": float(r[6]), "otAmount": float(r[7]), "netTotal": float(r[8])} for r in cursor.fetchall()]
    conn.close()
    return {"id": p[0], "startDate": str(p[1]), "endDate": str(p[2]),
            "grandTotal": float(p[3]), "status": p[4], "paidAt": str(p[5]) if p[5] else None, "items": items}

# ============================================================
#  PUT /api/payroll/periods/{id}/pay — ยืนยันจ่ายเงิน
# ============================================================
@app.put("/api/payroll/periods/{period_id}/pay")
def pay_payroll_period(period_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE PayrollPeriods SET Status='Paid', PaidAt=GETDATE() WHERE Id=? AND Status='Unpaid'
    """, period_id)
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=400, detail="งวดนี้จ่ายแล้ว หรือไม่พบ")
    conn.commit()
    conn.close()
    return {"success": True, "message": "ยืนยันการจ่ายเงินเรียบร้อย"}

# ============================================================
#  Helpers
# ============================================================
def time_to_minutes(time_str: str) -> int:
    parts = str(time_str).split(":")
    return int(parts[0]) * 60 + int(parts[1])

def get_current_week_str() -> str:
    now = get_bangkok_now()
    return now.strftime("%Y-%W")

def week_to_dates(week_str: str):
    import datetime as dt
    year, week = week_str.split("-")
    monday = dt.datetime.strptime(f"{year}-W{week}-1", "%Y-W%W-%w").date()
    sunday = monday + dt.timedelta(days=6)
    return str(monday), str(sunday)

def group_logs_to_daily(rows):
    map_ = {}
    for r in rows:
        emp_id, name, action, date_val, time_val = r[0], r[1], r[2], str(r[3]), str(r[4])
        key = f"{emp_id}_{date_val}"
        if key not in map_:
            map_[key] = {
                "employeeId":  emp_id,
                "name":        name,
                "date":        date_val,
                "in":          "-",
                "breakOut":    "-",
                "breakIn":     "-",
                "out":         "-",
                "workedHours": 0,
                "lateMins":    0,
                "status":      "incomplete",
            }
        entry = map_[key]
        if action == "เข้างาน":      entry["in"]       = time_val
        if action == "พักเที่ยง":    entry["breakOut"] = time_val
        if action == "เข้างานบ่าย":  entry["breakIn"]  = time_val
        if action == "ออกงาน":       entry["out"]      = time_val

    for entry in map_.values():
        # คำนวณสาย
        for action_type, field in [("เข้างาน", "in"), ("เข้างานบ่าย", "breakIn")]:
            sched = SCHEDULE.get(action_type)
            actual = entry[field]
            if sched and actual != "-":
                diff = time_to_minutes(actual) - time_to_minutes(sched["expected"])
                if diff >= sched["graceMin"]:
                    entry["lateMins"] += diff

        if entry["out"] == "-":
            continue

        total_mins = 0
        if entry["in"] != "-":
            in_m  = time_to_minutes(entry["in"])
            out_m = time_to_minutes(entry["out"])
            break_m = 0
            if entry["breakOut"] != "-" and entry["breakIn"] != "-":
                break_m = time_to_minutes(entry["breakIn"]) - time_to_minutes(entry["breakOut"])
            total_mins = out_m - in_m - break_m
        elif entry["breakIn"] != "-":
            total_mins = time_to_minutes(entry["out"]) - time_to_minutes(entry["breakIn"])

        if total_mins > 0:
            entry["workedHours"] = round(total_mins / 60, 2)
            entry["status"]      = "complete"

    return sorted(map_.values(), key=lambda x: x["date"])
