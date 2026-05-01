import { useState } from 'react';
import * as api from '../lib/api';

const DEPARTMENTS = ['Office', 'Production'];

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
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

  const [deleteEmp, setDeleteEmp] = useState(null);
  const [deleting, setDeleting]   = useState(false);

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

  const handleDelete = async () => {
    setDeleting(true);
    try { await api.deleteEmployee(deleteEmp.employeeId); setDeleteEmp(null); onRefresh(); }
    catch {} finally { setDeleting(false); }
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
  //  Reusable Modal wrapper
  // ============================================================
  const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4"
      onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  // ============================================================
  //  Form fields reused in Add/Edit
  // ============================================================
  const FieldRow = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
  const inputCls = "w-full border border-slate-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-[#7B8CFA] bg-white";
  const readonlyCls = "w-full border border-slate-200 rounded-2xl px-4 py-3 text-base bg-[#F8FAFC] text-slate-400 cursor-default";

  // ============================================================
  //  Render
  // ============================================================
  return (
    <div className="flex flex-col gap-4 animate-fade-in">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#222222]">พนักงาน</h2>
          <p className="text-slate-400 text-sm mt-0.5">ทั้งหมด {employees.length} คน</p>
        </div>
        <button onClick={openAdd}
          className="bg-[#7B8CFA] text-white px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มพนักงาน
        </button>
      </div>

      {/* Employee cards */}
      {employees.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center text-slate-400">
          ยังไม่มีพนักงาน
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {employees.map((emp, i) => (
            <div key={emp.employeeId}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
              {/* Avatar */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                {getInitials(emp.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#222222] truncate">{emp.name}</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  {emp.department || 'ไม่ระบุแผนก'} · {emp.rate.toLocaleString()} {emp.rateType === 'daily' ? 'บ./วัน' : 'บ./ชม.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
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
                <button onClick={() => setDeleteEmp(emp)} title="ลบ"
                  className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* ===================== Delete Confirm ===================== */}
      {deleteEmp && (
        <Modal onClose={() => setDeleteEmp(null)}>
          <div className="text-center flex flex-col gap-3">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <IconTrash />
            </div>
            <h2 className="text-xl font-bold text-[#222222]">ลบพนักงาน?</h2>
            <p className="text-slate-500">{deleteEmp.name} ({deleteEmp.employeeId})<br />ข้อมูลยังคงอยู่ใน DB</p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeleteEmp(null)} className="flex-1 bg-[#F2F2F2] text-slate-600 py-3 rounded-2xl font-medium cursor-pointer">ยกเลิก</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-bold cursor-pointer disabled:opacity-50">
                {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================== Attendance History ===================== */}
      {logsEmp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setLogsEmp(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-4"
            style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#222222]">ประวัติการมาทำงาน</h2>
                <p className="text-slate-400 text-sm">{logsEmp.name}</p>
              </div>
              <button onClick={() => setLogsEmp(null)} className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer text-slate-500 text-sm">✕</button>
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
        </div>
      )}

      {/* ===================== Payroll History ===================== */}
      {payEmp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setPayEmp(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl p-6 flex flex-col gap-4"
            style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#222222]">ประวัติค่าแรง</h2>
                <p className="text-slate-400 text-sm">{payEmp.name}</p>
              </div>
              <button onClick={() => setPayEmp(null)} className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer text-slate-500 text-sm">✕</button>
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
        </div>
      )}
    </div>
  );
}
