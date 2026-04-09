// ============================================================
//  EmployeesPage — จัดการพนักงาน (CRUD + Enroll + History)
// ============================================================
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

export default function EmployeesPage({ employees, onBack, onEnroll, onRefresh }) {
  // --- Add ---
  const [showAdd, setShowAdd]         = useState(false);
  const [newId, setNewId]             = useState('');
  const [newName, setNewName]         = useState('');
  const [newDept, setNewDept]         = useState('');
  const [newRate, setNewRate]         = useState('');
  const [newRateType, setNewRateType] = useState('daily');
  const [addSaving, setAddSaving]     = useState(false);
  const [addError, setAddError]       = useState(null);

  // --- Edit ---
  const [editEmp, setEditEmp]             = useState(null);
  const [editName, setEditName]           = useState('');
  const [editDept, setEditDept]           = useState('');
  const [editRate, setEditRate]           = useState('');
  const [editRateType, setEditRateType]   = useState('daily');
  const [editSaving, setEditSaving]       = useState(false);
  const [editError, setEditError]         = useState(null);

  // --- Delete ---
  const [deleteEmp, setDeleteEmp] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  // --- Attendance history ---
  const [logsEmp, setLogsEmp]     = useState(null);
  const [logsData, setLogsData]   = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // --- Payroll history ---
  const [payEmp, setPayEmp]       = useState(null);
  const [payData, setPayData]     = useState([]);
  const [payLoading, setPayLoading] = useState(false);

  // ============================================================
  //  Handlers
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
  //  Render
  // ============================================================
  return (
    <div className="flex flex-col w-full self-stretch px-6 pt-4 pb-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm mb-4 w-full border border-slate-100">
        <div className="flex justify-between items-center px-5 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-[#222222]">พนักงาน</h1>
            <span className="bg-slate-100 text-slate-500 text-sm px-3 py-1 rounded-full">{employees.length} คน</span>
          </div>
          <button onClick={openAdd}
            className="bg-[#7B8CFA] text-white px-4 py-2 rounded-full text-base font-medium flex items-center gap-1.5 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มพนักงาน
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex-1">
        {employees.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400">ยังไม่มีพนักงาน</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">รหัส</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">ชื่อ-นามสกุล</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">แผนก</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500">ค่าแรง</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500">ใบหน้า</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500">ประวัติมาทำงาน</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500">ประวัติค่าแรง</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={emp.employeeId} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-[#FAFAFA]'}`}>
                    <td className="px-4 py-3 text-slate-500 font-mono">{emp.employeeId}</td>
                    <td className="px-4 py-3 font-medium text-[#222222]">{emp.name}</td>
                    <td className="px-4 py-3 text-slate-500">{emp.department || '-'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {emp.rate.toLocaleString()} {emp.rateType === 'daily' ? 'บ./วัน' : 'บ./ชม.'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.faceDescriptorJson
                        ? <span className="text-green-500 font-bold">✓</span>
                        : <span className="text-slate-300">–</span>}
                    </td>
                    {/* ประวัติมาทำงาน */}
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openLogs(emp)}
                        title="ประวัติการมาทำงาน"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors cursor-pointer">
                        <IconClock />
                      </button>
                    </td>
                    {/* ประวัติค่าแรง */}
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openPayHistory(emp)}
                        title="ประวัติค่าแรง"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-50 text-violet-500 hover:bg-violet-100 transition-colors cursor-pointer">
                        <IconReceipt />
                      </button>
                    </td>
                    {/* จัดการ */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => onEnroll(emp)} title="ลงทะเบียนใบหน้า"
                          className="bg-[#C6F45D] text-[#222222] text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap">
                          ลงทะเบียน
                        </button>
                        <button onClick={() => openEdit(emp)} title="แก้ไข"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer">
                          <IconEdit />
                        </button>
                        <button onClick={() => setDeleteEmp(emp)} title="ลบ"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer">
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* Add Modal */}
      {/* ============================================================ */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-[#222222]">เพิ่มพนักงานใหม่</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1 block">รหัสพนักงาน</label>
                <input value={newId} readOnly className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base bg-[#F8FAFC] text-slate-500 cursor-default" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1 block">ชื่อ-นามสกุล *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="เช่น สมชาย ใจดี"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA]" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1 block">แผนก</label>
                <select value={newDept} onChange={e => setNewDept(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA] bg-white">
                  <option value="">-- เลือกแผนก --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500 mb-1 block">ค่าแรง *</label>
                  <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="0"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA]" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500 mb-1 block">ประเภท</label>
                  <select value={newRateType} onChange={e => setNewRateType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none bg-white">
                    <option value="daily">รายวัน</option>
                    <option value="hourly">รายชั่วโมง</option>
                  </select>
                </div>
              </div>
            </div>
            {addError && <p className="text-red-500 text-sm">{addError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-[#F2F2F2] text-slate-600 py-3 rounded-full font-medium cursor-pointer">ยกเลิก</button>
              <button onClick={handleAdd} disabled={addSaving || !newName.trim() || !newRate}
                className="flex-1 bg-[#7B8CFA] text-white py-3 rounded-full font-bold cursor-pointer disabled:opacity-50">
                {addSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Edit Modal */}
      {/* ============================================================ */}
      {editEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-[#222222]">แก้ไขข้อมูลพนักงาน</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1 block">รหัสพนักงาน</label>
                <input value={editEmp.employeeId} readOnly className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base bg-[#F8FAFC] text-slate-500 cursor-default" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1 block">ชื่อ-นามสกุล *</label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA]" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1 block">แผนก</label>
                <select value={editDept} onChange={e => setEditDept(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA] bg-white">
                  <option value="">-- เลือกแผนก --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500 mb-1 block">ค่าแรง *</label>
                  <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-[#7B8CFA]" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500 mb-1 block">ประเภท</label>
                  <select value={editRateType} onChange={e => setEditRateType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base outline-none bg-white">
                    <option value="daily">รายวัน</option>
                    <option value="hourly">รายชั่วโมง</option>
                  </select>
                </div>
              </div>
            </div>
            {editError && <p className="text-red-500 text-sm">{editError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setEditEmp(null)} className="flex-1 bg-[#F2F2F2] text-slate-600 py-3 rounded-full font-medium cursor-pointer">ยกเลิก</button>
              <button onClick={handleEdit} disabled={editSaving || !editName.trim() || !editRate}
                className="flex-1 bg-[#7B8CFA] text-white py-3 rounded-full font-bold cursor-pointer disabled:opacity-50">
                {editSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Delete Confirm */}
      {/* ============================================================ */}
      {deleteEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <IconTrash />
            </div>
            <h2 className="text-xl font-bold text-[#222222]">ลบพนักงาน?</h2>
            <p className="text-slate-500">{deleteEmp.name} ({deleteEmp.employeeId})<br/>จะถูกปิดใช้งาน ข้อมูลยังคงอยู่ใน DB</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteEmp(null)} className="flex-1 bg-[#F2F2F2] text-slate-600 py-3 rounded-full font-medium cursor-pointer">ยกเลิก</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-500 text-white py-3 rounded-full font-bold cursor-pointer disabled:opacity-50">
                {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Attendance History Modal */}
      {/* ============================================================ */}
      {logsEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[80vh]">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-[#222222]">ประวัติการมาทำงาน</h2>
                <p className="text-slate-400 text-sm">{logsEmp.name} · {logsEmp.employeeId}</p>
              </div>
              <button onClick={() => setLogsEmp(null)}
                className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer text-slate-500">✕</button>
            </div>

            {logsLoading ? (
              <div className="flex justify-center py-8 text-slate-400">กำลังโหลด...</div>
            ) : logsData.length === 0 ? (
              <div className="text-center py-8 text-slate-400">ยังไม่มีประวัติ</div>
            ) : (
              <div className="overflow-y-auto flex-1 rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-500">วันที่</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-500">เข้า</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-500">พักเที่ยง</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-500">กลับ</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-500">ออก</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-red-400">มาสาย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsData.map((log, i) => (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{log.date}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{log.in !== '-' ? log.in : <span className="text-slate-300">–</span>}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{log.breakOut !== '-' ? log.breakOut : <span className="text-slate-300">–</span>}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{log.breakIn !== '-' ? log.breakIn : <span className="text-slate-300">–</span>}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{log.out !== '-' ? log.out : <span className="text-slate-300">–</span>}</td>
                        <td className="px-4 py-2.5 text-center">
                          {log.lateMins > 0
                            ? <span className="text-red-500 font-medium">{log.lateMins} นาที</span>
                            : <span className="text-slate-300">–</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Payroll History Modal */}
      {/* ============================================================ */}
      {payEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[80vh]">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-[#222222]">ประวัติค่าแรง</h2>
                <p className="text-slate-400 text-sm">{payEmp.name} · {payEmp.employeeId}</p>
              </div>
              <button onClick={() => setPayEmp(null)}
                className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer text-slate-500">✕</button>
            </div>

            {payLoading ? (
              <div className="flex justify-center py-8 text-slate-400">กำลังโหลด...</div>
            ) : payData.length === 0 ? (
              <div className="text-center py-8 text-slate-400">ยังไม่มีประวัติ</div>
            ) : (
              <div className="overflow-y-auto flex-1 flex flex-col gap-2">
                {payData.map((p, i) => (
                  <div key={i} className="border border-slate-100 rounded-2xl px-4 py-3 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700 text-sm">{p.startDate} — {p.endDate}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.status === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        {p.status === 'Paid' ? 'จ่ายแล้ว' : 'รอจ่าย'}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                      <span>ทำงาน {p.workDays} วัน</span>
                      <span>ค่าแรง {formatMoney(p.baseAmount)}</span>
                      {p.lateDeduction > 0 && <span className="text-red-400">หัก {formatMoney(p.lateDeduction)}</span>}
                      {p.otHours > 0 && <span className="text-emerald-500">OT +{p.otHours}ชม.</span>}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-slate-400">{p.paidAt ? `จ่ายเมื่อ ${p.paidAt.slice(0, 10)}` : ''}</span>
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
