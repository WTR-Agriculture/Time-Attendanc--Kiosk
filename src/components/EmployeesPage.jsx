import { useState } from 'react';
import { createPortal } from 'react-dom';
import * as api from '../lib/api';

const DEPARTMENTS = ['Office', 'Production'];

const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const Toggle = ({ checked, onChange, loading }) => (
  <button onClick={onChange} disabled={loading}
    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-emerald-400' : 'bg-slate-200'} ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
);
const IconClock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconReceipt = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

function formatMoney(n) {
  return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getInitials(name = '') {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return name.slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-[#7B8CFA] text-white', 'bg-[#10B981] text-white', 'bg-[#F59E0B] text-white',
  'bg-[#6366F1] text-white', 'bg-[#EC4899] text-white', 'bg-[#14B8A6] text-white',
];

// ── defined outside to avoid remount on every keystroke ──
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

const inputCls = "w-full border border-slate-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA] bg-white";
const readonlyCls = "w-full border border-slate-200 rounded-2xl px-4 py-3 text-base bg-[#F8FAFC] text-slate-400 cursor-default";

const FieldRow = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-slate-500">{label}</label>
    {children}
  </div>
);

export default function EmployeesPage({ employees, onBack, onRefresh }) {
  const [showAdd, setShowAdd]         = useState(false);
  const [newId, setNewId]             = useState('');
  const [newName, setNewName]         = useState('');
  const [newDept, setNewDept]         = useState('');
  const [newRate, setNewRate]         = useState('');
  const [newRateType, setNewRateType] = useState('daily');
  const [addSaving, setAddSaving]     = useState(false);
  const [addError, setAddError]       = useState(null);

  const [editEmp, setEditEmp]           = useState(null);
  const [editName, setEditName]         = useState('');
  const [editDept, setEditDept]         = useState('');
  const [editRate, setEditRate]         = useState('');
  const [editRateType, setEditRateType] = useState('daily');
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState(null);

  const [togglingId, setTogglingId] = useState(null);
  const [search, setSearch] = useState('');

  const [logsEmp, setLogsEmp]         = useState(null);
  const [logsData, setLogsData]       = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [payEmp, setPayEmp]         = useState(null);
  const [payData, setPayData]       = useState([]);
  const [payLoading, setPayLoading] = useState(false);

  // ============================================================
  const openAdd = async () => {
    setNewName(''); setNewDept(''); setNewRate(''); setNewRateType('daily'); setAddError(null);
    setNewId('กำลังโหลด...');
    setShowAdd(true);
    try { const r = await api.getNextEmployeeId(); setNewId(r.nextId); } catch { setNewId(''); }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newRate) return;
    setAddSaving(true); setAddError(null);
    try {
      await api.createEmployee({ employeeId: newId, name: newName.trim(), department: newDept, rate: parseFloat(newRate), rateType: newRateType });
      setShowAdd(false); onRefresh();
    } catch (err) { setAddError(err.message || 'เพิ่มพนักงานไม่สำเร็จ'); }
    finally { setAddSaving(false); }
  };

  const openEdit = (emp) => {
    setEditEmp(emp); setEditName(emp.name); setEditDept(emp.department || '');
    setEditRate(String(emp.rate)); setEditRateType(emp.rateType || 'daily'); setEditError(null);
  };

  const handleEdit = async () => {
    if (!editName.trim() || !editRate) return;
    setEditSaving(true); setEditError(null);
    try {
      await api.updateEmployee(editEmp.employeeId, { name: editName.trim(), department: editDept, rate: parseFloat(editRate), rateType: editRateType });
      setEditEmp(null); onRefresh();
    } catch (err) { setEditError(err.message || 'แก้ไขไม่สำเร็จ'); }
    finally { setEditSaving(false); }
  };

  const handleToggleActive = async (emp) => {
    setTogglingId(emp.employeeId);
    try { await api.setEmployeeActive(emp.employeeId, !emp.isActive); onRefresh(); }
    catch {} finally { setTogglingId(null); }
  };

  const openLogs = async (emp) => {
    setLogsEmp(emp); setLogsData([]); setLogsLoading(true);
    try { const r = await api.getEmployeeLogs(emp.employeeId); setLogsData(r.logs || []); }
    catch {} finally { setLogsLoading(false); }
  };

  const openPayHistory = async (emp) => {
    setPayEmp(emp); setPayData([]); setPayLoading(true);
    try { const r = await api.getEmployeePayroll(emp.employeeId); setPayData(r.history || []); }
    catch {} finally { setPayLoading(false); }
  };

  // ============================================================
  //  Render
  // ============================================================
  return (
    <div className="flex flex-col gap-4 animate-fade-in">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#222222]">พนักงาน</h2>
          <p className="text-slate-400 text-sm mt-0.5">ใช้งาน {employees.filter(e => e.isActive !== false).length} / {employees.length} คน</p>
        </div>
        <button onClick={openAdd}
          className="bg-[#7B8CFA] text-white px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มพนักงาน
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อพนักงาน..."
          className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-base outline-none focus:border-[#7B8CFA] transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1">
            <IconX />
          </button>
        )}
      </div>

      {/* Employee cards */}
      {(() => {
        const filtered = search.trim()
          ? employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.employeeId.includes(search))
          : employees;
        if (employees.length === 0) return (
          <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center text-slate-400">
            ยังไม่มีพนักงาน
          </div>
        );
        if (filtered.length === 0) return (
          <div className="bg-white rounded-3xl border border-slate-100 py-12 text-center text-slate-400 text-sm">
            ไม่พบพนักงานที่ตรงกับ "{search}"
          </div>
        );
        return (
        <div className="flex flex-col gap-3">
          {filtered.map((emp, i) => {
            const isActive = emp.isActive !== false;
            return (
              <div key={emp.employeeId}
                className={`rounded-3xl border shadow-sm px-5 py-4 flex items-center gap-4 transition-opacity ${isActive ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base flex-shrink-0 ${isActive ? AVATAR_COLORS[i % AVATAR_COLORS.length] : 'bg-slate-200 text-slate-400'}`}>
                  {getInitials(emp.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#222222] truncate">{emp.name}</p>
                    {!isActive && <span className="text-xs font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full flex-shrink-0">ไม่ใช้งาน</span>}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {emp.department || 'ไม่ระบุแผนก'} · {emp.rate.toLocaleString()} {emp.rateType === 'daily' ? 'บ./วัน' : 'บ./ชม.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isActive && <>
                    <button onClick={() => openLogs(emp)} title="ประวัติการมาทำงาน"
                      className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
                      <IconClock />
                    </button>
                    <button onClick={() => openPayHistory(emp)} title="ประวัติค่าแรง"
                      className="w-9 h-9 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
                      <IconReceipt />
                    </button>
                    <button onClick={() => openEdit(emp)} title="แก้ไข"
                      className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
                      <IconEdit />
                    </button>
                  </>}
                  <Toggle
                    checked={isActive}
                    loading={togglingId === emp.employeeId}
                    onChange={() => handleToggleActive(emp)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        );
      })()}

      {/* ===================== Add Modal ===================== */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)}>
          <h2 className="text-xl font-bold text-[#222222]">เพิ่มพนักงานใหม่</h2>
          <FieldRow label="รหัสพนักงาน">
            <input value={newId} readOnly className={readonlyCls} />
          </FieldRow>
          <FieldRow label="ชื่อ-นามสกุล *">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี" className={inputCls} />
          </FieldRow>
          <FieldRow label="แผนก">
            <select value={newDept} onChange={e => setNewDept(e.target.value)} className={inputCls}>
              <option value="">-- เลือกแผนก --</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="ค่าแรง *">
              <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)}
                placeholder="0" className={inputCls} />
            </FieldRow>
            <FieldRow label="ประเภท">
              <select value={newRateType} onChange={e => setNewRateType(e.target.value)} className={inputCls}>
                <option value="daily">รายวัน</option>
                <option value="hourly">รายชั่วโมง</option>
              </select>
            </FieldRow>
          </div>
          {addError && <p className="text-red-500 text-sm">{addError}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowAdd(false)} className="flex-1 bg-[#F2F2F2] text-slate-600 py-3 rounded-2xl font-medium cursor-pointer">ยกเลิก</button>
            <button onClick={handleAdd} disabled={addSaving || !newName.trim() || !newRate}
              className="flex-1 bg-[#7B8CFA] text-white py-3 rounded-2xl font-bold cursor-pointer disabled:opacity-50">
              {addSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </Modal>
      )}

      {/* ===================== Edit Modal ===================== */}
      {editEmp && (
        <Modal onClose={() => setEditEmp(null)}>
          <h2 className="text-xl font-bold text-[#222222]">แก้ไขข้อมูลพนักงาน</h2>
          <FieldRow label="รหัสพนักงาน">
            <input value={editEmp.employeeId} readOnly className={readonlyCls} />
          </FieldRow>
          <FieldRow label="ชื่อ-นามสกุล *">
            <input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
          </FieldRow>
          <FieldRow label="แผนก">
            <select value={editDept} onChange={e => setEditDept(e.target.value)} className={inputCls}>
              <option value="">-- เลือกแผนก --</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="ค่าแรง *">
              <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} className={inputCls} />
            </FieldRow>
            <FieldRow label="ประเภท">
              <select value={editRateType} onChange={e => setEditRateType(e.target.value)} className={inputCls}>
                <option value="daily">รายวัน</option>
                <option value="hourly">รายชั่วโมง</option>
              </select>
            </FieldRow>
          </div>
          {editError && <p className="text-red-500 text-sm">{editError}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setEditEmp(null)} className="flex-1 bg-[#F2F2F2] text-slate-600 py-3 rounded-2xl font-medium cursor-pointer">ยกเลิก</button>
            <button onClick={handleEdit} disabled={editSaving || !editName.trim() || !editRate}
              className="flex-1 bg-[#7B8CFA] text-white py-3 rounded-2xl font-bold cursor-pointer disabled:opacity-50">
              {editSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </Modal>
      )}


      {/* ===================== Attendance History ===================== */}
      {logsEmp && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setLogsEmp(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-4"
            style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#222222]">ประวัติการมาทำงาน</h2>
                <p className="text-slate-400 text-sm">{logsEmp.name}</p>
              </div>
              <button onClick={() => setLogsEmp(null)} className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer text-slate-500 hover:bg-slate-200 transition-colors"><IconX /></button>
            </div>
            {logsLoading ? (
              <div className="flex justify-center py-8 text-slate-400 text-sm">กำลังโหลด...</div>
            ) : logsData.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">ยังไม่มีประวัติ</div>
            ) : (
              <div className="overflow-y-auto flex flex-col gap-2">
                {logsData.map((log, i) => (
                  <div key={i} className="border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-700 text-sm">{log.date}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        เข้า {log.in || '–'} · ออก {log.out || '–'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {log.workedHours
                        ? <p className="font-bold text-[#7B8CFA] text-sm">{log.workedHours} ชม.</p>
                        : <p className="text-slate-300 text-sm">–</p>
                      }
                      {log.lateMins > 0 &&
                        <p className="text-red-400 text-xs">มาสาย {log.lateMins} นาที</p>
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ===================== Payroll History ===================== */}
      {payEmp && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setPayEmp(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-4"
            style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#222222]">ประวัติค่าแรง</h2>
                <p className="text-slate-400 text-sm">{payEmp.name}</p>
              </div>
              <button onClick={() => setPayEmp(null)} className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer text-slate-500 hover:bg-slate-200 transition-colors"><IconX /></button>
            </div>
            {payLoading ? (
              <div className="flex justify-center py-8 text-slate-400 text-sm">กำลังโหลด...</div>
            ) : payData.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">ยังไม่มีประวัติ</div>
            ) : (
              <div className="overflow-y-auto flex flex-col gap-2">
                {payData.map((p, i) => (
                  <div key={i} className="border border-slate-100 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700 text-sm">{p.startDate} — {p.endDate}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.status === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        {p.status === 'Paid' ? 'จ่ายแล้ว' : 'รอจ่าย'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                      <span>ทำงาน {p.workDays} วัน</span>
                      <span>ค่าแรง {formatMoney(p.baseAmount)}</span>
                      {p.lateDeduction > 0 && <span className="text-red-400">หัก {formatMoney(p.lateDeduction)}</span>}
                      {p.otHours > 0 && <span className="text-emerald-500">OT +{p.otHours}ชม.</span>}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-300">{p.paidAt ? `จ่ายเมื่อ ${p.paidAt.slice(0, 10)}` : ''}</span>
                      <span className="font-bold text-[#7B8CFA]">{formatMoney(p.netTotal)}</span>
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
