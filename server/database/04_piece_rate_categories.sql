-- ============================================================
--  Phase 4: PieceRateCategories
--  หมวดหมู่งานเหมา — สูตรราคาอยู่ที่หมวด ไม่ใช่รายการ
--  *** รันได้ซ้ำ ***
-- ============================================================

USE TimeAttendanceDB;
GO

-- 1. สร้าง PieceRateCategories
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PieceRateCategories')
BEGIN
    CREATE TABLE PieceRateCategories (
        Id           INT            NOT NULL IDENTITY(1,1) PRIMARY KEY,
        Name         NVARCHAR(100)  NOT NULL,
        HasLength    BIT            NOT NULL DEFAULT 0,     -- 1 = ใช้สูตรศอก
        ExtraPerUnit DECIMAL(10,2)  NOT NULL DEFAULT 0,     -- บวกเพิ่มต่อศอก (เช่น 25)
        BaseLength   DECIMAL(10,2)  NOT NULL DEFAULT 0,     -- ความยาวเริ่มบวก (0 = บวกทุกศอก)
        IsActive     BIT            NOT NULL DEFAULT 1,
        CreatedAt    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Created table: PieceRateCategories';
END
GO

-- 2. เพิ่ม CategoryId ใน PieceRateMaster
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('PieceRateMaster') AND name = 'CategoryId'
)
BEGIN
    ALTER TABLE PieceRateMaster ADD CategoryId INT NULL REFERENCES PieceRateCategories(Id);
    PRINT 'Added column: PieceRateMaster.CategoryId';
END
GO

-- ============================================================
PRINT '========================================';
PRINT 'Phase 4 schema update complete!';
PRINT '========================================';
