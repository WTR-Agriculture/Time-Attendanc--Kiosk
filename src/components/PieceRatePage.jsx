import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as api from '../lib/api';

const today = () => new Date().toLocaleDateString('en-CA');
const formatMoney = (n) =>
  '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inputCls = 'bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA] w-full';

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
  const [logDate, setLogDate]       = useState(today());
  const [loading, setLoading]       = useState(false);

  // entry form
  const [fEmpId, setFEmpId] = useState('');
  const [fJobId, setFJobId] = useState('');
  const [fDate,  setFDate]  = useState(today());
  const [fQty,   setFQty]   = useState('');
  const [fLen,   setFLen]   = useState('');
  const [fNote,  setFNote]  = useState('');
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
  const [jName,  setJName]  = useState('');
  const [jUnit,  setJUnit]  = useState('');
  const [jPrice, setJPrice] = useState('');
  const [jCatId, setJCatId] = useState('');
  const [jSaving, setJSaving] = useState(false);

  useEffect(() => { loadCategories(); loadJobs(); }, []);
  useEffect(() => { if (tab === 'log') loadLogs(logDate); }, [tab, logDate]);

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
  const calcUnitPrice = () => {
    if (!selectedJob) return 0;
    const len   = parseFloat(fLen) || 0;
    const extra = selectedJob.hasLength
      ? Math.max(0, len - selectedJob.baseLength) * selectedJob.extraPerUnit
      : 0;
    return selectedJob.basePrice + extra;
  };
  const unitPrice   = calcUnitPrice();
  const totalAmount = unitPrice * (parseFloat(fQty) || 0);

  const handleSaveLog = async () => {
    if (!fEmpId || !fJobId || !fQty || !fDate) return;
    setSaving(true);
    try {
      const emp = employees.find(e => e.employeeId === fEmpId);
      await api.createPieceRateLog({
        employeeId: fEmpId, employeeName: emp?.name || fEmpId,
        jobId: Number(fJobId), logDate: fDate,
        quantity: parseFloat(fQty),
        unitLength: selectedJob?.hasLength ? (parseFloat(fLen) || 0) : 0,
        unitPrice, totalAmount, note: fNote,
      });
      setSaveOk(true);
      setFQty(''); setFLen(''); setFNote('');
      setTimeout(() => setSaveOk(false), 2000);
      if (fDate === logDate) loadLogs(logDate);
    } catch {}
    setSaving(false);
  };

  const handleDeleteLog = async (id) => {
    if (!confirm('ลบรายการนี้?')) return;
    await api.deletePieceRateLog(id);
    loadLogs(logDate);
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
  const handleDeleteCat = async (id) => {
    if (!confirm('ลบหมวดหมู่นี้?')) return;
    await api.deletePieceRateCategory(id);
    loadCategories();
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
  const handleDeleteJob = async (id) => {
    if (!confirm('ลบรายการงานนี้?')) return;
    await api.deletePieceRateJob(id);
    loadJobs();
  };

  // group jobs by category for display
  const jobsByCategory = categories.map(cat => ({
    ...cat,
    jobs: jobs.filter(j => j.categoryId === cat.id),
  }));
  const uncategorized = jobs.filter(j => !j.categoryId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-[#222222]">งานเหมา</h2>
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

      {/* ── Tab: บันทึกงาน ── */}
      {tab === 'log' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <p className="font-bold text-[#222222]">กรอกรายการงานเหมา</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-500">พนักงาน *</label>
                <select value={fEmpId} onChange={e => setFEmpId(e.target.value)} className={inputCls}>
                  <option value="">-- เลือกพนักงาน --</option>
                  {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-500">วันที่ *</label>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className={inputCls} />
              </div>
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

            <div className={`grid gap-4 ${selectedJob?.hasLength ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
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
              <div className="bg-[#7B8CFA]/8 border border-[#7B8CFA]/20 rounded-2xl px-4 py-3 flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  {fQty} {selectedJob.unit} × {formatMoney(unitPrice)}
                  {selectedJob.hasLength && fLen ? ` (ฐาน ${formatMoney(selectedJob.basePrice)} + ${fLen}ศอก × ${selectedJob.extraPerUnit})` : ''}
                </p>
                <p className="text-lg font-bold text-[#7B8CFA]">{formatMoney(totalAmount)}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={handleSaveLog}
                disabled={!fEmpId || !fJobId || !fQty || !fDate || saving}
                className="bg-[#7B8CFA] disabled:opacity-40 text-white font-bold px-6 py-3 rounded-2xl cursor-pointer active:scale-95 transition-transform">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              {saveOk && <p className="text-emerald-600 font-medium text-sm">✓ บันทึกแล้ว</p>}
            </div>
          </div>

          {/* Log list */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="font-bold text-[#222222]">รายการวันที่</p>
              <input type="date" value={logDate}
                onChange={e => { setLogDate(e.target.value); loadLogs(e.target.value); }}
                className="bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3 py-2 text-sm outline-none focus:border-[#7B8CFA]" />
            </div>
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
                  <label className="text-sm font-semibold text-slate-500">บวกเพิ่มต่อศอก (฿)</label>
                  <input type="number" min="0" value={cExtra} onChange={e => setCExtra(e.target.value)}
                    placeholder="25" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-500">เริ่มบวกเมื่อเกิน (ศอก)</label>
                  <input type="number" min="0" value={cBase} onChange={e => setCBase(e.target.value)}
                    placeholder="0 = บวกทุกศอก" className={inputCls} />
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
              <div className="bg-[#7B8CFA]/8 border border-[#7B8CFA]/20 rounded-2xl px-4 py-2.5 text-sm text-[#7B8CFA]">
                ✓ รายการนี้จะใช้สูตร +{categories.find(c => c.id === Number(jCatId))?.extraPerUnit} บาท/ศอก จากประเภท "{categories.find(c => c.id === Number(jCatId))?.name}" อัตโนมัติ
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
    </div>
  );
}
