import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as api from '../lib/api';

const today = () => new Date().toLocaleDateString('en-CA');
const formatMoney = (n) =>
  '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inputCls = 'bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA] w-full';

const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Modal = ({ children, onClose }) => createPortal(
  <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4"
    onClick={onClose}>
    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>,
  document.body
);

export default function AdvancesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Add advance modal
  const [showAdd, setShowAdd]   = useState(false);
  const [addEmp, setAddEmp]     = useState(null);
  const [addDate, setAddDate]   = useState(today());
  const [addAmt, setAddAmt]     = useState('');
  const [addNote, setAddNote]   = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // History modal
  const [histEmp, setHistEmp]       = useState(null);
  const [history, setHistory]       = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try { const d = await api.getAdvances(); setEmployees(d.employees); } catch {}
    setLoading(false);
  };

  const openAdd = (emp) => {
    setAddEmp(emp);
    setAddDate(today());
    setAddAmt('');
    setAddNote('');
    setShowAdd(true);
  };

  const handleSaveAdvance = async () => {
    if (!addEmp || !addAmt || !addDate) return;
    setAddSaving(true);
    try {
      await api.createAdvance({
        employeeId: addEmp.employeeId,
        employeeName: addEmp.name,
        tranDate: addDate,
        amount: parseFloat(addAmt),
        note: addNote,
      });
      setShowAdd(false);
      loadData();
    } catch {}
    setAddSaving(false);
  };

  const openHistory = async (emp) => {
    setHistEmp(emp);
    setHistLoading(true);
    try { const d = await api.getAdvanceHistory(emp.employeeId); setHistory(d.history); } catch {}
    setHistLoading(false);
  };

  const empWithBalance = employees.filter(e => e.balance > 0);
  const empAll = search.trim()
    ? employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.employeeId.includes(search))
    : employees;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-[#222222]">เบิกค่าแรงล่วงหน้า</h2>
      </div>

      {/* Summary cards */}
      {empWithBalance.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-amber-800 text-sm">มียอดค้างชำระ {empWithBalance.length} คน</p>
            <p className="text-amber-600 text-xs mt-0.5">
              รวม {formatMoney(empWithBalance.reduce((s, e) => s + e.balance, 0))}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อพนักงาน..."
          className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-base outline-none focus:border-[#7B8CFA] transition-colors" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1">
            <IconX />
          </button>
        )}
      </div>

      {/* Employee list */}
      {loading ? (
        <p className="text-center text-slate-400 text-sm py-10">กำลังโหลด...</p>
      ) : empAll.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-10">ไม่พบพนักงานที่ตรงกับ "{search}"</p>
      ) : (
        <div className="flex flex-col gap-3">
          {empAll.map(emp => (
            <div key={emp.employeeId}
              className={`bg-white rounded-3xl border shadow-sm px-5 py-4 flex items-center gap-4
                ${emp.balance > 0 ? 'border-amber-200' : 'border-slate-100'}`}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#222222]">{emp.name}</p>
                {emp.balance > 0 ? (
                  <p className="text-sm text-amber-600 mt-0.5 font-semibold">
                    ค้างอยู่ {formatMoney(emp.balance)}
                    <span className="text-slate-400 font-normal ml-2">
                      (เบิก {formatMoney(emp.totalAdvanced)} / หัก {formatMoney(emp.totalDeducted)})
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 mt-0.5">ไม่มียอดค้าง</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openHistory(emp)}
                  className="text-slate-400 hover:text-[#7B8CFA] p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-xs font-medium">
                  ประวัติ
                </button>
                <button onClick={() => openAdd(emp)}
                  className="bg-[#7B8CFA] text-white text-xs font-bold px-3 py-2 rounded-2xl cursor-pointer active:scale-95 transition-transform">
                  + เบิก
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Advance Modal ── */}
      {showAdd && addEmp && (
        <Modal onClose={() => setShowAdd(false)}>
          <h2 className="text-xl font-bold text-[#222222]">บันทึกการเบิก</h2>
          <p className="text-slate-400 text-sm -mt-2">{addEmp.name}</p>
          {addEmp.balance > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-sm text-amber-700">
              ยอดค้างเดิม {formatMoney(addEmp.balance)}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">วันที่เบิก *</label>
              <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">จำนวนเงิน (บาท) *</label>
              <input type="number" min="0" value={addAmt} onChange={e => setAddAmt(e.target.value)}
                placeholder="0" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">หมายเหตุ</label>
              <input type="text" value={addNote} onChange={e => setAddNote(e.target.value)}
                placeholder="ไม่บังคับ" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowAdd(false)}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl cursor-pointer">ยกเลิก</button>
            <button onClick={handleSaveAdvance} disabled={!addAmt || !addDate || addSaving}
              className="flex-1 bg-[#7B8CFA] disabled:opacity-40 text-white font-bold py-3 rounded-2xl cursor-pointer">
              {addSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── History Modal ── */}
      {histEmp && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setHistEmp(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-4"
            style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#222222]">ประวัติการเบิก</h2>
                <p className="text-slate-400 text-sm">{histEmp.name}</p>
              </div>
              <button onClick={() => setHistEmp(null)}
                className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer text-slate-500 hover:bg-slate-200 transition-colors"><IconX /></button>
            </div>
            {histLoading ? (
              <p className="text-center text-slate-400 text-sm py-8">กำลังโหลด...</p>
            ) : history.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">ยังไม่มีประวัติ</p>
            ) : (
              <div className="overflow-y-auto flex flex-col gap-2">
                {history.map(h => (
                  <div key={h.id} className="border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{h.tranDate}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{h.note || (h.type === 'หัก' ? 'หักจากค่าแรง' : 'เบิกล่วงหน้า')}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${h.type === 'เบิก' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {h.type === 'เบิก' ? '+' : '-'}{formatMoney(h.amount)}
                      </p>
                      <p className={`text-xs font-semibold mt-0.5 ${h.type === 'เบิก' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {h.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
