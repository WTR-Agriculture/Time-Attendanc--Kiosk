-- ============================================================
--  Phase 3: WageAdvances + PayrollPeriodItems.AdvanceDeduction
--  *** รันได้ซ้ำ — มี IF NOT EXISTS ทุกจุด ***
-- ============================================================

USE TimeAttendanceDB;
GO

-- ============================================================
--  1. WageAdvances — บันทึกการเบิก/หักค่าแรงล่วงหน้า
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WageAdvances')
BEGIN
    CREATE TABLE WageAdvances (
        Id           INT            NOT NULL IDENTITY(1,1) PRIMARY KEY,
        EmployeeId   NVARCHAR(20)   NOT NULL,
        EmployeeName NVARCHAR(200)  NOT NULL,
        TranDate     DATE           NOT NULL,
        Type         NVARCHAR(10)   NOT NULL,  -- 'เบิก' | 'หัก'
        Amount       DECIMAL(10,2)  NOT NULL,
        Note         NVARCHAR(500)  NOT NULL DEFAULT '',
        PeriodId     INT            NULL REFERENCES PayrollPeriods(Id),
        CreatedAt    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_WageAdvances_EmployeeId ON WageAdvances (EmployeeId);
    CREATE INDEX IX_WageAdvances_TranDate   ON WageAdvances (TranDate);
    PRINT 'Created table: WageAdvances';
END
GO

-- ============================================================
--  2. PayrollPeriodItems — เพิ่ม AdvanceDeduction
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('PayrollPeriodItems') AND name = 'AdvanceDeduction'
)
BEGIN
    ALTER TABLE PayrollPeriodItems ADD AdvanceDeduction DECIMAL(12,2) NOT NULL DEFAULT 0;
    PRINT 'Added column: PayrollPeriodItems.AdvanceDeduction';
END
GO

-- ============================================================
PRINT '========================================';
PRINT 'Phase 3 schema update complete!';
PRINT '========================================';
