import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as api from '../lib/api';
import DateInput from './DateInput';
import ConfirmDialog from './ConfirmDialog';

const today = () => new Date().toLocaleDateString('en-CA');
const formatMoney = (n) =>
  '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inputCls = 'bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA] w-full';

const IconCheck = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const Modal = ({ children, onClose, wide }) => createPortal(
  <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4"
    onClick={onClose}>
    <div className={`bg-white w-full ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'} rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto`}
      onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>,
  document.body
);

export default function PieceRatePage({ employees }) {
  const [tab, setTab]               = useState('log');
  const [categories, setCategories] = useState([]);
  const [jobs, setJobs]             = useState([]);
  const [logs, setLogs]             = useState([]);
  const [pageDate, setPageDate]     = useState(today());
  const [loading, setLoading]       = useState(false);

  // entry form (no date — uses pageDate)
  const [fEmpId, setFEmpId] = useState('');
  const [fJobId, setFJobId] = useState('');
  const [fQty,   setFQty]   = useState('');
  const [fLen,   setFLen]   = useState('');
  const [fNote,  setFNote]  = useState('');

  // pending queue
  const [queue,  setQueue]  = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  // category form modal
  const [showCatForm, setShowCatForm]   = useState(false);
  const [editCat, setEditCat]           = useState(null);
  const [cName,   setCName]             = useState('');
  const [cHasLen, setCHasLen]           = useState(false);
  const [cExtra,  setCExtra]            = useState('25');
  const [cBase,   setCBase]             = useState('0');
  const [cSaving, setCSaving]           = useState(false);

  // job form modal
  const [showJobForm, setShowJobForm] = useState(false);
  const [editJob, setEditJob]         = useState(null);
  const [dialog, setDialog]           = useState(null);
  const [jName,  setJName]  = useState('');
  const [jUnit,  setJUnit]  = useState('');
  const [jPrice, setJPrice] = useState('');
  const [jCatId, setJCatId] = useState('');
  const [jSaving, setJSaving] = useState(false);

  useEffect(() => { loadCategories(); loadJobs(); }, []);
  useEffect(() => { if (tab === 'log') loadLogs(pageDate); }, [tab, pageDate]);

  const loadCategories = async () => {
    try { const d = await api.getPieceRateCategories(); setCategories(d.categories); } catch {}
  };
  const loadJobs = async () => {
    try { const d = await api.getPieceRateJobs(); setJobs(d.jobs); } catch {}
  };
  const loadLogs = async (date) => {
    setLoading(true);
    try { const d = await api.getPieceRateLogs({ date }); setLogs(d.logs); } catch {}
    setLoading(false);
  };

  // selected job's category formula
  const selectedJob = jobs.find(j => j.id === Number(fJobId));
  const calcPrice = (job, qty, len) => {
    if (!job) return { unitPrice: 0, totalAmount: 0 };
    const extra = job.hasLength
      ? ((parseFloat(len) || 0) - job.baseLength) * job.extraPerUnit
      : 0;
    const unitPrice = job.basePrice + extra;
    return { unitPrice, totalAmount: unitPrice * (parseFloat(qty) || 0) };
  };
  const { unitPrice, totalAmount } = calcPrice(selectedJob, fQty, fLen);

  // เพิ่มเข้า queue (ยังไม่ save)
  const handleAddToQueue = () => {
    if (!fEmpId || !fJobId || !fQty) return;
    const emp = employees.find(e => e.employeeId === fEmpId);
    const job = selectedJob;
    const { unitPrice: up, totalAmount: ta } = calcPrice(job, fQty, fLen);
    setQueue(prev => [...prev, {
      id: Date.now(),
      employeeId: fEmpId, employeeName: emp?.name || fEmpId,
      jobId: job.id, jobName: job.jobName, unit: job.unit,
      quantity: parseFloat(fQty),
      unitLength: job.hasLength ? (parseFloat(fLen) || 0) : 0,
      hasLength: job.hasLength, extraPerUnit: job.extraPerUnit,
      unitPrice: up, totalAmount: ta, note: fNote,
    }]);
    setFQty(''); setFLen(''); setFNote('');
  };

  // บันทึกทั้งหมดใน queue (+ ของในฟอร์มถ้ากรอกอยู่)
  const handleSaveAll = async () => {
    let finalQueue = [...queue];
    if (fEmpId && fJobId && fQty) {
      const emp = employees.find(e => e.employeeId === fEmpId);
      const job = selectedJob;
      const { unitPrice: up, totalAmount: ta } = calcPrice(job, fQty, fLen);
      finalQueue.push({
        id: Date.now(),
        employeeId: fEmpId, employeeName: emp?.name || fEmpId,
        jobId: job.id, jobName: job.jobName, unit: job.unit,
        quantity: parseFloat(fQty),
        unitLength: job.hasLength ? (parseFloat(fLen) || 0) : 0,
        unitPrice: up, totalAmount: ta, note: fNote,
      });
    }
    if (finalQueue.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(finalQueue.map(item =>
        api.createPieceRateLog({
          employeeId: item.employeeId, employeeName: item.employeeName,
          jobId: item.jobId, logDate: pageDate,
          quantity: item.quantity, unitLength: item.unitLength,
          unitPrice: item.unitPrice, totalAmount: item.totalAmount, note: item.note,
        })
      ));
      setQueue([]);
      setFQty(''); setFLen(''); setFNote('');
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
      loadLogs(pageDate);
    } catch {}
    setSaving(false);
  };

  const handleDeleteLog = (id) => {
    setDialog({
      title: 'ลบรายการงานเหมา',
      message: 'ยืนยันลบรายการนี้?',
      confirmLabel: 'ลบ',
      danger: true,
      onConfirm: async () => {
        setDialog(null);
        await api.deletePieceRateLog(id);
        loadLogs(pageDate);
      },
    });
  };

  // ── Category modal ──
  const openCatForm = (cat = null) => {
    setEditCat(cat);
    setCName(cat?.name || '');
    setCHasLen(cat?.hasLength || false);
    setCExtra(cat ? String(cat.extraPerUnit) : '25');
    setCBase(cat ? String(cat.baseLength) : '0');
    setShowCatForm(true);
  };
  const handleSaveCat = async () => {
    if (!cName) return;
    setCSaving(true);
    const body = { name: cName, hasLength: cHasLen,
                   extraPerUnit: cHasLen ? parseFloat(cExtra) || 0 : 0,
                   baseLength:   cHasLen ? parseFloat(cBase) || 0 : 0 };
    try {
      if (editCat) await api.updatePieceRateCategory(editCat.id, body);
      else await api.createPieceRateCategory(body);
      setShowCatForm(false);
      loadCategories();
    } catch {}
    setCSaving(false);
  };
  const handleDeleteCat = (id) => {
    setDialog({
      title: 'ลบหมวดหมู่',
      message: 'ยืนยันลบหมวดหมู่นี้?\nรายการงานในหมวดนี้จะไม่ถูกลบ',
      confirmLabel: 'ลบ',
      danger: true,
      onConfirm: async () => {
        setDialog(null);
        await api.deletePieceRateCategory(id);
        loadCategories();
      },
    });
  };

  // ── Job modal ──
  const openJobForm = (job = null) => {
    setEditJob(job);
    setJName(job?.jobName || '');
    setJUnit(job?.unit || '');
    setJPrice(job ? String(job.basePrice) : '');
    setJCatId(job?.categoryId ? String(job.categoryId) : '');
    setShowJobForm(true);
  };
  const handleSaveJob = async () => {
    if (!jName || !jUnit || !jPrice) return;
    setJSaving(true);
    const body = { jobName: jName, unit: jUnit, basePrice: parseFloat(jPrice),
                   categoryId: jCatId ? Number(jCatId) : null };
    try {
      if (editJob) await api.updatePieceRateJob(editJob.id, body);
      else await api.createPieceRateJob(body);
      setShowJobForm(false);
      loadJobs();
    } catch {}
    setJSaving(false);
  };
  const handleDeleteJob = (id) => {
    setDialog({
      title: 'ลบรายการงาน',
      message: 'ยืนยันลบรายการงานนี้?',
      confirmLabel: 'ลบ',
      danger: true,
      onConfirm: async () => {
        setDialog(null);
        await api.deletePieceRateJob(id);
        loadJobs();
      },
    });
  };

  // search + filter state
  const [jobSearch,  setJobSearch]  = useState('');
  const [jobCatFilter, setJobCatFilter] = useState('');

  // group jobs by category for display (with search/filter)
  const filteredJobs = jobs.filter(j => {
    const matchSearch = !jobSearch || j.jobName.toLowerCase().includes(jobSearch.toLowerCase());
    const matchCat    = !jobCatFilter || String(j.categoryId) === jobCatFilter;
    return matchSearch && matchCat;
  });
  const jobsByCategory = categories.map(cat => ({
    ...cat,
    jobs: filteredJobs.filter(j => j.categoryId === cat.id),
  }));
  const uncategorized = filteredJobs.filter(j => !j.categoryId);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with date picker */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-[#222222]">งานเหมา</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <DateInput value={pageDate}
            onChange={e => setPageDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-[#7B8CFA]" />
          <div className="flex gap-2">
            {['log', 'jobs'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-2xl text-sm font-semibold cursor-pointer transition-colors
                  ${tab === t ? 'bg-[#7B8CFA] text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                {t === 'log' ? 'บันทึกงาน' : 'จัดการรายการ'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab: บันทึกงาน ── */}
      {tab === 'log' && (
        <div className="flex flex-col gap-5">
          {/* Entry form */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <p className="font-bold text-[#222222]">เพิ่มรายการ</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">พนักงาน *</label>
              <select value={fEmpId} onChange={e => setFEmpId(e.target.value)} className={inputCls}>
                <option value="">-- เลือกพนักงาน --</option>
                {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">รายการงาน *</label>
              <select value={fJobId} onChange={e => { setFJobId(e.target.value); setFLen(''); }} className={inputCls}>
                <option value="">-- เลือกรายการ --</option>
                {jobsByCategory.map(cat => (
                  cat.jobs.length > 0 && (
                    <optgroup key={cat.id} label={cat.name}>
                      {cat.jobs.map(j => (
                        <option key={j.id} value={j.id}>{j.jobName} ({j.unit})</option>
                      ))}
                    </optgroup>
                  )
                ))}
                {uncategorized.length > 0 && (
                  <optgroup label="ไม่มีหมวด">
                    {uncategorized.map(j => (
                      <option key={j.id} value={j.id}>{j.jobName} ({j.unit})</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className={`grid gap-3 ${selectedJob?.hasLength ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
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
                    ความยาว (ศอก) · +{selectedJob.extraPerUnit}/ศอก
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

            {selectedJob && fQty && (
              <div className="bg-[#7B8CFA]/8 border border-[#7B8CFA]/20 rounded-2xl px-4 py-2.5 flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  {fQty} {selectedJob.unit} × {formatMoney(unitPrice)}
                  {selectedJob.hasLength && fLen ? ` (+${fLen}ศอก×${selectedJob.extraPerUnit})` : ''}
                </p>
                <p className="font-bold text-[#7B8CFA]">{formatMoney(totalAmount)}</p>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={handleSaveAll}
                disabled={(!fEmpId || !fJobId || !fQty) && queue.length === 0 || saving}
                className="bg-[#7B8CFA] disabled:opacity-40 text-white font-bold px-6 py-3 rounded-2xl cursor-pointer active:scale-95 transition-transform">
                {saving ? 'กำลังบันทึก...' : queue.length > 0 ? `บันทึก ${queue.length + ((fEmpId && fJobId && fQty) ? 1 : 0)} รายการ` : 'บันทึก'}
              </button>
              <button onClick={handleAddToQueue}
                disabled={!fEmpId || !fJobId || !fQty}
                className="bg-[#F8FAFC] border border-slate-200 disabled:opacity-40 text-slate-600 font-bold px-6 py-3 rounded-2xl cursor-pointer active:scale-95 transition-transform">
                + เพิ่มเข้าคิว
              </button>
              {saveOk && <p className="text-emerald-600 font-medium text-sm flex items-center gap-1"><IconCheck />บันทึกแล้ว</p>}
            </div>
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#7B8CFA]/30 shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#222222]">รายการรอบันทึก ({queue.length})</p>
                <p className="text-sm font-semibold text-[#7B8CFA]">
                  รวม {formatMoney(queue.reduce((s, q) => s + q.totalAmount, 0))}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {queue.map(item => (
                  <div key={item.id} className="bg-[#F8FAFC] rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#222222] text-sm">{item.employeeName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.jobName} · {item.quantity} {item.unit}
                        {item.hasLength && item.unitLength > 0 ? ` · ${item.unitLength} ศอก` : ''}
                        {item.note ? ` · ${item.note}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="font-bold text-[#10B981] text-sm">{formatMoney(item.totalAmount)}</p>
                      <button onClick={() => setQueue(q => q.filter(x => x.id !== item.id))}
                        className="text-slate-300 hover:text-red-400 cursor-pointer"><IconTrash /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={handleSaveAll} disabled={saving}
                  className="bg-[#7B8CFA] disabled:opacity-40 text-white font-bold px-6 py-3 rounded-2xl cursor-pointer active:scale-95 transition-transform">
                  {saving ? 'กำลังบันทึก...' : `บันทึก ${queue.length + ((fEmpId && fJobId && fQty) ? 1 : 0)} รายการ`}
                </button>
              </div>
            </div>
          )}

          {/* Saved logs for date */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <p className="font-bold text-[#222222]">รายการที่บันทึกแล้ว</p>
            {loading ? (
              <p className="text-center text-slate-400 text-sm py-6">กำลังโหลด...</p>
            ) : logs.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">ไม่มีรายการวันนี้</p>
            ) : (
              <div className="flex flex-col gap-2">
                {logs.map(log => (
                  <div key={log.id} className="border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#222222] text-sm truncate">{log.employeeName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {log.jobName} · {log.quantity} {log.unit}
                        {log.unitLength > 0 ? ` · ${log.unitLength} ศอก` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="font-bold text-[#10B981]">{formatMoney(log.totalAmount)}</p>
                      <button onClick={() => handleDeleteLog(log.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors cursor-pointer">
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <p className="font-bold text-[#7B8CFA]">
                    รวม {formatMoney(logs.reduce((s, l) => s + l.totalAmount, 0))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: จัดการรายการ ── */}
      {tab === 'jobs' && (
        <div className="flex flex-col gap-4">
          {/* Categories section */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#222222]">ประเภทงาน (หมวดหมู่)</p>
              <button onClick={() => openCatForm()}
                className="bg-[#10B981] text-white text-sm font-bold px-4 py-2 rounded-2xl cursor-pointer active:scale-95 transition-transform">
                + เพิ่มประเภท
              </button>
            </div>
            {categories.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">ยังไม่มีประเภทงาน — เพิ่มก่อนเพื่อจัดกลุ่มรายการ</p>
            ) : (
              <div className="flex flex-col gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#222222] text-sm">{cat.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {cat.hasLength
                          ? `มีสูตรศอก: +฿${cat.extraPerUnit}/ศอก${cat.baseLength > 0 ? ` (เกิน ${cat.baseLength})` : ''}`
                          : 'ไม่มีสูตรพิเศษ'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openCatForm(cat)} className="text-slate-400 hover:text-[#7B8CFA] cursor-pointer p-1.5"><IconEdit /></button>
                      <button onClick={() => handleDeleteCat(cat.id)} className="text-slate-300 hover:text-red-400 cursor-pointer p-1.5"><IconTrash /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Jobs section */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#222222]">รายการงาน</p>
              <button onClick={() => openJobForm()}
                className="bg-[#7B8CFA] text-white text-sm font-bold px-4 py-2 rounded-2xl cursor-pointer active:scale-95 transition-transform">
                + เพิ่มรายการ
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
                <input value={jobSearch} onChange={e => setJobSearch(e.target.value)}
                  placeholder="ค้นหารายการ..."
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl pl-9 pr-3 py-2 text-sm outline-none focus:border-[#7B8CFA]" />
              </div>
              <select value={jobCatFilter} onChange={e => setJobCatFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3 py-2 text-sm outline-none focus:border-[#7B8CFA]">
                <option value="">ทุกประเภท</option>
                {categories.map(cat => <option key={cat.id} value={String(cat.id)}>{cat.name}</option>)}
              </select>
            </div>
            {jobs.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">ยังไม่มีรายการงาน</p>
            ) : (
              <div className="flex flex-col gap-3">
                {jobsByCategory.map(cat => cat.jobs.length > 0 && (
                  <div key={cat.id}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">{cat.name}</p>
                    <div className="flex flex-col gap-1.5">
                      {cat.jobs.map(job => (
                        <div key={job.id} className="border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#222222] text-sm">{job.jobName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">฿{job.basePrice}/{job.unit}</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openJobForm(job)} className="text-slate-400 hover:text-[#7B8CFA] cursor-pointer p-1.5"><IconEdit /></button>
                            <button onClick={() => handleDeleteJob(job.id)} className="text-slate-300 hover:text-red-400 cursor-pointer p-1.5"><IconTrash /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {uncategorized.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">ไม่มีหมวด</p>
                    <div className="flex flex-col gap-1.5">
                      {uncategorized.map(job => (
                        <div key={job.id} className="border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#222222] text-sm">{job.jobName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">฿{job.basePrice}/{job.unit}</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openJobForm(job)} className="text-slate-400 hover:text-[#7B8CFA] cursor-pointer p-1.5"><IconEdit /></button>
                            <button onClick={() => handleDeleteJob(job.id)} className="text-slate-300 hover:text-red-400 cursor-pointer p-1.5"><IconTrash /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Category Form Modal ── */}
      {showCatForm && (
        <Modal onClose={() => setShowCatForm(false)}>
          <h2 className="text-xl font-bold text-[#222222]">{editCat ? 'แก้ไขประเภทงาน' : 'เพิ่มประเภทงาน'}</h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">ชื่อประเภท *</label>
              <input value={cName} onChange={e => setCName(e.target.value)}
                placeholder="เช่น ท่อ, เรือ, ชิ้นส่วน" className={inputCls} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-6 rounded-full transition-colors ${cHasLen ? 'bg-[#7B8CFA]' : 'bg-slate-200'} relative flex-shrink-0`}
                onClick={() => setCHasLen(!cHasLen)}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${cHasLen ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-semibold text-slate-600">ใช้สูตรคิดราคาตามความยาว (ศอก)</span>
            </label>
            {cHasLen && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-500">บวก/ลบต่อศอก (฿)</label>
                  <input type="number" value={cExtra} onChange={e => setCExtra(e.target.value)}
                    placeholder="25" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-500">ความยาวมาตรฐาน (ศอก)</label>
                  <input type="number" min="0" value={cBase} onChange={e => setCBase(e.target.value)}
                    placeholder="0" className={inputCls} />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowCatForm(false)}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl cursor-pointer">ยกเลิก</button>
            <button onClick={handleSaveCat} disabled={!cName || cSaving}
              className="flex-1 bg-[#7B8CFA] disabled:opacity-40 text-white font-bold py-3 rounded-2xl cursor-pointer">
              {cSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Job Form Modal ── */}
      {showJobForm && (
        <Modal onClose={() => setShowJobForm(false)}>
          <h2 className="text-xl font-bold text-[#222222]">{editJob ? 'แก้ไขรายการงาน' : 'เพิ่มรายการงาน'}</h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">ประเภทงาน</label>
              <select value={jCatId} onChange={e => setJCatId(e.target.value)} className={inputCls}>
                <option value="">-- ไม่มีหมวด --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">ชื่อรายการ *</label>
              <input value={jName} onChange={e => setJName(e.target.value)}
                placeholder="เช่น ท่อหน้า 8" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-500">หน่วย *</label>
                <input value={jUnit} onChange={e => setJUnit(e.target.value)}
                  placeholder="เช่น ลูก, ศอก" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-500">ราคา (฿/หน่วย) *</label>
                <input type="number" min="0" value={jPrice} onChange={e => setJPrice(e.target.value)}
                  placeholder="0" className={inputCls} />
              </div>
            </div>
            {jCatId && categories.find(c => c.id === Number(jCatId))?.hasLength && (
              <div className="bg-[#7B8CFA]/8 border border-[#7B8CFA]/20 rounded-2xl px-4 py-2.5 text-sm text-[#7B8CFA] flex items-start gap-2">
                <IconCheck />
                <span>รายการนี้จะใช้สูตร +{categories.find(c => c.id === Number(jCatId))?.extraPerUnit} บาท/ศอก จากประเภท "{categories.find(c => c.id === Number(jCatId))?.name}" อัตโนมัติ</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowJobForm(false)}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl cursor-pointer">ยกเลิก</button>
            <button onClick={handleSaveJob} disabled={!jName || !jUnit || !jPrice || jSaving}
              className="flex-1 bg-[#7B8CFA] disabled:opacity-40 text-white font-bold py-3 rounded-2xl cursor-pointer">
              {jSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
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
    </div>
  );
}
