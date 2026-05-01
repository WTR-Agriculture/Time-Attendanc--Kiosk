-- ============================================================
--  Time Attendance — Phase 2 Schema Update
--  เพิ่ม tables: PayrollPeriods, PayrollPeriodItems,
--               PieceRateMaster, PieceRateLogs
--  และ column เพิ่มเติม: OTRate, PaidStatus, PieceTotal
--
--  วิธีใช้:
--    1. เปิด SSMS → เลือก Database: TimeAttendanceDB
--    2. เปิดไฟล์นี้ → กด F5 (Execute)
--    *** รันได้ซ้ำ — มี IF NOT EXISTS ทุกจุด ***
-- ============================================================

USE TimeAttendanceDB;
GO

-- ============================================================
--  1. เพิ่ม OTRate ใน OTLogs (ถ้ายังไม่มี)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('OTLogs') AND name = 'OTRate'
)
BEGIN
    ALTER TABLE OTLogs ADD OTRate DECIMAL(4,2) NOT NULL DEFAULT 1.0;
    PRINT 'Added column: OTLogs.OTRate';
END
GO

-- ============================================================
--  2. PayrollPeriods — งวดการจ่ายค่าแรง
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PayrollPeriods')
BEGIN
    CREATE TABLE PayrollPeriods (
        Id          INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
        StartDate   DATE            NOT NULL,
        EndDate     DATE            NOT NULL,
        GrandTotal  DECIMAL(12,2)   NOT NULL DEFAULT 0,
        Status      NVARCHAR(20)    NOT NULL DEFAULT 'Unpaid',  -- 'Unpaid' | 'Partial' | 'Paid'
        PaidAt      DATETIME        NULL,
        CreatedAt   DATETIME        NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Created table: PayrollPeriods';
END
GO

-- ============================================================
--  3. PayrollPeriodItems — รายละเอียดต่อพนักงานต่องวด
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PayrollPeriodItems')
BEGIN
    CREATE TABLE PayrollPeriodItems (
        Id              INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
        PeriodId        INT             NOT NULL REFERENCES PayrollPeriods(Id) ON DELETE CASCADE,
        EmployeeId      NVARCHAR(20)    NOT NULL,
        Name            NVARCHAR(100)   NOT NULL,
        WorkDays        INT             NOT NULL DEFAULT 0,
        BaseAmount      DECIMAL(12,2)   NOT NULL DEFAULT 0,  -- ค่าแรงปกติ
        LateDeduction   DECIMAL(12,2)   NOT NULL DEFAULT 0,  -- หักมาสาย
        OtHours         DECIMAL(8,2)    NOT NULL DEFAULT 0,
        OtAmount        DECIMAL(12,2)   NOT NULL DEFAULT 0,
        PieceTotal      DECIMAL(12,2)   NOT NULL DEFAULT 0,  -- รวมงานเหมา
        NetTotal        DECIMAL(12,2)   NOT NULL DEFAULT 0,  -- สุทธิ
        PaidStatus      NVARCHAR(20)    NOT NULL DEFAULT 'Unpaid',  -- 'Unpaid' | 'Paid'
        PaidAt          DATETIME        NULL,
        CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_PayrollPeriodItems_PeriodId   ON PayrollPeriodItems (PeriodId);
    CREATE INDEX IX_PayrollPeriodItems_EmployeeId ON PayrollPeriodItems (EmployeeId);
    PRINT 'Created table: PayrollPeriodItems';
END
GO

-- ============================================================
--  4. PieceRateMaster — ประเภทงานเหมา + สูตรราคา
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PieceRateMaster')
BEGIN
    CREATE TABLE PieceRateMaster (
        Id              INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
        JobName         NVARCHAR(200)   NOT NULL,       -- ชื่องาน เช่น "เย็บถุง", "ตัดผ้า"
        Unit            NVARCHAR(50)    NOT NULL,        -- หน่วย เช่น "ชิ้น", "ศอก", "เมตร"
        BasePrice       DECIMAL(10,2)   NOT NULL,        -- ราคาฐาน (ต่อหน่วย)
        BaseLength      DECIMAL(10,2)   NOT NULL DEFAULT 0,   -- ความยาวฐาน (0 = ไม่มีสูตร extra)
        ExtraPerUnit    DECIMAL(10,2)   NOT NULL DEFAULT 0,   -- บวกเพิ่มต่อหน่วยที่เกิน BaseLength
        IsActive        BIT             NOT NULL DEFAULT 1,
        CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Created table: PieceRateMaster';
END
GO

-- ============================================================
--  5. PieceRateLogs — บันทึกงานเหมารายพนักงานรายวัน
--
--  สูตรราคา:
--    UnitPrice   = BasePrice + MAX(0, UnitLength − BaseLength) × ExtraPerUnit
--    TotalAmount = Quantity × UnitPrice
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PieceRateLogs')
BEGIN
    CREATE TABLE PieceRateLogs (
        Id              INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
        EmployeeId      NVARCHAR(20)    NOT NULL,
        EmployeeName    NVARCHAR(200)   NOT NULL,
        JobId           INT             NOT NULL REFERENCES PieceRateMaster(Id),
        LogDate         DATE            NOT NULL,
        Quantity        DECIMAL(10,2)   NOT NULL,        -- จำนวนชิ้น/ศอก
        UnitLength      DECIMAL(10,2)   NOT NULL DEFAULT 0,   -- ความยาวต่อชิ้น (ถ้ามีสูตร extra)
        UnitPrice       DECIMAL(10,2)   NOT NULL,        -- ราคาต่อหน่วย (คำนวณแล้ว)
        TotalAmount     DECIMAL(10,2)   NOT NULL,        -- Quantity × UnitPrice
        Note            NVARCHAR(500)   NOT NULL DEFAULT '',
        CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_PieceRateLogs_EmployeeId ON PieceRateLogs (EmployeeId);
    CREATE INDEX IX_PieceRateLogs_LogDate    ON PieceRateLogs (LogDate);
    PRINT 'Created table: PieceRateLogs';
END
GO

-- ============================================================
PRINT '========================================';
PRINT 'Phase 2 schema update complete!';
PRINT '========================================';
