// ============================================================
//  EmployeesPage — จัดการพนักงาน (CRUD + Enroll)
//  Props:
//    employees    - รายชื่อพนักงานทั้งหมด
//    onBack       - กลับหน้า admin
//    onEnroll     - (employee) → ไปหน้า enroll พร้อม pre-select
//    onRefresh    - callback() reload employees
// ============================================================
import { useState } from 'react';
import * as api from '../lib/api';

const DEPARTMENTS = ['Office', 'Production'];

function hasFace(emp) {
  return !!emp.faceDescriptorJson;
}

export default function EmployeesPage({ employees, onBack, onEnroll, onRefresh }) {
  // --- Add modal ---
  const [showAdd, setShowAdd]       = useState(false);
  const [newId, setNewId]           = useState('');
  const [newName, setNewName]       = useState('');
  const [newDept, setNewDept]       = useState('');
  const [newRate, setNewRate]       = useState('');
  const [newRateType, setNewRateType] = useState('daily');
  const [addSaving, setAddSaving]   = useState(false);
  const [addError, setAddError]     = useState(null);

  // --- Edit modal ---
  const [editEmp, setEditEmp]       = useState(null);
  const [editName, setEditName]     = useState('');
  const [editDept, setEditDept]     = useState('');
  const [editRate, setEditRate]     = useState('');
  const [editRateType, setEditRateType] = useState('daily');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState(null);

  // --- Delete confirm ---
  const [deleteEmp, setDeleteEmp]   = useState(null);
  const [deleting, setDeleting]     = useState(false);

  // ============================================================
  //  Add
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
      setShowAdd(false);
      onRefresh();
    } catch (err) {
      setAddError(err.message || 'เพิ่มพนักงานไม่สำเร็จ');
    } finally { setAddSaving(false); }
  };

  // ============================================================
  //  Edit
  // ============================================================
  const openEdit = (emp) => {
    setEditEmp(emp);
    setEditName(emp.name);
    setEditDept(emp.department || '');
    setEditRate(String(emp.rate));
    setEditRateType(emp.rateType || 'daily');
    setEditError(null);
  };

  const handleEdit = async () => {
    if (!editName.trim() || !editRate) return;
    setEditSaving(true); setEditError(null);
    try {
      await api.updateEmployee(editEmp.employeeId, { name: editName.trim(), department: editDept, rate: parseFloat(editRate), rateType: editRateType });
      setEditEmp(null);
      onRefresh();
    } catch (err) {
      setEditError(err.message || 'แก้ไขไม่สำเร็จ');
    } finally { setEditSaving(false); }
  };

  // ============================================================
  //  Delete
  // ============================================================
  const handleDelete = async () => {
    if (!deleteEmp) return;
    setDeleting(true);
    try {
      await api.deleteEmployee(deleteEmp.employeeId);
      setDeleteEmp(null);
      onRefresh();
    } catch { /* ignore */ } finally { setDeleting(false); }
  };

  // ============================================================
  //  Render
  // ============================================================
  return (
    <div className="flex flex-col w-full self-stretch px-6 pt-4 pb-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm mb-4 w-full border border-slate-100 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="bg-[#F2F2F2] p-2 rounded-full cursor-pointer touch-manipulation">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-[#222222]">พนักงาน</h1>
            <span className="bg-slate-100 text-slate-500 text-sm px-3 py-1 rounded-full">{employees.length} คน</span>
          </div>
          <button
            onClick={openAdd}
            className="bg-[#7B8CFA] text-white px-4 py-2 rounded-full text-base font-medium flex items-center gap-1.5 cursor-pointer touch-manipulation"
          >
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
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">รหัส</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">ชื่อ-นามสกุล</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">แผนก</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-500">ค่าแรง</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-500">ใบหน้า</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-500">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={emp.employeeId} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-[#FAFAFA]'}`}>
                    <td className="px-5 py-3 text-slate-500 font-mono">{emp.employeeId}</td>
                    <td className="px-5 py-3 font-medium text-[#222222]">{emp.name}</td>
                    <td className="px-5 py-3 text-slate-500">{emp.department || '-'}</td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {emp.rate.toLocaleString()} {emp.rateType === 'daily' ? 'บ./วัน' : 'บ./ชม.'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {hasFace(emp)
                        ? <span className="text-green-500 text-lg">✓</span>
                        : <span className="text-slate-300 text-lg">–</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEnroll(emp)}
                          className="bg-[#C6F45D] text-[#222222] text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer touch-manipulation whitespace-nowrap"
                        >
                          ลงทะเบียน
                        </button>
                        <button
                          onClick={() => openEdit(emp)}
                          className="bg-[#F2F2F2] text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer touch-manipulation"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => setDeleteEmp(emp)}
                          className="bg-red-50 text-red-500 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer touch-manipulation"
                        >
                          ลบ
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
            <div className="text-4xl">🗑️</div>
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
    </div>
  );
}
