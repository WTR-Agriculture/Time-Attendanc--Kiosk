"""
Time Attendance — FastAPI Backend
รันด้วย: uvicorn main:app --host 0.0.0.0 --port 8001
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pyodbc
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
    'เข้างาน':     {'expected': '08:00', 'graceMin': 16},
    'เข้างานบ่าย': {'expected': '13:00', 'graceMin': 16},
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
#  DB helper
# ============================================================
def get_db():
    conn = pyodbc.connect(DB_CONN_STR)
    conn.autocommit = True
    return conn

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
    manualDate: Optional[str] = None  # YYYY-MM-DD (ถ้าไม่ส่งใช้เวลา server)
    manualTime: Optional[str] = None  # HH:MM (ถ้าไม่ส่งใช้เวลา server)
    note: Optional[str] = ""

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

class CreateSpecialHourLogBody(BaseModel):
    employeeId: str
    employeeName: str
    workDate: str
    hours: float
    hourlyRate: float
    note: Optional[str] = ""

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
        SELECT EmployeeId, Name, Department, Rate, RateType, IsActive
        FROM Employees ORDER BY IsActive DESC, Name
    """)
    rows = cursor.fetchall()
    conn.close()
    return {"employees": [
        {"employeeId": r[0], "name": r[1], "department": r[2],
         "rate": float(r[3]), "rateType": r[4], "isActive": bool(r[5])}
        for r in rows
    ]}

# ============================================================
#  POST /api/attendance — บันทึกเวลาเข้าออก
# ============================================================
@app.post("/api/attendance")
def log_attendance(body: LogAttendanceBody):
    now = get_bangkok_now()
    date_str = body.manualDate if body.manualDate else now.strftime("%Y-%m-%d")
    time_str = (body.manualTime + ":00") if body.manualTime else now.strftime("%H:%M:%S")
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

    # ดึง OT (weighted = Hours × OTRate เพื่อคำนวณค่า OT ที่ถูกต้อง)
    cursor.execute("""
        SELECT EmployeeId, SUM(Hours), SUM(Hours * OTRate) FROM OTLogs
        WHERE DateWork BETWEEN ? AND ? GROUP BY EmployeeId
    """, start, end)
    ot_map = {r[0]: {"hours": float(r[1]), "weighted": float(r[2])} for r in cursor.fetchall()}

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
            if summary[emp_id]["rateType"] == "daily":
                hourly = summary[emp_id]["rate"] / 8
                summary[emp_id]["total"] += round(min(row.get("paidHours", 0), 8) * hourly, 2)

        if row.get("lateMins", 0) > 0 and summary[emp_id]["rateType"] == "daily":
            rate_per_min = summary[emp_id]["rate"] / WORK_MINS_PER_DAY
            summary[emp_id]["lateDeduction"] += row["lateMins"] * rate_per_min

    for emp in summary.values():
        emp["hours"] = round(emp["hours"], 2)
        if emp["rateType"] == "hourly":
            emp["total"] = round(emp["hours"] * emp["rate"], 2)
        else:
            emp["total"] = round(emp["total"], 2)
        emp["lateDeduction"] = round(emp["lateDeduction"], 2)
        ot_entry = ot_map.get(emp["employeeId"], {"hours": 0, "weighted": 0})
        emp["otHours"]  = round(ot_entry["hours"], 2)
        emp["otAmount"] = round(ot_entry["weighted"] * (emp["rate"] / 8), 2)
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
#  GET /api/ot — ดึงรายการ OT (filter: employeeId, month=YYYY-MM)
# ============================================================
@app.get("/api/ot")
def get_ot(employeeId: Optional[str] = None, month: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT EmployeeId, Name, DateWork, Hours, Note, OTRate FROM OTLogs WHERE 1=1"
    params = []
    if employeeId:
        query += " AND EmployeeId=?"
        params.append(employeeId)
    if month:
        query += " AND CONVERT(varchar(7), DateWork, 120)=?"
        params.append(month)
    query += " ORDER BY DateWork DESC"
    cursor.execute(query, *params)
    logs = [{"employeeId": r[0], "name": r[1], "dateWork": str(r[2])[:10],
             "hours": float(r[3]), "note": r[4] or "", "otRate": float(r[5])}
            for r in cursor.fetchall()]
    conn.close()
    return {"otLogs": logs}

@app.delete("/api/ot/{employee_id}/{date}")
def delete_ot(employee_id: str, date: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM OTLogs WHERE EmployeeId=? AND DateWork=?", employee_id, date)
    conn.commit()
    conn.close()
    return {"success": True}

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
                in_mins      = time_to_minutes(info["inTime"])
                is_afternoon = in_mins >= 12 * 60
                sched        = SCHEDULE["เข้างานบ่าย"] if is_afternoon else SCHEDULE["เข้างาน"]
                diff         = in_mins - time_to_minutes(sched["expected"])
                if diff >= sched["graceMin"]:
                    late_mins = diff - 15

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
#  PUT /api/employees/{id}/active — เปิด/ปิดใช้งานพนักงาน
# ============================================================
class SetActiveBody(BaseModel):
    isActive: bool

@app.put("/api/employees/{employee_id}/active")
def set_employee_active(employee_id: str, body: SetActiveBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE Employees SET IsActive = ? WHERE EmployeeId = ?",
                   1 if body.isActive else 0, employee_id)
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบพนักงาน")
    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  DELETE /api/employees/{employeeId} — ปิดใช้งานพนักงาน (legacy)
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
        SELECT EmployeeId, EmployeeName, ActionType, DateStr, TimeStr
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

    # รวม OT ต่อคน (weighted = Hours × OTRate)
    ot_map = {}
    for r in ot_rows:
        emp_id, hrs, ot_rate = r[0], float(r[1]), float(r[2])
        if emp_id not in ot_map:
            ot_map[emp_id] = {"hours": 0, "weighted": 0}
        ot_map[emp_id]["hours"]    += hrs
        ot_map[emp_id]["weighted"] += hrs * ot_rate

    # คำนวณ payroll ต่อคน
    daily_logs = group_logs_to_daily(log_rows)
    emp_map = {r[0]: r for r in employees}

    items = []
    grand_total = 0

    for emp_id, emp_data in emp_map.items():
        name, dept, rate, rate_type = emp_data[1], emp_data[2], float(emp_data[3]), emp_data[4]
        hourly_rate = rate / 8

        # กรอง logs ของคนนี้ (daily_logs เป็น list)
        emp_daily = [d for d in daily_logs if d["employeeId"] == emp_id]
        work_days = round(sum(round(min(d["paidHours"], 8) / 8 * 2) / 2 for d in emp_daily if d["workedHours"] > 0), 2)
        if rate_type == "daily":
            base = round(sum(min(d["paidHours"], 8) * hourly_rate for d in emp_daily if d["workedHours"] > 0), 2)
        else:
            base = round(sum(d["workedHours"] * rate for d in emp_daily if d["workedHours"] > 0), 2)

        # หักมาสาย (นาที → บาท) — half-day ไม่หัก (lateMins=0 อยู่แล้ว)
        late_deduction = 0
        for d in emp_daily:
            if d.get("lateMins", 0) > 0:
                late_deduction += round(hourly_rate / 60 * d["lateMins"], 2)

        # OT (weighted คำนวณรวม OTRate แล้ว)
        ot_entry  = ot_map.get(emp_id, {"hours": 0, "weighted": 0})
        ot_hours  = ot_entry["hours"]
        ot_amount = round(hourly_rate * ot_entry["weighted"], 2)

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

    recalc_period_status(cursor, period_id)
    conn.commit()
    conn.close()
    return {"success": True, "periodId": int(period_id), "grandTotal": round(grand_total, 2), "items": items}

# ============================================================
#  GET /api/payroll/periods — ดูประวัติงวดทั้งหมด
# ============================================================
#  GET /api/payroll/summary — ยอดรวมค่าแรงที่จ่ายแล้ว
#  query: year=YYYY, month=MM (optional)
# ============================================================
@app.get("/api/payroll/summary")
def get_payroll_summary(year: Optional[int] = None, month: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    total_paid = period_count = emp_count = 0
    cash_total = transfer_total = 0.0
    try:
        conditions = ["i.PaidStatus = 'Paid'"]
        params = []
        if year:
            conditions.append("YEAR(p.StartDate) = ?")
            params.append(year)
        if month:
            conditions.append("MONTH(p.StartDate) = ?")
            params.append(month)
        where = " AND ".join(conditions)
        cursor.execute(f"""
            SELECT
                ISNULL(SUM(i.NetTotal), 0),
                COUNT(DISTINCT p.Id),
                COUNT(*)
            FROM PayrollPeriodItems i
            JOIN PayrollPeriods p ON i.PeriodId = p.Id
            WHERE {where}
        """, *params)
        row = cursor.fetchone()
        total_paid   = float(row[0])
        period_count = int(row[1])
        emp_count    = int(row[2])
        try:
            cursor.execute(f"""
                SELECT
                    ISNULL(SUM(CASE WHEN i.PaymentMethod = 'เงินสด' THEN i.NetTotal ELSE 0 END), 0),
                    ISNULL(SUM(CASE WHEN i.PaymentMethod = 'โอน'    THEN i.NetTotal ELSE 0 END), 0)
                FROM PayrollPeriodItems i
                JOIN PayrollPeriods p ON i.PeriodId = p.Id
                WHERE {where}
            """, *params)
            pm_row = cursor.fetchone()
            cash_total     = float(pm_row[0])
            transfer_total = float(pm_row[1])
        except Exception:
            pass
    finally:
        conn.close()
    return {
        "totalPaid":     total_paid,
        "cashTotal":     cash_total,
        "transferTotal": transfer_total,
        "periodCount":   period_count,
        "employeeCount": emp_count,
    }

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
    periods = [
        {
            "id":          r[0],
            "startDate":   str(r[1]),
            "endDate":     str(r[2]),
            "grandTotal":  float(r[3]),
            "status":      r[4],
            "paidAt":      str(r[5]) if r[5] else None,
            "createdAt":   str(r[6]),
            "unpaidItems": 0,
        } for r in rows
    ]
    try:
        cursor.execute("""
            SELECT PeriodId, COUNT(*)
            FROM PayrollPeriodItems
            WHERE ISNULL(PaidStatus, 'Unpaid') != 'Paid'
              AND ISNULL(IsDeferred, 0) = 0
              AND (NetTotal > 0 OR PieceRateTotal > 0 OR AdvanceDeduction > 0)
            GROUP BY PeriodId
        """)
        unpaid_map = {r[0]: r[1] for r in cursor.fetchall()}
        for p in periods:
            p["unpaidItems"] = unpaid_map.get(p["id"], 0)
    except Exception:
        pass
    try:
        cursor.execute("""
            SELECT PeriodId, COUNT(*)
            FROM PayrollPeriodItems
            WHERE ISNULL(IsDeferred,0) = 1
              AND ISNULL(PaidStatus,'Unpaid') != 'Paid'
            GROUP BY PeriodId
        """)
        deferred_map = {r[0]: r[1] for r in cursor.fetchall()}
        for p in periods:
            p["deferredCount"] = deferred_map.get(p["id"], 0)
    except Exception:
        for p in periods:
            p["deferredCount"] = 0
    conn.close()
    return {"periods": periods}

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
    # query base (ทำงานได้แม้ยังไม่มี PaidStatus/PaidAt/PaymentMethod)
    cursor.execute("""
        SELECT EmployeeId, Name, Department, WorkDays, BaseAmount, LateDeduction,
               OTHours, OTAmount, PieceRateTotal, AdvanceDeduction, NetTotal
        FROM PayrollPeriodItems WHERE PeriodId=? ORDER BY Name
    """, period_id)
    base_rows = cursor.fetchall()
    items = [{"employeeId": r[0], "name": r[1], "department": r[2], "workDays": r[3],
              "baseAmount": float(r[4]), "lateDeduction": float(r[5]),
              "otHours": float(r[6]), "otAmount": float(r[7]),
              "pieceRateTotal": float(r[8]), "advanceDeduction": float(r[9]),
              "netTotal": float(r[10]), "pieceLogs": [],
              "paidStatus": "Unpaid", "paidAt": None, "paymentMethod": None, "isDeferred": False}
             for r in base_rows]

    # เพิ่ม PaidStatus/PaidAt/PaymentMethod/IsDeferred ถ้ามีคอลัมน์แล้ว
    try:
        cursor.execute("""
            SELECT EmployeeId, PaidStatus, PaidAt, PaymentMethod, ISNULL(IsDeferred,0)
            FROM PayrollPeriodItems WHERE PeriodId=? ORDER BY Name
        """, period_id)
        for row in cursor.fetchall():
            for item in items:
                if item["employeeId"] == row[0]:
                    item["paidStatus"]    = row[1]
                    item["paidAt"]        = str(row[2]) if row[2] else None
                    item["paymentMethod"] = row[3]
                    item["isDeferred"]    = bool(row[4])
                    break
    except Exception:
        pass  # คอลัมน์ยังไม่มี ใช้ค่า default ที่ set ไว้แล้ว

    # ดึง piece rate logs ของงวดนี้
    cursor.execute("""
        SELECT pl.Id, pl.EmployeeId, pm.JobName, pm.Unit,
               pl.Quantity, pl.UnitLength, pl.UnitPrice, pl.TotalAmount, pl.Note
        FROM PieceRateLogs pl JOIN PieceRateMaster pm ON pl.JobId = pm.Id
        WHERE pl.PeriodId = ?
        ORDER BY pl.EmployeeId, pl.Id
    """, period_id)
    piece_rows = cursor.fetchall()

    # ดึงยอดค้างเบิกรวม (ไม่จำกัดช่วงงวด)
    emp_ids = [item["employeeId"] for item in items]
    balance_map = {}
    if emp_ids:
        cursor.execute(f"""
            SELECT EmployeeId,
                   SUM(CASE WHEN Type=? THEN Amount ELSE -Amount END)
            FROM WageAdvances
            WHERE EmployeeId IN ({','.join(['?']*len(emp_ids))})
            GROUP BY EmployeeId
        """, 'เบิก', *emp_ids)
        balance_map = {r[0]: max(0.0, float(r[1])) for r in cursor.fetchall()}

    # ดึง special hours ของงวดนี้ (date range)
    sh_by_emp = {}
    sh_detail_by_emp = {}
    try:
        if emp_ids:
            cursor.execute(f"""
                SELECT EmployeeId, Id, WorkDate, Hours, HourlyRate, Amount, Note
                FROM SpecialHourLogs
                WHERE EmployeeId IN ({','.join(['?']*len(emp_ids))})
                  AND WorkDate BETWEEN ? AND ?
                ORDER BY EmployeeId, WorkDate
            """, *emp_ids, str(p[1]), str(p[2]))
            for r in cursor.fetchall():
                eid = r[0]
                if eid not in sh_by_emp:
                    sh_by_emp[eid] = {"hours": 0.0, "amount": 0.0}
                    sh_detail_by_emp[eid] = []
                sh_by_emp[eid]["hours"]  += float(r[3])
                sh_by_emp[eid]["amount"] += float(r[5])
                sh_detail_by_emp[eid].append({
                    "id": r[1], "workDate": str(r[2]), "hours": float(r[3]),
                    "hourlyRate": float(r[4]), "amount": float(r[5]), "note": r[6] or ""
                })
    except Exception:
        pass

    # merge deferred info
    try:
        cursor.execute("""
            SELECT ppi.EmployeeId, ISNULL(ppi.MergedDeferredPeriodId,0),
                   ISNULL(ppi.MergedDeferredAmount,0), pp.StartDate, pp.EndDate
            FROM PayrollPeriodItems ppi
            LEFT JOIN PayrollPeriods pp ON pp.Id = ppi.MergedDeferredPeriodId
            WHERE ppi.PeriodId=?
        """, period_id)
        for row in cursor.fetchall():
            for item in items:
                if item["employeeId"] == row[0]:
                    item["mergedDeferredPeriodId"]  = row[1] or None
                    item["mergedDeferredAmount"]     = float(row[2])
                    item["mergedDeferredStartDate"]  = str(row[3]) if row[3] else None
                    item["mergedDeferredEndDate"]    = str(row[4]) if row[4] else None
                    break
    except Exception:
        for item in items:
            item.update({"mergedDeferredPeriodId": None, "mergedDeferredAmount": 0.0,
                         "mergedDeferredStartDate": None, "mergedDeferredEndDate": None})

    # pending deferred ของพนักงานแต่ละคนในงวดอื่น
    pending_map = {}
    if emp_ids:
        try:
            cursor.execute(f"""
                SELECT ppi.EmployeeId, ppi.PeriodId, pp.StartDate, pp.EndDate, ppi.NetTotal
                FROM PayrollPeriodItems ppi
                JOIN PayrollPeriods pp ON pp.Id = ppi.PeriodId
                WHERE ppi.EmployeeId IN ({','.join(['?']*len(emp_ids))})
                  AND ppi.PeriodId != ?
                  AND ISNULL(ppi.IsDeferred,0) = 1
                  AND ISNULL(ppi.PaidStatus,'Unpaid') != 'Paid'
                  AND ISNULL(ppi.MergedDeferredPeriodId,0) = 0
                ORDER BY ppi.PeriodId DESC
            """, *emp_ids, period_id)
            for row in cursor.fetchall():
                eid = row[0]
                if eid not in pending_map:
                    pending_map[eid] = {"periodId": row[1], "startDate": str(row[2]),
                                        "endDate": str(row[3]), "netTotal": float(row[4])}
        except Exception:
            pass

    conn.close()

    piece_by_emp = {}
    for r in piece_rows:
        emp_id = r[1]
        if emp_id not in piece_by_emp:
            piece_by_emp[emp_id] = []
        piece_by_emp[emp_id].append({
            "id": r[0], "jobName": r[2], "unit": r[3],
            "quantity": float(r[4]), "unitLength": float(r[5]),
            "unitPrice": float(r[6]), "totalAmount": float(r[7]), "note": r[8] or "",
        })

    for item in items:
        item["pieceLogs"]          = piece_by_emp.get(item["employeeId"], [])
        item["outstandingAdvance"] = balance_map.get(item["employeeId"], 0.0)
        item["specialHoursTotal"]  = sh_by_emp.get(item["employeeId"], {}).get("amount", 0.0)
        item["specialHoursHours"]  = sh_by_emp.get(item["employeeId"], {}).get("hours", 0.0)
        item["specialHoursLogs"]   = sh_detail_by_emp.get(item["employeeId"], [])
        item["pendingDeferred"]    = pending_map.get(item["employeeId"])

    return {"id": p[0], "startDate": str(p[1]), "endDate": str(p[2]),
            "grandTotal": float(p[3]), "status": p[4], "paidAt": str(p[5]) if p[5] else None, "items": items}

# ============================================================
#  helper — คำนวณ status งวดใหม่ (นับเฉพาะ non-deferred)
# ============================================================
def recalc_period_status(cursor, period_id):
    cursor.execute("""
        SELECT
            SUM(CASE WHEN PaidStatus='Paid' THEN 1 ELSE 0 END),
            SUM(CASE WHEN PaidStatus='Unpaid' AND ISNULL(IsDeferred,0)=0
                      AND (NetTotal > 0 OR PieceRateTotal > 0 OR AdvanceDeduction > 0)
                     THEN 1 ELSE 0 END)
        FROM PayrollPeriodItems WHERE PeriodId=?
    """, period_id)
    row = cursor.fetchone()
    paid_count, unpaid_active = (row[0] or 0), (row[1] or 0)
    if unpaid_active == 0:
        cursor.execute(
            "UPDATE PayrollPeriods SET Status='Paid', PaidAt=COALESCE(PaidAt,GETDATE()) WHERE Id=?", period_id)
    elif paid_count > 0:
        cursor.execute("UPDATE PayrollPeriods SET Status='Partial' WHERE Id=?", period_id)
    else:
        cursor.execute("UPDATE PayrollPeriods SET Status='Unpaid' WHERE Id=?", period_id)

# ============================================================
#  PUT /api/payroll/periods/{id}/items/{employee_id}/defer — toggle เลื่อนจ่าย
# ============================================================
@app.put("/api/payroll/periods/{period_id}/items/{employee_id}/defer")
def toggle_defer_item(period_id: int, employee_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT PaidStatus, ISNULL(IsDeferred,0) FROM PayrollPeriodItems
        WHERE PeriodId=? AND EmployeeId=?
    """, period_id, employee_id)
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    if row[0] == 'Paid':
        conn.close()
        raise HTTPException(status_code=400, detail="จ่ายแล้ว ไม่สามารถเลื่อนได้")
    new_deferred = 0 if row[1] else 1
    cursor.execute("""
        UPDATE PayrollPeriodItems SET IsDeferred=? WHERE PeriodId=? AND EmployeeId=?
    """, new_deferred, period_id, employee_id)
    recalc_period_status(cursor, period_id)
    conn.commit()
    conn.close()
    return {"success": True, "isDeferred": bool(new_deferred)}

# ============================================================
#  PUT /api/payroll/periods/{id}/items/{employee_id}/pay — จ่ายรายคน
# ============================================================
class PayItemBody(BaseModel):
    paymentMethod: str = "เงินสด"

@app.put("/api/payroll/periods/{period_id}/items/{employee_id}/pay")
def pay_payroll_period_item(period_id: int, employee_id: str, body: PayItemBody):
    conn = get_db()
    cursor = conn.cursor()

    # ตรวจว่า item มีอยู่และยังไม่จ่าย
    cursor.execute("""
        SELECT PaidStatus, AdvanceDeduction, Name, ISNULL(MergedDeferredPeriodId,0)
        FROM PayrollPeriodItems WHERE PeriodId=? AND EmployeeId=?
    """, period_id, employee_id)
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    if row[0] == 'Paid':
        conn.close()
        raise HTTPException(status_code=400, detail="จ่ายแล้ว")

    advance_deduction, emp_name, merged_period_id = float(row[1]), row[2], row[3]

    # อัปเดต item
    cursor.execute("""
        UPDATE PayrollPeriodItems
        SET PaidStatus='Paid', PaidAt=GETDATE(), PaymentMethod=?
        WHERE PeriodId=? AND EmployeeId=?
    """, body.paymentMethod, period_id, employee_id)

    # ถ้ามีรวมจ่ายจากงวดเก่า → mark งวดเก่าว่าจ่ายแล้วด้วย
    if merged_period_id:
        cursor.execute("""
            UPDATE PayrollPeriodItems
            SET PaidStatus='Paid', PaidAt=GETDATE(), PaymentMethod=?, IsDeferred=0
            WHERE PeriodId=? AND EmployeeId=?
        """, body.paymentMethod, merged_period_id, employee_id)
        recalc_period_status(cursor, merged_period_id)

    # บันทึกหักเบิก (ถ้ามี)
    if advance_deduction > 0:
        cursor.execute("""
            INSERT INTO WageAdvances (EmployeeId, EmployeeName, TranDate, Type, Amount, Note, PeriodId)
            VALUES (?, ?, CAST(GETDATE() AS DATE), ?, ?, ?, ?)
        """, employee_id, emp_name, 'หัก', advance_deduction, 'หักจากงวดค่าแรง', period_id)

    recalc_period_status(cursor, period_id)
    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  PUT /api/payroll/periods/{id}/items/{employee_id}/merge-deferred
# ============================================================
@app.put("/api/payroll/periods/{period_id}/items/{employee_id}/merge-deferred")
def merge_deferred(period_id: int, employee_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT PeriodId, NetTotal FROM PayrollPeriodItems
        WHERE EmployeeId=? AND PeriodId != ?
          AND ISNULL(IsDeferred,0)=1
          AND ISNULL(PaidStatus,'Unpaid') != 'Paid'
          AND ISNULL(MergedDeferredPeriodId,0)=0
        ORDER BY PeriodId DESC
    """, employee_id, period_id)
    deferred_row = cursor.fetchone()
    if not deferred_row:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบรายการเลื่อนจ่าย")
    deferred_period_id, deferred_amount = deferred_row[0], float(deferred_row[1])
    cursor.execute("""
        UPDATE PayrollPeriodItems
        SET MergedDeferredPeriodId=?, MergedDeferredAmount=?,
            NetTotal=NetTotal+?
        WHERE PeriodId=? AND EmployeeId=?
    """, deferred_period_id, deferred_amount, deferred_amount, period_id, employee_id)
    cursor.execute("""
        UPDATE PayrollPeriods SET GrandTotal=(
            SELECT SUM(NetTotal) FROM PayrollPeriodItems WHERE PeriodId=?
        ) WHERE Id=?
    """, period_id, period_id)
    conn.commit()
    conn.close()
    return {"success": True, "mergedPeriodId": deferred_period_id, "mergedAmount": deferred_amount}

# ============================================================
#  PUT /api/payroll/periods/{id}/items/{employee_id}/unmerge-deferred
# ============================================================
@app.put("/api/payroll/periods/{period_id}/items/{employee_id}/unmerge-deferred")
def unmerge_deferred(period_id: int, employee_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ISNULL(MergedDeferredAmount,0) FROM PayrollPeriodItems
        WHERE PeriodId=? AND EmployeeId=?
    """, period_id, employee_id)
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    merged_amount = float(row[0])
    cursor.execute("""
        UPDATE PayrollPeriodItems
        SET MergedDeferredPeriodId=NULL, MergedDeferredAmount=0,
            NetTotal=NetTotal-?
        WHERE PeriodId=? AND EmployeeId=?
    """, merged_amount, period_id, employee_id)
    cursor.execute("""
        UPDATE PayrollPeriods SET GrandTotal=(
            SELECT SUM(NetTotal) FROM PayrollPeriodItems WHERE PeriodId=?
        ) WHERE Id=?
    """, period_id, period_id)
    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  DELETE /api/payroll/periods/{id} — ลบงวด (เฉพาะ Unpaid)
# ============================================================
@app.delete("/api/payroll/periods/{period_id}")
def delete_payroll_period(period_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT Status FROM PayrollPeriods WHERE Id=?", period_id)
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบงวดนี้")
    if row[0] != "Unpaid":
        conn.close()
        raise HTTPException(status_code=400, detail="ไม่สามารถลบงวดที่จ่ายไปแล้วได้")
    cursor.execute("DELETE FROM PieceRateLogs WHERE PeriodId=?", period_id)
    cursor.execute("DELETE FROM PayrollPeriodItems WHERE PeriodId=?", period_id)
    cursor.execute("DELETE FROM PayrollPeriods WHERE Id=?", period_id)
    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  PUT /api/payroll/periods/{id}/pay — ยืนยันจ่ายทั้งงวด (legacy)
# ============================================================
@app.put("/api/payroll/periods/{period_id}/pay")
def pay_payroll_period(period_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE PayrollPeriods SET Status='Paid', PaidAt=GETDATE() WHERE Id=? AND Status!='Paid'
    """, period_id)
    # จ่ายทุก item ที่ยังค้างอยู่
    cursor.execute("""
        UPDATE PayrollPeriodItems SET PaidStatus='Paid', PaidAt=GETDATE()
        WHERE PeriodId=? AND PaidStatus='Unpaid'
    """, period_id)
    # บันทึกการหักเบิกที่ยังไม่ได้หัก
    cursor.execute("""
        SELECT ppi.EmployeeId, e.Name, ppi.AdvanceDeduction
        FROM PayrollPeriodItems ppi
        JOIN Employees e ON ppi.EmployeeId = e.EmployeeId
        WHERE ppi.PeriodId = ? AND ppi.AdvanceDeduction > 0
          AND NOT EXISTS (
            SELECT 1 FROM WageAdvances wa
            WHERE wa.PeriodId=ppi.PeriodId AND wa.EmployeeId=ppi.EmployeeId AND wa.Type=?
          )
    """, period_id, 'หัก')
    for emp_id, emp_name, amount in cursor.fetchall():
        cursor.execute("""
            INSERT INTO WageAdvances (EmployeeId, EmployeeName, TranDate, Type, Amount, Note, PeriodId)
            VALUES (?, ?, CAST(GETDATE() AS DATE), ?, ?, ?, ?)
        """, emp_id, emp_name, 'หัก', float(amount), 'หักจากงวดค่าแรง', period_id)
    conn.commit()
    conn.close()
    return {"success": True, "message": "ยืนยันการจ่ายเงินเรียบร้อย"}

# ============================================================
#  PUT /api/payroll/periods/{id}/advance — ตั้งค่าหักเบิกต่อคน
# ============================================================
class AdvanceDeductionBody(BaseModel):
    employeeId: str
    amount: float

@app.put("/api/payroll/periods/{period_id}/advance")
def set_advance_deduction(period_id: int, body: AdvanceDeductionBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE PayrollPeriodItems
        SET AdvanceDeduction = ?,
            NetTotal = NetTotal - AdvanceDeduction + ?
        WHERE PeriodId = ? AND EmployeeId = ?
    """, body.amount, body.amount, period_id, body.employeeId)
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบรายการนี้")
    cursor.execute("""
        UPDATE PayrollPeriods SET GrandTotal = (
            SELECT SUM(NetTotal) FROM PayrollPeriodItems WHERE PeriodId = ?
        ) WHERE Id = ?
    """, period_id, period_id)
    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  PUT /api/payroll/periods/{id}/recalculate
#  อัปเดตข้อมูลล่าสุดสำหรับคนที่ยังไม่จ่าย
# ============================================================
@app.put("/api/payroll/periods/{period_id}/recalculate")
def recalculate_period(period_id: int):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT StartDate, EndDate FROM PayrollPeriods WHERE Id=?", period_id)
    p = cursor.fetchone()
    if not p:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบงวดนี้")
    start_date, end_date = str(p[0]), str(p[1])

    # โหลด items ที่ยังไม่จ่าย
    cursor.execute("""
        SELECT EmployeeId, PieceRateTotal, AdvanceDeduction, ISNULL(WorkDaysOverride,0), WorkDays,
               ISNULL(MergedDeferredAmount,0)
        FROM PayrollPeriodItems
        WHERE PeriodId=? AND ISNULL(PaidStatus,'Unpaid') != 'Paid'
    """, period_id)
    unpaid_rows = cursor.fetchall()
    if not unpaid_rows:
        conn.close()
        return {"success": True, "updated": 0}
    unpaid_ids = {r[0]: {"pieceRateTotal": float(r[1]), "advanceDeduction": float(r[2]),
                          "workDaysOverride": bool(r[3]), "overrideWorkDays": float(r[4]),
                          "mergedDeferredAmount": float(r[5])} for r in unpaid_rows}

    # โหลด employee rate
    cursor.execute("SELECT EmployeeId, Rate, RateType FROM Employees WHERE IsActive=1")
    emp_rates = {r[0]: {"rate": float(r[1]), "rateType": r[2]} for r in cursor.fetchall()}

    # attendance logs
    cursor.execute("""
        SELECT EmployeeId, EmployeeName, ActionType, DateStr, TimeStr
        FROM AttendanceLogs
        WHERE CAST(DateStr AS DATE) BETWEEN ? AND ?
        ORDER BY EmployeeId, DateStr, TimeStr
    """, start_date, end_date)
    daily_logs = group_logs_to_daily(cursor.fetchall())

    # OT logs
    cursor.execute("""
        SELECT EmployeeId, Hours, OTRate FROM OTLogs
        WHERE DateWork BETWEEN ? AND ?
    """, start_date, end_date)
    ot_map = {}
    for r in cursor.fetchall():
        eid, hrs, otr = r[0], float(r[1]), float(r[2])
        if eid not in ot_map:
            ot_map[eid] = {"hours": 0, "weighted": 0}
        ot_map[eid]["hours"]    += hrs
        ot_map[eid]["weighted"] += hrs * otr

    # Special hour logs
    sh_map = {}
    try:
        ids_list = list(unpaid_ids.keys())
        cursor.execute(f"""
            SELECT EmployeeId, SUM(Amount)
            FROM SpecialHourLogs
            WHERE EmployeeId IN ({','.join(['?']*len(ids_list))})
              AND WorkDate BETWEEN ? AND ?
            GROUP BY EmployeeId
        """, *ids_list, start_date, end_date)
        sh_map = {r[0]: float(r[1]) for r in cursor.fetchall()}
    except Exception:
        pass

    updated = 0
    for emp_id, kept in unpaid_ids.items():
        emp = emp_rates.get(emp_id)
        if not emp:
            continue
        rate, rate_type = emp["rate"], emp["rateType"]
        hourly_rate = rate / 8
        emp_daily = [d for d in daily_logs if d["employeeId"] == emp_id]
        if kept["workDaysOverride"]:
            work_days = kept["overrideWorkDays"]
            if rate_type == "daily":
                base = round(work_days * rate, 2)
            else:
                base = round(work_days * rate, 2)
        else:
            work_days = round(sum(round(min(d["paidHours"], 8) / 8 * 2) / 2 for d in emp_daily if d["workedHours"] > 0), 2)
            if rate_type == "daily":
                base = round(sum(min(d["paidHours"], 8) * hourly_rate for d in emp_daily if d["workedHours"] > 0), 2)
            else:
                base = round(sum(d["workedHours"] * rate for d in emp_daily if d["workedHours"] > 0), 2)
        late_deduction = 0
        for d in emp_daily:
            if d.get("lateMins", 0) > 0:
                late_deduction += round(hourly_rate / 60 * d["lateMins"], 2)
        ot_entry  = ot_map.get(emp_id, {"hours": 0, "weighted": 0})
        ot_hours  = ot_entry["hours"]
        ot_amount = round(hourly_rate * ot_entry["weighted"], 2)
        piece_total          = kept["pieceRateTotal"]
        advance_deduct       = kept["advanceDeduction"]
        special_hours        = sh_map.get(emp_id, 0.0)
        merged_deferred      = kept["mergedDeferredAmount"]
        new_net = round(base - late_deduction + ot_amount + piece_total - advance_deduct + special_hours + merged_deferred, 2)
        cursor.execute("""
            UPDATE PayrollPeriodItems
            SET WorkDays=?, BaseAmount=?, LateDeduction=?, OTHours=?, OTAmount=?, NetTotal=?
            WHERE PeriodId=? AND EmployeeId=?
        """, work_days, base, late_deduction, ot_hours, ot_amount, new_net, period_id, emp_id)
        updated += 1

    cursor.execute("""
        UPDATE PayrollPeriods SET GrandTotal=(
            SELECT SUM(NetTotal) FROM PayrollPeriodItems WHERE PeriodId=?
        ) WHERE Id=?
    """, period_id, period_id)
    conn.commit()
    conn.close()
    return {"success": True, "updated": updated}

# ============================================================
#  PUT /api/payroll/periods/{id}/items/{employee_id}/workdays
# ============================================================
class UpdateWorkDaysBody(BaseModel):
    workDays: float

@app.put("/api/payroll/periods/{period_id}/items/{employee_id}/workdays")
def update_work_days(period_id: int, employee_id: str, body: UpdateWorkDaysBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ppi.LateDeduction, ppi.OTAmount, ppi.PieceRateTotal,
               ppi.AdvanceDeduction, ppi.PaidStatus, e.Rate
        FROM PayrollPeriodItems ppi
        JOIN Employees e ON ppi.EmployeeId = e.EmployeeId
        WHERE ppi.PeriodId = ? AND ppi.EmployeeId = ?
    """, period_id, employee_id)
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    if row[4] == 'Paid':
        conn.close()
        raise HTTPException(status_code=400, detail="จ่ายแล้ว ไม่สามารถแก้ไขได้")
    late_deduction = float(row[0])
    ot_amount      = float(row[1])
    piece_total    = float(row[2])
    advance_deduct = float(row[3])
    rate           = float(row[5])
    new_base = round(body.workDays * rate, 2)
    new_net  = round(new_base - late_deduction + ot_amount + piece_total - advance_deduct, 2)
    cursor.execute("""
        UPDATE PayrollPeriodItems SET WorkDays=?, BaseAmount=?, NetTotal=?, WorkDaysOverride=1
        WHERE PeriodId=? AND EmployeeId=?
    """, body.workDays, new_base, new_net, period_id, employee_id)
    cursor.execute("""
        UPDATE PayrollPeriods SET GrandTotal=(
            SELECT SUM(NetTotal) FROM PayrollPeriodItems WHERE PeriodId=?
        ) WHERE Id=?
    """, period_id, period_id)
    conn.commit()
    conn.close()
    return {"success": True, "workDays": body.workDays, "baseAmount": new_base, "netTotal": new_net}

# ============================================================
#  Special Hour Logs
# ============================================================
@app.post("/api/special_hours")
def create_special_hour_log(body: CreateSpecialHourLogBody):
    amount = round(body.hours * body.hourlyRate, 2)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO SpecialHourLogs (EmployeeId, EmployeeName, WorkDate, Hours, HourlyRate, Amount, Note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, body.employeeId, body.employeeName, body.workDate,
        body.hours, body.hourlyRate, amount, body.note or '')
    conn.commit()
    conn.close()
    return {"success": True, "amount": amount}

@app.get("/api/special_hours")
def get_special_hours(employeeId: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    if employeeId:
        cursor.execute("""
            SELECT Id, EmployeeId, EmployeeName, WorkDate, Hours, HourlyRate, Amount, Note
            FROM SpecialHourLogs WHERE EmployeeId = ? ORDER BY WorkDate DESC
        """, employeeId)
    else:
        cursor.execute("""
            SELECT Id, EmployeeId, EmployeeName, WorkDate, Hours, HourlyRate, Amount, Note
            FROM SpecialHourLogs ORDER BY WorkDate DESC
        """)
    rows = cursor.fetchall()
    conn.close()
    return {"logs": [
        {"id": r[0], "employeeId": r[1], "employeeName": r[2], "workDate": str(r[3]),
         "hours": float(r[4]), "hourlyRate": float(r[5]), "amount": float(r[6]), "note": r[7] or ""}
        for r in rows
    ]}

@app.delete("/api/special_hours/{log_id}")
def delete_special_hour_log(log_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM SpecialHourLogs WHERE Id=?", log_id)
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  GET /api/attendance/day — ดึงข้อมูลเวลาเข้าออกทุกคนของวัน
# ============================================================
@app.get("/api/attendance/day")
def get_attendance_day(date: str):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT EmployeeId, Name, Rate, RateType
        FROM Employees WHERE IsActive = 1 ORDER BY Name
    """)
    employees = [{"employeeId": r[0], "name": r[1], "rate": float(r[2]), "rateType": r[3]}
                 for r in cursor.fetchall()]

    cursor.execute("""
        SELECT EmployeeId, ActionType, TimeStr, Note
        FROM AttendanceLogs WHERE CAST(DateStr AS DATE) = ?
        ORDER BY TimeStr
    """, date)
    log_rows = cursor.fetchall()

    cursor.execute("""
        SELECT EmployeeId, SUM(Hours), AVG(OTRate)
        FROM OTLogs WHERE DateWork = ?
        GROUP BY EmployeeId
    """, date)
    ot_map = {r[0]: {"hours": float(r[1]), "otRate": float(r[2])} for r in cursor.fetchall()}

    sh_map = {}
    try:
        cursor.execute("""
            SELECT EmployeeId, SUM(Hours), SUM(Amount)
            FROM SpecialHourLogs WHERE WorkDate = ?
            GROUP BY EmployeeId
        """, date)
        sh_map = {r[0]: {"hours": float(r[1]), "amount": float(r[2])} for r in cursor.fetchall()}
    except Exception:
        pass
    conn.close()

    att_map = {}
    for emp_id, action, time_val, note_val in log_rows:
        t = str(time_val)[:5]
        if emp_id not in att_map:
            att_map[emp_id] = {"in": None, "out": None, "note": ""}
        if action == "เข้างาน":
            att_map[emp_id]["in"] = t
        elif action == "ออกงาน":
            att_map[emp_id]["out"] = t
        elif action == "หมายเหตุ" and note_val:
            att_map[emp_id]["note"] = note_val

    result = []
    for emp in employees:
        emp_id = emp["employeeId"]
        att   = att_map.get(emp_id, {"in": None, "out": None, "note": ""})
        ot    = ot_map.get(emp_id, {"hours": 0, "otRate": 1.0})
        late_mins = 0
        if att["in"]:
            diff = time_to_minutes(att["in"]) - time_to_minutes(SCHEDULE["เข้างาน"]["expected"])
            if diff >= SCHEDULE["เข้างาน"]["graceMin"]:
                late_mins = diff
        sh = sh_map.get(emp_id, {"hours": 0, "amount": 0.0})
        result.append({**emp, "inTime": att["in"], "outTime": att["out"],
                        "note": att["note"], "lateMins": late_mins,
                        "otHours": ot["hours"], "otRate": ot["otRate"],
                        "specialHours": sh["hours"], "specialAmount": sh["amount"]})

    return {"date": date, "employees": result}

# ============================================================
#  POST /api/attendance/day — บันทึกเวลาเข้าออก (upsert per employee)
# ============================================================
class AttendanceDayBody(BaseModel):
    employeeId:   str
    employeeName: str
    date:         str
    inTime:       Optional[str] = None
    outTime:      Optional[str] = None
    note:         Optional[str] = ""

@app.post("/api/attendance/day")
def save_attendance_day(body: AttendanceDayBody):
    conn = get_db()
    cursor = conn.cursor()
    now  = get_bangkok_now()

    cursor.execute("""
        DELETE FROM AttendanceLogs
        WHERE EmployeeId = ? AND CAST(DateStr AS DATE) = ?
        AND ActionType IN (?, ?, ?)
    """, body.employeeId, body.date, 'เข้างาน', 'ออกงาน', 'หมายเหตุ')

    ts  = int(now.timestamp() * 1000)
    eid = body.employeeId
    if body.inTime:
        cursor.execute("""
            INSERT INTO AttendanceLogs
                (Id, EmployeeId, EmployeeName, ActionType, TimestampServer, DateStr, TimeStr, ConfidenceScore, DeviceId, Note)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        """, f"LOG-{ts}-{eid}-IN", body.employeeId, body.employeeName, 'เข้างาน',
            f"{body.date} {body.inTime}:00", body.date, f"{body.inTime}:00", 'ADMIN', body.note or None)
    if body.outTime:
        cursor.execute("""
            INSERT INTO AttendanceLogs
                (Id, EmployeeId, EmployeeName, ActionType, TimestampServer, DateStr, TimeStr, ConfidenceScore, DeviceId)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
        """, f"LOG-{ts}-{eid}-OUT", body.employeeId, body.employeeName, 'ออกงาน',
            f"{body.date} {body.outTime}:00", body.date, f"{body.outTime}:00", 'ADMIN')
    if body.note and not body.inTime:
        cursor.execute("""
            INSERT INTO AttendanceLogs
                (Id, EmployeeId, EmployeeName, ActionType, TimestampServer, DateStr, TimeStr, ConfidenceScore, DeviceId, Note)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        """, f"LOG-{ts}-{eid}-NOTE", body.employeeId, body.employeeName, 'หมายเหตุ',
            f"{body.date} 00:00:00", body.date, '00:00:00', 'ADMIN', body.note)

    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  Piece Rate Categories
# ============================================================
class PieceRateCategoryBody(BaseModel):
    name:         str
    hasLength:    bool  = False
    extraPerUnit: float = 0
    baseLength:   float = 0

@app.get("/api/piece_rate/categories")
def get_piece_rate_categories():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT Id, Name, HasLength, ExtraPerUnit, BaseLength
        FROM PieceRateCategories WHERE IsActive = 1 ORDER BY Name
    """)
    cats = [{"id": r[0], "name": r[1], "hasLength": bool(r[2]),
             "extraPerUnit": float(r[3]), "baseLength": float(r[4])} for r in cursor.fetchall()]
    conn.close()
    return {"categories": cats}

@app.post("/api/piece_rate/categories")
def create_piece_rate_category(body: PieceRateCategoryBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO PieceRateCategories (Name, HasLength, ExtraPerUnit, BaseLength)
        VALUES (?, ?, ?, ?)
    """, body.name, 1 if body.hasLength else 0, body.extraPerUnit, body.baseLength)
    conn.commit()
    conn.close()
    return {"success": True}

@app.put("/api/piece_rate/categories/{cat_id}")
def update_piece_rate_category(cat_id: int, body: PieceRateCategoryBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE PieceRateCategories SET Name=?, HasLength=?, ExtraPerUnit=?, BaseLength=?
        WHERE Id=?
    """, body.name, 1 if body.hasLength else 0, body.extraPerUnit, body.baseLength, cat_id)
    conn.commit()
    conn.close()
    return {"success": True}

@app.delete("/api/piece_rate/categories/{cat_id}")
def delete_piece_rate_category(cat_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE PieceRateCategories SET IsActive=0 WHERE Id=?", cat_id)
    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  Piece Rate Jobs
# ============================================================
class PieceRateJobBody(BaseModel):
    jobName:    str
    unit:       str
    basePrice:  float
    categoryId: Optional[int] = None

@app.get("/api/piece_rate/jobs")
def get_piece_rate_jobs():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.Id, m.JobName, m.Unit, m.BasePrice, m.CategoryId,
               c.Name, c.HasLength, c.ExtraPerUnit, c.BaseLength
        FROM PieceRateMaster m
        LEFT JOIN PieceRateCategories c ON m.CategoryId = c.Id
        WHERE m.IsActive = 1 ORDER BY c.Name, m.JobName
    """)
    jobs = [{"id": r[0], "jobName": r[1], "unit": r[2], "basePrice": float(r[3]),
             "categoryId": r[4], "categoryName": r[5] or "",
             "hasLength": bool(r[6]) if r[6] is not None else False,
             "extraPerUnit": float(r[7]) if r[7] is not None else 0.0,
             "baseLength": float(r[8]) if r[8] is not None else 0.0} for r in cursor.fetchall()]
    conn.close()
    return {"jobs": jobs}

@app.post("/api/piece_rate/jobs")
def create_piece_rate_job(body: PieceRateJobBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO PieceRateMaster (JobName, Unit, BasePrice, CategoryId, BaseLength, ExtraPerUnit)
        VALUES (?, ?, ?, ?, 0, 0)
    """, body.jobName, body.unit, body.basePrice, body.categoryId)
    conn.commit()
    conn.close()
    return {"success": True}

@app.put("/api/piece_rate/jobs/{job_id}")
def update_piece_rate_job(job_id: int, body: PieceRateJobBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE PieceRateMaster SET JobName=?, Unit=?, BasePrice=?, CategoryId=?
        WHERE Id=?
    """, body.jobName, body.unit, body.basePrice, body.categoryId, job_id)
    conn.commit()
    conn.close()
    return {"success": True}

@app.delete("/api/piece_rate/jobs/{job_id}")
def delete_piece_rate_job(job_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE PieceRateMaster SET IsActive=0 WHERE Id=?", job_id)
    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  Piece Rate Logs
# ============================================================
class PieceRateLogBody(BaseModel):
    employeeId:   str
    employeeName: str
    jobId:        int
    logDate:      str
    quantity:     float
    unitLength:   float = 0
    unitPrice:    float
    totalAmount:  float
    note:         str = ""

@app.get("/api/piece_rate/logs")
def get_piece_rate_logs(date: Optional[str] = None, empId: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    if date:
        cursor.execute("""
            SELECT pl.Id, pl.EmployeeId, pl.EmployeeName, pl.JobId, pm.JobName, pm.Unit,
                   pl.LogDate, pl.Quantity, pl.UnitLength, pl.UnitPrice, pl.TotalAmount, pl.Note
            FROM PieceRateLogs pl JOIN PieceRateMaster pm ON pl.JobId = pm.Id
            WHERE pl.LogDate = ? ORDER BY pl.CreatedAt DESC
        """, date)
    elif empId:
        cursor.execute("""
            SELECT pl.Id, pl.EmployeeId, pl.EmployeeName, pl.JobId, pm.JobName, pm.Unit,
                   pl.LogDate, pl.Quantity, pl.UnitLength, pl.UnitPrice, pl.TotalAmount, pl.Note
            FROM PieceRateLogs pl JOIN PieceRateMaster pm ON pl.JobId = pm.Id
            WHERE pl.EmployeeId = ? ORDER BY pl.LogDate DESC, pl.CreatedAt DESC
        """, empId)
    else:
        cursor.execute("""
            SELECT TOP 100 pl.Id, pl.EmployeeId, pl.EmployeeName, pl.JobId, pm.JobName, pm.Unit,
                   pl.LogDate, pl.Quantity, pl.UnitLength, pl.UnitPrice, pl.TotalAmount, pl.Note
            FROM PieceRateLogs pl JOIN PieceRateMaster pm ON pl.JobId = pm.Id
            ORDER BY pl.LogDate DESC, pl.CreatedAt DESC
        """)
    logs = [{"id": r[0], "employeeId": r[1], "employeeName": r[2], "jobId": r[3],
             "jobName": r[4], "unit": r[5], "logDate": str(r[6]), "quantity": float(r[7]),
             "unitLength": float(r[8]), "unitPrice": float(r[9]),
             "totalAmount": float(r[10]), "note": r[11]} for r in cursor.fetchall()]
    conn.close()
    return {"logs": logs}

@app.post("/api/piece_rate/logs")
def create_piece_rate_log(body: PieceRateLogBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO PieceRateLogs
            (EmployeeId, EmployeeName, JobId, LogDate, Quantity, UnitLength, UnitPrice, TotalAmount, Note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, body.employeeId, body.employeeName, body.jobId, body.logDate,
        body.quantity, body.unitLength, body.unitPrice, body.totalAmount, body.note)
    conn.commit()
    conn.close()
    return {"success": True}

@app.delete("/api/piece_rate/logs/{log_id}")
def delete_piece_rate_log(log_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT TotalAmount, PeriodId, EmployeeId FROM PieceRateLogs WHERE Id=?", log_id)
    row = cursor.fetchone()
    if row:
        amount, period_id, emp_id = float(row[0]), row[1], row[2]
        cursor.execute("DELETE FROM PieceRateLogs WHERE Id=?", log_id)
        if period_id:
            cursor.execute("""
                UPDATE PayrollPeriodItems
                SET PieceRateTotal = PieceRateTotal - ?,
                    NetTotal = NetTotal - ?
                WHERE PeriodId = ? AND EmployeeId = ?
            """, amount, amount, period_id, emp_id)
            cursor.execute("""
                UPDATE PayrollPeriods SET GrandTotal = (
                    SELECT SUM(NetTotal) FROM PayrollPeriodItems WHERE PeriodId = ?
                ) WHERE Id = ?
            """, period_id, period_id)
    conn.commit()
    conn.close()
    return {"success": True}


# ============================================================
#  POST /api/payroll/periods/{id}/piece_rate — เพิ่มงานเหมาในงวด
# ============================================================
class PeriodPieceRateBody(BaseModel):
    employeeId:   str
    employeeName: str
    jobId:        int
    quantity:     float
    unitLength:   float = 0
    unitPrice:    float
    totalAmount:  float
    note:         str = ""

@app.post("/api/payroll/periods/{period_id}/piece_rate")
def add_period_piece_rate(period_id: int, body: PeriodPieceRateBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT Status FROM PayrollPeriods WHERE Id=?", period_id)
    p = cursor.fetchone()
    if not p:
        conn.close()
        raise HTTPException(status_code=404, detail="ไม่พบงวดนี้")
    if p[0] == 'Paid':
        conn.close()
        raise HTTPException(status_code=400, detail="งวดนี้จ่ายแล้ว ไม่สามารถเพิ่มรายการได้")

    today = get_bangkok_now().strftime("%Y-%m-%d")
    cursor.execute("""
        INSERT INTO PieceRateLogs
            (EmployeeId, EmployeeName, JobId, LogDate, Quantity, UnitLength, UnitPrice, TotalAmount, Note, PeriodId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, body.employeeId, body.employeeName, body.jobId, today,
        body.quantity, body.unitLength, body.unitPrice, body.totalAmount, body.note, period_id)

    cursor.execute("""
        UPDATE PayrollPeriodItems
        SET PieceRateTotal = PieceRateTotal + ?,
            NetTotal = NetTotal + ?
        WHERE PeriodId = ? AND EmployeeId = ?
    """, body.totalAmount, body.totalAmount, period_id, body.employeeId)

    cursor.execute("""
        UPDATE PayrollPeriods SET GrandTotal = (
            SELECT SUM(NetTotal) FROM PayrollPeriodItems WHERE PeriodId = ?
        ) WHERE Id = ?
    """, period_id, period_id)

    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================
#  Wage Advances
# ============================================================
@app.get("/api/advances")
def get_advances():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT EmployeeId, Name FROM Employees WHERE IsActive = 1 ORDER BY Name")
    employees = [{"employeeId": r[0], "name": r[1]} for r in cursor.fetchall()]
    cursor.execute("""
        SELECT EmployeeId,
            SUM(CASE WHEN Type=? THEN Amount ELSE 0 END),
            SUM(CASE WHEN Type=? THEN Amount ELSE 0 END)
        FROM WageAdvances GROUP BY EmployeeId
    """, 'เบิก', 'หัก')
    bal_map = {r[0]: (float(r[1]), float(r[2])) for r in cursor.fetchall()}
    conn.close()
    result = []
    for emp in employees:
        adv, ded = bal_map.get(emp["employeeId"], (0.0, 0.0))
        result.append({**emp, "totalAdvanced": adv, "totalDeducted": ded,
                       "balance": round(adv - ded, 2)})
    return {"employees": result}

@app.get("/api/advances/{emp_id}/history")
def get_advance_history(emp_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT Id, TranDate, Type, Amount, Note, PeriodId
        FROM WageAdvances WHERE EmployeeId = ?
        ORDER BY TranDate DESC, CreatedAt DESC
    """, emp_id)
    history = [{"id": r[0], "tranDate": str(r[1]), "type": r[2], "amount": float(r[3]),
                "note": r[4], "periodId": r[5]} for r in cursor.fetchall()]
    conn.close()
    return {"history": history}

class WageAdvanceBody(BaseModel):
    employeeId:   str
    employeeName: str
    tranDate:     str
    amount:       float
    note:         str = ""

class DeductAdvanceBody(BaseModel):
    employeeId:   str
    employeeName: str
    amount:       float
    note:         str = ""
    periodId:     Optional[int] = None

@app.post("/api/advances/deduct")
def deduct_advance(body: DeductAdvanceBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO WageAdvances (EmployeeId, EmployeeName, TranDate, Type, Amount, Note, PeriodId)
        VALUES (?, ?, CAST(GETDATE() AS DATE), ?, ?, ?, ?)
    """, body.employeeId, body.employeeName, 'หัก', body.amount, body.note or 'หักเบิก', body.periodId)
    if body.periodId:
        cursor.execute("""
            UPDATE PayrollPeriodItems
            SET AdvanceDeduction = AdvanceDeduction + ?,
                NetTotal = NetTotal - ?
            WHERE PeriodId = ? AND EmployeeId = ?
        """, body.amount, body.amount, body.periodId, body.employeeId)
        recalc_period_status(cursor, body.periodId)
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/api/advances")
def create_advance(body: WageAdvanceBody):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO WageAdvances (EmployeeId, EmployeeName, TranDate, Type, Amount, Note)
        VALUES (?, ?, ?, ?, ?, ?)
    """, body.employeeId, body.employeeName, body.tranDate, 'เบิก', body.amount, body.note)
    conn.commit()
    conn.close()
    return {"success": True}

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
                "paidHours":   0,
                "lateMins":    0,
                "status":      "incomplete",
            }
        entry = map_[key]
        if action == "เข้างาน":      entry["in"]       = time_val
        if action == "พักเที่ยง":    entry["breakOut"] = time_val
        if action == "เข้างานบ่าย":  entry["breakIn"]  = time_val
        if action == "ออกงาน":       entry["out"]      = time_val

    for entry in map_.values():
        in_mins  = time_to_minutes(entry["in"])  if entry["in"]  != "-" else None
        out_mins = time_to_minutes(entry["out"]) if entry["out"] != "-" else None

        # คำนวณสาย — ตรวจว่าเป็น shift บ่าย (เข้า >= 12:00) หรือ shift เช้า
        is_afternoon_shift = (in_mins is not None and in_mins >= 12 * 60)
        if is_afternoon_shift:
            sched = SCHEDULE.get('เข้างานบ่าย')
            if sched and entry["in"] != "-":
                diff = in_mins - time_to_minutes(sched["expected"])
                if diff >= sched["graceMin"]:
                    entry["lateMins"] += diff - 15
        else:
            for action_type, field in [("เข้างาน", "in"), ("เข้างานบ่าย", "breakIn")]:
                sched = SCHEDULE.get(action_type)
                actual = entry[field]
                if sched and actual != "-":
                    diff = time_to_minutes(actual) - time_to_minutes(sched["expected"])
                    if diff >= sched["graceMin"]:
                        entry["lateMins"] += diff - 15

        if entry["out"] == "-":
            continue

        total_mins = 0
        if entry["in"] != "-":
            in_m  = time_to_minutes(entry["in"])
            out_m = time_to_minutes(entry["out"])
            if entry["breakOut"] != "-" and entry["breakIn"] != "-":
                break_m = time_to_minutes(entry["breakIn"]) - time_to_minutes(entry["breakOut"])
            elif in_m < 12 * 60 and out_m > 13 * 60:
                break_m = 60  # assume 60-min lunch when shift spans lunch hour
            else:
                break_m = 0
            total_mins = out_m - in_m - break_m
        elif entry["breakIn"] != "-":
            total_mins = time_to_minutes(entry["out"]) - time_to_minutes(entry["breakIn"])

        if total_mins > 0:
            entry["workedHours"] = round(total_mins / 60, 2)
            entry["status"]      = "complete"
            # paidHours: นับจาก scheduledStart (ไม่ใช่ inTime จริง) สำหรับคำนวณค่าแรงงวด
            if entry["in"] != "-":
                sched_start = 13 * 60 if in_m >= 12 * 60 else 8 * 60
                eff_out     = min(out_m, 17 * 60)
                sched_lunch = 60 if sched_start < 12 * 60 and eff_out > 13 * 60 else 0
                entry["paidHours"] = round(max(0, eff_out - sched_start - sched_lunch) / 60, 2)
            else:
                entry["paidHours"] = entry["workedHours"]

    return sorted(map_.values(), key=lambda x: x["date"])
