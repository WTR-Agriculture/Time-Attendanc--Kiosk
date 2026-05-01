-- ============================================================
--  Phase 5: ผูก PieceRateLogs เข้ากับงวดการจ่าย
--  *** รันได้ซ้ำ ***
-- ============================================================

USE TimeAttendanceDB;
GO

-- 1. เพิ่ม PeriodId ใน PieceRateLogs
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('PieceRateLogs') AND name = 'PeriodId'
)
BEGIN
    ALTER TABLE PieceRateLogs ADD PeriodId INT NULL REFERENCES PayrollPeriods(Id);
    PRINT 'Added column: PieceRateLogs.PeriodId';
END
GO

-- 2. เพิ่ม PieceRateTotal ใน PayrollPeriodItems
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('PayrollPeriodItems') AND name = 'PieceRateTotal'
)
BEGIN
    ALTER TABLE PayrollPeriodItems ADD PieceRateTotal DECIMAL(12,2) NOT NULL DEFAULT 0;
    PRINT 'Added column: PayrollPeriodItems.PieceRateTotal';
END
GO

PRINT '========================================';
PRINT 'Phase 5 schema update complete!';
PRINT '========================================';
