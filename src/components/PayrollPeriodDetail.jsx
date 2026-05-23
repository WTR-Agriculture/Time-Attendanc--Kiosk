import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import * as api from '../lib/api';
import ConfirmDialog from './ConfirmDialog';

const fmtDate = (s) => s ? s.slice(0, 10).split('-').reverse().join('/') : '';

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtB = (n) => '฿' + fmt(n);
const inputCls = 'bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA] w-full';

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const IconChevron = ({ open }) => (
  <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
  </svg>
);
const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconPencil = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconClock = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Modal = ({ children, onClose }) => createPortal(
  <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4"
    onClick={onClose}>
    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>,
  document.body
);

export default function PayrollPeriodDetail({ period, employees, onClose, onPaid, onDeleted }) {
  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [jobs, setJobs]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [payingId,     setPayingId]     = useState(null);
  const [payMethodFor, setPayMethodFor] = useState(null);
  const [deferringId,  setDeferringId]  = useState(null);
  const [mergingId,    setMergingId]    = useState(null);
  const [deleting,       setDeleting]       = useState(false);
  const [recalculating,  setRecalculating]  = useState(false);
  const [expanded, setExpanded] = useState({});
  const [dialog, setDialog] = useState(null);
  const [empSearch,       setEmpSearch]       = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('');
  const [deductFor,    setDeductFor]    = useState(null);
  const [deductAmt,    setDeductAmt]    = useState('');
  const [deductNote,   setDeductNote]   = useState('');
  const [deductSaving, setDeductSaving] = useState(false);

  // edit workDays modal state
  const [editDaysFor,   setEditDaysFor]   = useState(null);
  const [editDaysVal,   setEditDaysVal]   = useState('');
  const [editDaysSaving,setEditDaysSaving]= useState(false);

  // piece rate modal state
  const [addingFor, setAddingFor] = useState(null);
  const [fJobId,  setFJobId]  = useState('');
  const [fQty,    setFQty]    = useState('');
  const [fLen,    setFLen]    = useState('');
  const [fNote,   setFNote]   = useState('');
  const [queue,   setQueue]   = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [saveOk,  setSaveOk]  = useState(false);

  useEffect(() => { loadDetail(); loadJobs(); }, [period.id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const r = await api.getPayrollPeriodDetail(period.id);
      setDetail(r);
      const init = {};
      (r.items || []).forEach(item => { init[item.employeeId] = item.pieceLogs?.length > 0; });
      setExpanded(init);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadJobs = async () => {
    try {
      const [jd, cd] = await Promise.all([api.getPieceRateJobs(), api.getPieceRateCategories()]);
      setJobs(jd.jobs || []);
      setCategories(cd.categories || []);
    } catch {}
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try { await api.recalculatePeriod(period.id); await loadDetail(); } catch {}
    setRecalculating(false);
  };

  const openEditDays = (item) => {
    setEditDaysFor(item);
    setEditDaysVal(String(item.workDays));
  };

  const handleSaveWorkDays = async () => {
    if (!editDaysFor || editDaysVal === '') return;
    setEditDaysSaving(true);
    try {
      await api.updateWorkDays(period.id, editDaysFor.employeeId, parseFloat(editDaysVal));
      setEditDaysFor(null);
      loadDetail();
    } catch {}
    setEditDaysSaving(false);
  };

  const openDeduct = (item) => {
    setDeductFor(item);
    setDeductAmt('');
    setDeductNote('');
  };

  const handleDeductAdvance = async () => {
    if (!deductFor || !deductAmt) return;
    setDeductSaving(true);
    try {
      await api.deductAdvance({
        employeeId:   deductFor.employeeId,
        employeeName: deductFor.name,
        amount:       parseFloat(deductAmt),
        note:         deductNote,
        periodId:     period.id,
      });
      setDeductFor(null);
      loadDetail();
    } catch {}
    setDeductSaving(false);
  };

  // ── Piece rate modal ──
  const selectedJob = jobs.find(j => j.id === Number(fJobId));
  const calcPrice = (job, qty, len) => {
    if (!job) return { unitPrice: 0, totalAmount: 0 };
    const extra = job.hasLength
      ? Math.max(0, (parseFloat(len) || 0) - job.baseLength) * job.extraPerUnit
      : 0;
    const unitPrice = job.basePrice + extra;
    return { unitPrice, totalAmount: unitPrice * (parseFloat(qty) || 0) };
  };
  const { unitPrice, totalAmount } = calcPrice(selectedJob, fQty, fLen);

  const openModal = (item) => {
    setAddingFor(item);
    setFJobId(''); setFQty(''); setFLen(''); setFNote('');
    setQueue([]);
  };
  const closeModal = () => { setAddingFor(null); setQueue([]); };

  const handleAddToQueue = () => {
    if (!fJobId || !fQty) return;
    const job = selectedJob;
    const { unitPrice: up, totalAmount: ta } = calcPrice(job, fQty, fLen);
    setQueue(prev => [...prev, {
      id: Date.now(), jobId: job.id, jobName: job.jobName, unit: job.unit,
      quantity: parseFloat(fQty),
      unitLength: job.hasLength ? (parseFloat(fLen) || 0) : 0,
      hasLength: job.hasLength, extraPerUnit: job.extraPerUnit,
      unitPrice: up, totalAmount: ta, note: fNote,
    }]);
    setFJobId(''); setFQty(''); setFLen(''); setFNote('');
  };

  const handleSaveQueue = async () => {
    if (!addingFor) return;
    let finalQueue = [...queue];
    if (fJobId && fQty) {
      const job = selectedJob;
      const { unitPrice: up, totalAmount: ta } = calcPrice(job, fQty, fLen);
      finalQueue.push({
        id: Date.now(), jobId: job.id, jobName: job.jobName, unit: job.unit,
        quantity: parseFloat(fQty),
        unitLength: job.hasLength ? (parseFloat(fLen) || 0) : 0,
        unitPrice: up, totalAmount: ta, note: fNote,
      });
    }
    if (finalQueue.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(finalQueue.map(item =>
        api.addPeriodPieceRate(period.id, {
          employeeId:   addingFor.employeeId,
          employeeName: addingFor.name,
          jobId:        item.jobId,
          quantity:     item.quantity,
          unitLength:   item.unitLength,
          unitPrice:    item.unitPrice,
          totalAmount:  item.totalAmount,
          note:         item.note,
        })
      ));
      setQueue([]);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
      await loadDetail();
      setAddingFor(null);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleDeletePieceLog = (logId) => {
    setDialog({
      title: 'ลบรายการงานเหมา',
      message: 'ยืนยันลบรายการนี้?',
      confirmLabel: 'ลบ',
      danger: true,
      onConfirm: async () => {
        setDialog(null);
        await api.deletePieceRateLog(logId);
        await loadDetail();
      },
    });
  };

  // ── Delete period ──
  const handleDelete = () => {
    setDialog({
      title: 'ลบงวดค่าแรง',
      message: `${fmtDate(detail.startDate)} — ${fmtDate(detail.endDate)}\nข้อมูลทั้งหมดในงวดนี้จะหายถาวร`,
      confirmLabel: 'ลบงวด',
      danger: true,
      onConfirm: async () => {
        setDialog(null);
        setDeleting(true);
        try {
          await api.deletePayrollPeriod(period.id);
          onDeleted?.();
        } catch (err) {
          alert('ลบไม่สำเร็จ: ' + err.message);
        }
        setDeleting(false);
      },
    });
  };

  // ── Defer / un-defer employee ──
  const handleDefer = async (item) => {
    setDeferringId(item.employeeId);
    try {
      await api.toggleDeferPayrollItem(period.id, item.employeeId);
      await loadDetail();
      onPaid?.();
    } catch (err) { console.error(err); }
    setDeferringId(null);
  };

  const handleMerge = async (item) => {
    setMergingId(item.employeeId);
    try { await api.mergeDeferred(period.id, item.employeeId); await loadDetail(); onPaid?.(); }
    catch (err) { console.error(err); }
    setMergingId(null);
  };

  const handleUnmerge = async (item) => {
    setMergingId(item.employeeId);
    try { await api.unmergeDeferred(period.id, item.employeeId); await loadDetail(); onPaid?.(); }
    catch (err) { console.error(err); }
    setMergingId(null);
  };

  // ── Pay individual employee ──
  const handlePayEmployee = async (method) => {
    if (!payMethodFor) return;
    const item = payMethodFor;
    setPayMethodFor(null);
    setPayingId(item.employeeId);
    try {
      await api.payPayrollPeriodItem(period.id, item.employeeId, method);
      await loadDetail();
      onPaid?.();
    } catch (err) { console.error(err); }
    setPayingId(null);
  };

  // ── Exports ──
  const periodStatusText = () => {
    const dc = detail?.items.filter(i => i.isDeferred).length ?? 0;
    if (detail?.status === 'Paid')    return dc > 0 ? `จ่ายครบแล้ว (เลื่อน ${dc} คน)` : 'จ่ายครบแล้ว';
    if (detail?.status === 'Partial') return 'จ่ายบางส่วน';
    return 'ยังไม่จ่าย';
  };
  const itemStatusText = (i) => {
    if (i.paidStatus === 'Paid') return `จ่ายแล้ว${i.paymentMethod ? ` · ${i.paymentMethod}` : ''}${i.paidAt ? ` (${fmtDate(i.paidAt)})` : ''}`;
    if (i.isDeferred) return 'เลื่อนงวดหน้า';
    return 'ยังไม่จ่าย';
  };

  const exportCSV = () => {
    if (!detail) return;
    const rows = [
      [`งวดค่าแรง: ${fmtDate(detail.startDate)} — ${fmtDate(detail.endDate)}`],
      [`สถานะ: ${periodStatusText()}`],
      [],
      ['ชื่อ', 'วันทำงาน', 'ค่าแรงปกติ', 'หักมาสาย', 'OT (฿)', 'งานเหมา (฿)', 'ชม.พิเศษ (฿)', 'หักเบิก (฿)', 'สุทธิ (฿)', 'สถานะการจ่าย'],
      ...detail.items.map(i => [
        i.name, i.workDays, i.baseAmount, i.lateDeduction,
        i.otAmount, i.pieceRateTotal, i.specialHoursTotal || 0, i.advanceDeduction, i.netTotal,
        itemStatusText(i),
      ]),
      [],
      [`รวมสุทธิ`, '', '', '', '', '', '', '', detail.grandTotal, ''],
    ];
    if (detail.items.some(i => i.pieceLogs?.length > 0)) {
      rows.push([], ['── รายการงานเหมา ──']);
      rows.push(['พนักงาน', 'รายการงาน', 'จำนวน', 'หน่วย', 'ความยาว(ศอก)', 'ราคา/หน่วย (฿)', 'รวม (฿)', 'หมายเหตุ']);
      detail.items.forEach(item => {
        item.pieceLogs?.forEach(log => {
          rows.push([
            item.name, log.jobName, log.quantity, log.unit,
            log.unitLength > 0 ? log.unitLength : '',
            log.unitPrice, log.totalAmount, log.note || '',
          ]);
        });
      });
    }
    if (detail.items.some(i => i.mergedDeferredAmount > 0)) {
      rows.push([], ['── รวมจ่ายจากงวดก่อน ──']);
      rows.push(['พนักงาน', 'งวดที่เลื่อนมา', 'จำนวนเงิน (฿)']);
      detail.items.filter(i => i.mergedDeferredAmount > 0).forEach(item => {
        rows.push([
          item.name,
          `${fmtDate(item.mergedDeferredStartDate)}–${fmtDate(item.mergedDeferredEndDate)}`,
          item.mergedDeferredAmount,
        ]);
      });
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payroll_${detail.startDate}_${detail.endDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    if (!detail) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: สรุป
    const summaryAoa = [
      [`งวดค่าแรง: ${fmtDate(detail.startDate)} — ${fmtDate(detail.endDate)}`],
      [`สถานะ: ${periodStatusText()}`],
      [],
      ['ชื่อ', 'วันทำงาน', 'ค่าแรงปกติ', 'หักมาสาย', 'OT', 'งานเหมา', 'ชม.พิเศษ', 'หักเบิก', 'สุทธิ', 'สถานะการจ่าย'],
      ...detail.items.map(i => [
        i.name, i.workDays, i.baseAmount, i.lateDeduction,
        i.otAmount, i.pieceRateTotal, i.specialHoursTotal || 0, i.advanceDeduction, i.netTotal,
        itemStatusText(i),
      ]),
      [],
      ['รวมสุทธิ', '', '', '', '', '', '', '', detail.grandTotal, ''],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryAoa);
    ws1['!cols'] = [{ wch: 14 }, { wch: 9 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 12 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'สรุปค่าแรง');

    // Sheet 2: งานเหมา (ถ้ามี)
    const allPiece = [];
    detail.items.forEach(item => {
      item.pieceLogs?.forEach(log => {
        allPiece.push([
          item.name, log.jobName, log.quantity, log.unit,
          log.unitLength > 0 ? log.unitLength : 0,
          log.unitPrice, log.totalAmount, log.note || '',
        ]);
      });
    });
    if (allPiece.length > 0) {
      const pieceAoa = [
        ['พนักงาน', 'รายการงาน', 'จำนวน', 'หน่วย', 'ความยาว(ศอก)', 'ราคา/หน่วย', 'รวม', 'หมายเหตุ'],
        ...allPiece,
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(pieceAoa);
      ws2['!cols'] = [{ wch: 20 }, { wch: 24 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'งานเหมา');
    }
    const mergedItems = detail.items.filter(i => i.mergedDeferredAmount > 0);
    if (mergedItems.length > 0) {
      const mergedAoa = [
        ['พนักงาน', 'งวดที่เลื่อนมา', 'จำนวนเงิน (฿)'],
        ...mergedItems.map(i => [
          i.name,
          `${fmtDate(i.mergedDeferredStartDate)}–${fmtDate(i.mergedDeferredEndDate)}`,
          i.mergedDeferredAmount,
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(mergedAoa);
      ws3['!cols'] = [{ wch: 20 }, { wch: 24 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'รวมจ่ายงวดก่อน');
    }

    XLSX.writeFile(wb, `payroll_${detail.startDate}_${detail.endDate}.xlsx`);
  };

  const handlePrint = () => {
    if (!detail) return;
    const rows = detail.items.map(item => {
      const st = item.paidStatus === 'Paid'
        ? `<span class="paid">จ่ายแล้ว${item.paymentMethod ? ` · ${item.paymentMethod}` : ''}</span>`
        : item.isDeferred
          ? `<span class="deferred">เลื่อนงวดหน้า</span>`
          : `<span class="unpaid">ยังไม่จ่าย</span>`;
      return `
      <tr>
        <td>${item.name}</td>
        <td class="ctr">${item.workDays}</td>
        <td class="num">${fmt(item.baseAmount)}</td>
        <td class="num" style="color:#ef4444">${item.lateDeduction > 0 ? fmt(item.lateDeduction) : '-'}</td>
        <td class="num" style="color:#10b981">${item.otAmount > 0 ? fmt(item.otAmount) : '-'}</td>
        <td class="num" style="color:#6366f1">${item.pieceRateTotal > 0 ? fmt(item.pieceRateTotal) : '-'}</td>
        <td class="num" style="color:#7c3aed">${(item.specialHoursTotal || 0) > 0 ? fmt(item.specialHoursTotal) : '-'}</td>
        <td class="num" style="color:#f59e0b">${item.advanceDeduction > 0 ? fmt(item.advanceDeduction) : '-'}</td>
        <td class="num" style="font-weight:bold">${fmt(item.netTotal)}</td>
        <td style="font-size:11px">${st}</td>
      </tr>
      ${item.pieceLogs?.length > 0 ? `
        <tr><td colspan="9" style="padding:2px 10px 6px;color:#6b7280;font-size:11px">
          งานเหมา: ${item.pieceLogs.map(l =>
            `${l.jobName} ×${l.quantity}${l.unitLength > 0 ? ` (${l.unitLength}ศอก)` : ''} = ฿${fmt(l.totalAmount)}`
          ).join(' / ')}
        </td></tr>` : ''}
      ${item.mergedDeferredAmount > 0 ? `
        <tr><td colspan="9" style="padding:2px 10px 6px;color:#0369a1;font-size:11px">
          รวมจากงวด ${item.mergedDeferredStartDate ? fmtDate(item.mergedDeferredStartDate) + '–' + fmtDate(item.mergedDeferredEndDate) : ''} = ฿${fmt(item.mergedDeferredAmount)}
        </td></tr>` : ''}
    `;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>งวดค่าแรง ${fmtDate(detail.startDate)} — ${fmtDate(detail.endDate)}</title>
      <style>
        body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #111; margin: 20px; }
        h2 { font-size: 18px; margin-bottom: 4px; }
        p { margin: 2px 0 12px; color: #555; }
        .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 16px; }
        .btn { padding: 14px 28px; border-radius: 14px; border: none; font-size: 16px; font-family: inherit; cursor: pointer; font-weight: bold; }
        .btn-back  { background: #f1f5f9; color: #475569; }
        .btn-print { background: #7B8CFA; color: #fff; }
        @media print { .toolbar { display: none; } }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; overflow: hidden; }
        thead tr { background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
        th { font-weight: bold; }
        tfoot td { font-weight: bold; border-top: 2px solid #e2e8f0; border-bottom: none; }
        .num { text-align: right; }
        .ctr { text-align: center; }
        .paid { color: #059669; } .deferred { color: #6366f1; } .unpaid { color: #94a3b8; }
        col.c-name  { width: 13%; }
        col.c-days  { width: 7%; }
        col.c-wage  { width: 10%; }
        col.c-late  { width: 9%; }
        col.c-ot    { width: 8%; }
        col.c-piece { width: 9%; }
        col.c-sh    { width: 9%; }
        col.c-adv   { width: 8%; }
        col.c-net   { width: 10%; }
        col.c-stat  { width: 17%; }
        @media print { body { margin: 10px; } }
      </style></head><body>
      <div class="toolbar">
        <button class="btn btn-back" onclick="window.close()">← ปิดหน้านี้</button>
        <button class="btn btn-print" onclick="window.print()">พิมพ์ / บันทึก PDF</button>
      </div>
      <h2>งวดค่าแรง: ${fmtDate(detail.startDate)} — ${fmtDate(detail.endDate)}</h2>
      <p>สถานะ: ${periodStatusText()}</p>
      <table>
        <colgroup>
          <col class="c-name"/><col class="c-days"/><col class="c-wage"/>
          <col class="c-late"/><col class="c-ot"/><col class="c-piece"/>
          <col class="c-sh"/><col class="c-adv"/><col class="c-net"/><col class="c-stat"/>
        </colgroup>
        <thead><tr>
          <th>ชื่อ</th>
          <th class="ctr">วันทำงาน</th>
          <th class="num">ค่าแรง (฿)</th>
          <th class="num">หักมาสาย (฿)</th>
          <th class="num">OT (฿)</th>
          <th class="num">งานเหมา (฿)</th>
          <th class="num">ชม.พิเศษ (฿)</th>
          <th class="num">หักเบิก (฿)</th>
          <th class="num">สุทธิ (฿)</th>
          <th>สถานะ</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="8" class="num">รวมสุทธิทั้งหมด</td>
          <td class="num">฿${fmt(detail.grandTotal)}</td>
          <td></td>
        </tr></tfoot>
      </table>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  // ── jobs grouped by category ──
  const jobsByCategory = categories.map(cat => ({
    ...cat,
    jobs: jobs.filter(j => j.categoryId === cat.id),
  }));
  const uncategorized = jobs.filter(j => !j.categoryId);

  const periodStatus  = detail?.status;
  const deferredCount = detail?.items.filter(i => i.isDeferred).length ?? 0;
  const statusBadge = {
    Paid:    { label: <span className="flex items-center gap-1"><IconCheck />{deferredCount > 0 ? `จ่ายครบแล้ว (เลื่อน ${deferredCount} คน)` : 'จ่ายครบแล้ว'}</span>, cls: 'bg-emerald-100 text-emerald-700' },
    Partial: { label: <span className="flex items-center gap-1"><IconClock />จ่ายบางส่วน</span>, cls: 'bg-amber-100 text-amber-700' },
    Unpaid:  { label: 'ยังไม่จ่าย',                                                              cls: 'bg-slate-100 text-slate-500' },
  }[periodStatus] || { label: periodStatus, cls: 'bg-slate-100 text-slate-500' };

  // ── Render ──
  if (loading) return (
    <div className="flex justify-center py-16 text-slate-400 gap-3">
      <div className="w-6 h-6 border-4 border-slate-100 border-t-[#7B8CFA] rounded-full animate-spin" />
      กำลังโหลด...
    </div>
  );
  if (!detail) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">งวดค่าแรง</p>
            <h3 className="text-xl font-bold text-[#222222]">{fmtDate(detail.startDate)} — {fmtDate(detail.endDate)}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 transition-colors"><IconX /></button>
          </div>
        </div>

        {/* Grand total + Export buttons */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400">รวมสุทธิทั้งหมด</p>
            <p className="text-2xl font-bold text-[#7B8CFA]">{fmtB(detail.grandTotal)}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleRecalculate} disabled={recalculating}
              className="bg-sky-50 border border-sky-200 text-sky-600 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer hover:bg-sky-100 transition-colors flex items-center gap-1.5 disabled:opacity-40">
              <svg className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {recalculating ? 'กำลังอัปเดต...' : 'อัปเดตข้อมูล'}
            </button>
            {periodStatus === 'Unpaid' ? (
              <button onClick={handleDelete} disabled={deleting}
                className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-40">
                <IconTrash />{deleting ? 'กำลังลบ...' : 'ลบงวด'}
              </button>
            ) : (
              <button disabled title="ไม่สามารถลบงวดที่จ่ายไปแล้วได้"
                className="bg-slate-50 border border-slate-200 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-not-allowed">
                <IconTrash />ลบงวด
              </button>
            )}
            <button onClick={exportCSV}
              className="bg-[#F8FAFC] border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
            <button onClick={exportXLSX}
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              XLSX
            </button>
            <button onClick={handlePrint}
              className="bg-[#7B8CFA]/10 border border-[#7B8CFA]/30 text-[#7B8CFA] text-xs font-bold px-3 py-2 rounded-xl cursor-pointer hover:bg-[#7B8CFA]/20 transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
          </svg>
          <input value={empSearch} onChange={e => setEmpSearch(e.target.value)}
            placeholder="ค้นหาชื่อพนักงาน..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#7B8CFA]" />
        </div>
        <select value={empStatusFilter} onChange={e => setEmpStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-[#7B8CFA]">
          <option value="">ทุกสถานะ</option>
          <option value="Paid">จ่ายแล้ว</option>
          <option value="Unpaid">ยังไม่จ่าย</option>
          <option value="Deferred">เลื่อนงวดหน้า</option>
        </select>
      </div>

      {/* ── Employee cards ── */}
      <div className="flex flex-col gap-3">
        {detail.items.filter(item => {
          const matchSearch = !empSearch || item.name.toLowerCase().includes(empSearch.toLowerCase());
          const matchStatus = !empStatusFilter ||
            (empStatusFilter === 'Paid'     && item.paidStatus === 'Paid') ||
            (empStatusFilter === 'Unpaid'   && item.paidStatus !== 'Paid' && !item.isDeferred) ||
            (empStatusFilter === 'Deferred' && item.isDeferred && item.paidStatus !== 'Paid');
          return matchSearch && matchStatus;
        }).map(item => {
          const isOpen      = expanded[item.employeeId];
          const itemPaid    = item.paidStatus === 'Paid';
          const isDeferred  = item.isDeferred && !itemPaid;
          const isPaying    = payingId    === item.employeeId;
          const isDeferring = deferringId === item.employeeId;
          const isMerging   = mergingId   === item.employeeId;
          const hasMerged   = item.mergedDeferredAmount > 0;
          const hasPending  = !itemPaid && !isDeferred && !hasMerged && item.pendingDeferred;
          return (
            <div key={item.employeeId}
              className={`bg-white rounded-3xl border shadow-sm p-5 flex flex-col gap-3
                ${itemPaid ? 'border-emerald-200' : isDeferred ? 'border-indigo-200 opacity-70' : 'border-slate-100'}`}>

              {/* Employee header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#222222]">{item.name}</p>
                    {!itemPaid && (
                      <button onClick={() => openEditDays(item)}
                        title="แก้ไขวันทำงาน"
                        className="text-slate-400 hover:text-[#7B8CFA] p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                        <IconPencil />
                      </button>
                    )}
                    {itemPaid && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <IconCheck />จ่ายแล้ว{item.paymentMethod ? ` · ${item.paymentMethod}` : ''} {item.paidAt ? fmtDate(item.paidAt) : ''}
                      </span>
                    )}
                    {isDeferred && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <IconClock />เลื่อนงวดหน้า
                      </span>
                    )}
                  </div>
                  {item.department && <p className="text-xs text-slate-400 mt-0.5">{item.department}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xl font-bold text-[#7B8CFA]">{fmtB(item.netTotal)}</p>
                  {!itemPaid && !isDeferred && (
                    <>
                      <button onClick={() => handleDefer(item)} disabled={isDeferring}
                        className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer disabled:opacity-50 active:scale-95 transition-transform whitespace-nowrap hover:bg-indigo-50 hover:text-indigo-600">
                        {isDeferring ? '...' : 'เลื่อนงวดหน้า'}
                      </button>
                      <button onClick={() => setPayMethodFor(item)} disabled={isPaying}
                        className="bg-[#C6F45D] text-[#222222] text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer disabled:opacity-50 active:scale-95 transition-transform whitespace-nowrap">
                        {isPaying ? '...' : 'จ่าย'}
                      </button>
                    </>
                  )}
                  {isDeferred && (
                    <button onClick={() => handleDefer(item)} disabled={isDeferring}
                      className="bg-slate-100 text-slate-400 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer disabled:opacity-50 active:scale-95 transition-transform whitespace-nowrap hover:bg-red-50 hover:text-red-400">
                      {isDeferring ? '...' : 'ยกเลิกเลื่อน'}
                    </button>
                  )}
                </div>
              </div>

              {/* Wage breakdown chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-[#F8FAFC] rounded-xl px-3 py-1.5 text-slate-500">
                  {item.workDays} วัน · {fmtB(item.baseAmount)}
                </span>
                {item.lateDeduction > 0 && (
                  <span className="bg-red-50 text-red-500 rounded-xl px-3 py-1.5">
                    มาสาย -{fmtB(item.lateDeduction)}
                  </span>
                )}
                {item.otAmount > 0 && (
                  <span className="bg-emerald-50 text-emerald-600 rounded-xl px-3 py-1.5">
                    OT +{fmtB(item.otAmount)}
                  </span>
                )}
                {item.pieceRateTotal > 0 && (
                  <span className="bg-[#7B8CFA]/10 text-[#7B8CFA] rounded-xl px-3 py-1.5">
                    เหมา +{fmtB(item.pieceRateTotal)}
                  </span>
                )}
                {item.advanceDeduction > 0 && (
                  <span className="bg-amber-50 text-amber-600 rounded-xl px-3 py-1.5">
                    หักเบิก -{fmtB(item.advanceDeduction)}
                  </span>
                )}
                {item.specialHoursTotal > 0 && (
                  <span className="bg-violet-50 text-violet-600 rounded-xl px-3 py-1.5">
                    ชม.พิเศษ {item.specialHoursHours} ชม. +{fmtB(item.specialHoursTotal)}
                  </span>
                )}
                {hasMerged && (
                  <span className="bg-sky-50 text-sky-700 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                    รวมจากงวด {fmtDate(item.mergedDeferredStartDate)}–{fmtDate(item.mergedDeferredEndDate)} +{fmtB(item.mergedDeferredAmount)}
                    {!itemPaid && (
                      <button onClick={() => handleUnmerge(item)} disabled={isMerging}
                        className="ml-1 text-sky-400 hover:text-red-400 font-bold cursor-pointer disabled:opacity-50">✕</button>
                    )}
                  </span>
                )}
                {hasPending && (
                  <div className="flex items-center gap-2">
                    <span className="bg-sky-50 text-sky-600 rounded-xl px-3 py-1.5">
                      มีเลื่อนจากงวด {fmtDate(item.pendingDeferred.startDate)}–{fmtDate(item.pendingDeferred.endDate)} · {fmtB(item.pendingDeferred.netTotal)}
                    </span>
                    <button onClick={() => handleMerge(item)} disabled={isMerging}
                      className="bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-50 active:scale-95 transition-transform whitespace-nowrap">
                      {isMerging ? '...' : 'รวมจ่าย'}
                    </button>
                  </div>
                )}
                {item.outstandingAdvance > 0 && !itemPaid && (
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-50 text-orange-600 rounded-xl px-3 py-1.5">
                      ค้างเบิก {fmtB(item.outstandingAdvance)}
                    </span>
                    <button onClick={() => openDeduct(item)}
                      className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer active:scale-95 transition-transform">
                      หักเบิก
                    </button>
                  </div>
                )}
              </div>

              {/* Piece rate section */}
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                {/* Toggle header */}
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [item.employeeId]: !prev[item.employeeId] }))}
                  className="flex items-center justify-between text-sm font-semibold text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
                  <span>งานเหมา {item.pieceLogs?.length > 0 ? `(${item.pieceLogs.length} รายการ)` : '(ยังไม่มีรายการ)'}</span>
                  {item.pieceLogs?.length > 0 && <IconChevron open={isOpen} />}
                </button>

                {/* Piece rate list */}
                {isOpen && item.pieceLogs?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {item.pieceLogs.map(log => (
                      <div key={log.id}
                        className="bg-[#F8FAFC] rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#222222] truncate">{log.jobName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {log.quantity} {log.unit}
                            {log.unitLength > 0 ? ` · ${log.unitLength} ศอก` : ''}
                            {' · '}฿{fmt(log.unitPrice)}/หน่วย
                            {log.note ? ` · ${log.note}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <p className="text-sm font-bold text-[#7B8CFA]">{fmtB(log.totalAmount)}</p>
                          {!itemPaid && !isDeferred && (
                            <button onClick={() => handleDeletePieceLog(log.id)}
                              className="text-slate-300 hover:text-red-400 transition-colors cursor-pointer">
                              <IconTrash />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add piece rate button */}
                {!itemPaid && !isDeferred && (
                  <button onClick={() => { openModal(item); setExpanded(prev => ({ ...prev, [item.employeeId]: true })); }}
                    className="self-start bg-[#7B8CFA]/10 text-[#7B8CFA] text-sm font-bold px-4 py-2 rounded-2xl cursor-pointer hover:bg-[#7B8CFA]/20 transition-colors active:scale-95">
                    + เพิ่มงานเหมา
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Payment method modal ── */}
      {payMethodFor && (
        <Modal onClose={() => setPayMethodFor(null)}>
          <div>
            <h2 className="text-xl font-bold text-[#222222]">เลือกวิธีชำระเงิน</h2>
            <p className="text-sm text-slate-500 mt-1">
              ค่าแรง <span className="font-semibold text-[#222222]">{payMethodFor.name}</span>
              {' · '}<span className="font-bold text-[#7B8CFA]">{fmtB(payMethodFor.netTotal)}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={() => handlePayEmployee('เงินสด')}
              className="flex flex-col items-center gap-3 bg-[#F8FAFC] border-2 border-slate-200 hover:border-[#7B8CFA] hover:bg-[#7B8CFA]/5 rounded-2xl p-5 cursor-pointer transition-all active:scale-95 group">
              <svg className="w-10 h-10 text-slate-400 group-hover:text-[#7B8CFA] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-bold text-slate-600 group-hover:text-[#7B8CFA] transition-colors">เงินสด</span>
            </button>
            <button
              onClick={() => handlePayEmployee('เงินโอน')}
              className="flex flex-col items-center gap-3 bg-[#F8FAFC] border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-2xl p-5 cursor-pointer transition-all active:scale-95 group">
              <svg className="w-10 h-10 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="font-bold text-slate-600 group-hover:text-emerald-500 transition-colors">เงินโอน</span>
            </button>
          </div>
          <button onClick={() => setPayMethodFor(null)}
            className="w-full bg-slate-100 text-slate-500 font-semibold py-3 rounded-2xl cursor-pointer hover:bg-slate-200 transition-colors">
            ยกเลิก
          </button>
        </Modal>
      )}

      {/* ── Piece rate modal ── */}
      {addingFor && (
        <Modal onClose={closeModal}>
          <div>
            <h2 className="text-xl font-bold text-[#222222]">เพิ่มงานเหมา</h2>
            <p className="text-sm text-slate-500 mt-0.5">พนักงาน: <span className="font-semibold text-[#222222]">{addingFor.name}</span></p>
          </div>

          {/* Job selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-500">รายการงาน *</label>
            <select value={fJobId} onChange={e => { setFJobId(e.target.value); setFLen(''); }} className={inputCls}>
              <option value="">-- เลือกรายการ --</option>
              {jobsByCategory.map(cat =>
                cat.jobs.length > 0 && (
                  <optgroup key={cat.id} label={cat.name}>
                    {cat.jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.jobName} ({j.unit})</option>
                    ))}
                  </optgroup>
                )
              )}
              {uncategorized.length > 0 && (
                <optgroup label="ไม่มีหมวด">
                  {uncategorized.map(j => (
                    <option key={j.id} value={j.id}>{j.jobName} ({j.unit})</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Qty / Length / Note */}
          <div className={`grid gap-3 ${selectedJob?.hasLength ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">
                จำนวน ({selectedJob?.unit || 'หน่วย'}) *
              </label>
              <input type="number" min="0" value={fQty} onChange={e => setFQty(e.target.value)}
                placeholder="0" className={inputCls} />
            </div>
            {selectedJob?.hasLength && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-500">
                  ความยาว (ศอก)
                </label>
                <input type="number" min="0" value={fLen} onChange={e => setFLen(e.target.value)}
                  placeholder="0" className={inputCls} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">หมายเหตุ</label>
              <input type="text" value={fNote} onChange={e => setFNote(e.target.value)}
                placeholder="ไม่บังคับ" className={inputCls} />
            </div>
          </div>

          {/* Price preview */}
          {selectedJob && fQty && (
            <div className="bg-[#7B8CFA]/8 border border-[#7B8CFA]/20 rounded-2xl px-4 py-2.5 flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {fQty} {selectedJob.unit} × {fmtB(unitPrice)}
                {selectedJob.hasLength && fLen ? ` (+${fLen}ศอก×${selectedJob.extraPerUnit})` : ''}
              </p>
              <p className="font-bold text-[#7B8CFA]">{fmtB(totalAmount)}</p>
            </div>
          )}

          <button onClick={handleAddToQueue}
            disabled={!fJobId || !fQty}
            className="bg-[#10B981] disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-2xl cursor-pointer active:scale-95 transition-transform self-start text-sm">
            + เพิ่มเข้ารายการรอ
          </button>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="bg-[#F8FAFC] rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-sm font-semibold text-slate-500">รอบันทึก ({queue.length} รายการ)</p>
              {queue.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <p className="text-sm text-[#222222] flex-1 truncate">
                    {item.jobName} · {item.quantity} {item.unit}
                    {item.hasLength && item.unitLength > 0 ? ` · ${item.unitLength}ศอก` : ''}
                  </p>
                  <p className="text-sm font-bold text-[#10B981] flex-shrink-0">{fmtB(item.totalAmount)}</p>
                  <button onClick={() => setQueue(q => q.filter(x => x.id !== item.id))}
                    className="text-slate-300 hover:text-red-400 cursor-pointer flex-shrink-0"><IconTrash /></button>
                </div>
              ))}
              <p className="text-xs text-slate-400 pt-1 border-t border-slate-200">
                รวม {fmtB(queue.reduce((s, q) => s + q.totalAmount, 0))}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={closeModal}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl cursor-pointer">ยกเลิก</button>
            {(() => {
              const pendingInForm = fJobId && fQty;
              const total = queue.length + (pendingInForm ? 1 : 0);
              return (
                <button onClick={handleSaveQueue}
                  disabled={total === 0 || saving}
                  className="flex-1 bg-[#7B8CFA] disabled:opacity-40 text-white font-bold py-3 rounded-2xl cursor-pointer">
                  {saving ? 'กำลังบันทึก...' : `บันทึก ${total} รายการ`}
                </button>
              );
            })()}
          </div>
          {saveOk && <p className="text-center text-emerald-600 font-medium text-sm flex items-center justify-center gap-1"><IconCheck />บันทึกสำเร็จ</p>}
        </Modal>
      )}

      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          danger={dialog.danger}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* ── Edit Work Days Modal ── */}
      {editDaysFor && (
        <Modal onClose={() => setEditDaysFor(null)}>
          <h2 className="text-xl font-bold text-[#222222]">แก้ไขวันทำงาน</h2>
          <p className="text-slate-400 text-sm -mt-2">{editDaysFor.name}</p>
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-600">
            ปัจจุบัน {editDaysFor.workDays} วัน · {fmtB(editDaysFor.baseAmount)}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-500">จำนวนวันทำงาน *</label>
            <input type="number" min="0" step="0.5" inputMode="decimal" value={editDaysVal}
              onChange={e => setEditDaysVal(e.target.value)}
              className={inputCls} />
          </div>
          {editDaysVal !== '' && (() => {
            const empRate = employees?.find(e => e.employeeId === editDaysFor.employeeId)?.rate ?? 0;
            const newBase = parseFloat(editDaysVal || 0) * empRate;
            return empRate > 0 ? (
              <div className="bg-[#7B8CFA]/8 border border-[#7B8CFA]/20 rounded-2xl px-4 py-2.5 text-sm text-[#7B8CFA]">
                {editDaysVal} วัน × {fmtB(empRate)}/วัน → {fmtB(newBase)}
              </div>
            ) : null;
          })()}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setEditDaysFor(null)}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl cursor-pointer">ยกเลิก</button>
            <button onClick={handleSaveWorkDays} disabled={editDaysVal === '' || editDaysSaving}
              className="flex-1 bg-[#7B8CFA] disabled:opacity-40 text-white font-bold py-3 rounded-2xl cursor-pointer">
              {editDaysSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Deduct Advance Modal ── */}
      {deductFor && (
        <Modal onClose={() => setDeductFor(null)}>
          <h2 className="text-xl font-bold text-[#222222]">หักเบิก</h2>
          <p className="text-slate-400 text-sm -mt-2">{deductFor.name}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-2.5 text-sm text-orange-700">
            ยอดค้างเบิกทั้งหมด {fmtB(deductFor.outstandingAdvance)}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">จำนวนที่จะหัก (บาท) *</label>
              <input type="number" min="0" value={deductAmt}
                onChange={e => setDeductAmt(e.target.value)}
                placeholder={String(deductFor.outstandingAdvance)}
                className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">หมายเหตุ</label>
              <input type="text" value={deductNote} onChange={e => setDeductNote(e.target.value)}
                placeholder="ไม่บังคับ" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setDeductFor(null)}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl cursor-pointer">ยกเลิก</button>
            <button onClick={handleDeductAdvance} disabled={!deductAmt || deductSaving}
              className="flex-1 bg-orange-500 disabled:opacity-40 text-white font-bold py-3 rounded-2xl cursor-pointer">
              {deductSaving ? 'กำลังบันทึก...' : 'ยืนยันหัก'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
