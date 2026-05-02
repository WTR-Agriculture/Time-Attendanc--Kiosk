-- เพิ่มคอลัมน์วิธีการจ่ายเงินต่อพนักงานใน PayrollPeriodItems
ALTER TABLE [dbo].[PayrollPeriodItems]
  ADD PaymentMethod NVARCHAR(20) NULL;
