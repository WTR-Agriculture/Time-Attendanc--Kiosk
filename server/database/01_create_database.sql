-- ============================================================
--  Time Attendance Kiosk — SQL Server Schema
--  Server: NAT\CHORPHAGA (SQL Server Express)
--  วิธีใช้:
--    1. เปิด SSMS → New Query
--    2. วางโค้ดทั้งหมดแล้วกด F5 (Execute)
-- ============================================================

-- ============================================================
--  สร้าง Database
-- ============================================================
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TimeAttendanceDB')
BEGIN
    CREATE DATABASE TimeAttendanceDB;
END
GO

USE TimeAttendanceDB;
GO

-- ============================================================
--  Table: Employees
--  เก็บข้อมูลพนักงานและ face descriptor สำหรับ recognition
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Employees')
BEGIN
    CREATE TABLE Employees (
        EmployeeId          NVARCHAR(20)    NOT NULL PRIMARY KEY,
        Name                NVARCHAR(100)   NOT NULL,
        Department          NVARCHAR(100)   NULL,
        IsActive            BIT             NOT NULL DEFAULT 1,
        Rate                DECIMAL(10, 2)  NOT NULL DEFAULT 0,
        RateType            NVARCHAR(10)    NOT NULL DEFAULT 'daily',  -- 'daily' | 'hourly'
        FaceDescriptorJson  NVARCHAR(MAX)   NULL,   -- JSON array จาก face-api / InsightFace
        UpdatedAt           DATETIME2       NULL,
        CreatedAt           DATETIME2       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Created table: Employees';
END
GO

-- ============================================================
--  Table: AttendanceLogs
--  บันทึกเวลาเข้า-ออก แต่ละ action ของพนักงาน
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AttendanceLogs')
BEGIN
    CREATE TABLE AttendanceLogs (
        Id                  NVARCHAR(50)    NOT NULL PRIMARY KEY,
        EmployeeId          NVARCHAR(20)    NOT NULL,
        EmployeeName        NVARCHAR(100)   NOT NULL,
        ActionType          NVARCHAR(20)    NOT NULL,  -- 'เข้างาน' | 'พักเที่ยง' | 'เข้างานบ่าย' | 'ออกงาน'
        TimestampServer     NVARCHAR(30)    NOT NULL,
        DateStr             DATE            NOT NULL,
        TimeStr             TIME            NOT NULL,
        ConfidenceScore     DECIMAL(5, 4)   NULL DEFAULT 0,
        DeviceId            NVARCHAR(50)    NULL DEFAULT 'iPad-01',
        CreatedAt           DATETIME2       NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_AttendanceLogs_EmployeeId ON AttendanceLogs (EmployeeId);
    CREATE INDEX IX_AttendanceLogs_DateStr    ON AttendanceLogs (DateStr);

    PRINT 'Created table: AttendanceLogs';
END
GO

-- ============================================================
--  Table: PayrollConfig
--  กำหนดอัตราค่าแรงแต่ละคน
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PayrollConfig')
BEGIN
    CREATE TABLE PayrollConfig (
        EmployeeId  NVARCHAR(20)    NOT NULL PRIMARY KEY,
        Name        NVARCHAR(100)   NOT NULL,
        Rate        DECIMAL(10, 2)  NOT NULL DEFAULT 0,
        RateType    NVARCHAR(10)    NOT NULL DEFAULT 'daily',  -- 'daily' | 'hourly'
        UpdatedAt   DATETIME2       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Created table: PayrollConfig';
END
GO

-- ============================================================
--  Table: OTLogs
--  บันทึก OT รายวัน (Admin เป็นคนคีย์)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OTLogs')
BEGIN
    CREATE TABLE OTLogs (
        Id          INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
        EmployeeId  NVARCHAR(20)    NOT NULL,
        Name        NVARCHAR(100)   NOT NULL,
        DateWork    DATE            NOT NULL,
        Hours       DECIMAL(5, 2)   NOT NULL,
        Note        NVARCHAR(200)   NULL,
        CreatedAt   DATETIME2       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_OTLogs_EmpDate UNIQUE (EmployeeId, DateWork)  -- 1 คน 1 วัน มีได้ record เดียว
    );
    PRINT 'Created table: OTLogs';
END
GO

-- ============================================================
--  Table: AuditLogs
--  บันทึก event ทุกอย่างในระบบ
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLogs')
BEGIN
    CREATE TABLE AuditLogs (
        Id          INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
        EventType   NVARCHAR(50)    NOT NULL,
        Detail      NVARCHAR(500)   NULL,
        Payload     NVARCHAR(MAX)   NULL,
        CreatedAt   DATETIME2       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Created table: AuditLogs';
END
GO

-- ============================================================
--  ข้อมูลตัวอย่าง — ลบออกได้หลัง setup จริง
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Employees)
BEGIN
    INSERT INTO Employees (EmployeeId, Name, Department, IsActive, Rate, RateType)
    VALUES
        ('001', N'สมชาย ใจดี',  N'ขาย',    1, 400, 'daily'),
        ('002', N'สมศรี มีสุข', N'บริการ', 1, 400, 'daily'),
        ('003', N'วิชัย รักดี', N'คลัง',   1,  50, 'hourly');

    INSERT INTO PayrollConfig (EmployeeId, Name, Rate, RateType)
    VALUES
        ('001', N'สมชาย ใจดี',  400, 'daily'),
        ('002', N'สมศรี มีสุข', 400, 'daily'),
        ('003', N'วิชัย รักดี',  50, 'hourly');

    PRINT 'Inserted sample data';
END
GO

PRINT '========================================';
PRINT 'Setup complete! TimeAttendanceDB ready.';
PRINT '========================================';
