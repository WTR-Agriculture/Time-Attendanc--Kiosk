-- เพิ่มคอลัมน์เลื่อนจ่ายงวดหน้า
ALTER TABLE [dbo].[PayrollPeriodItems]
  ADD IsDeferred BIT NOT NULL DEFAULT 0;
