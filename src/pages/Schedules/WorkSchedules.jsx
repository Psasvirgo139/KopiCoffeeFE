import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getRecurrencePatterns, getShifts, generateFromPattern, createWorkSchedule } from "../../utils/dataProvider/schedule";
import toast from "react-hot-toast";

function WorkSchedules() {
  const userInfo = useSelector((s)=>s.userInfo);
  const [patterns, setPatterns] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", recurrenceId: "", shiftIds: [] });
  const controller = useMemo(()=>new AbortController(), []);

  useEffect(()=>{ (async ()=>{
    try { const [p, s] = await Promise.all([getRecurrencePatterns(controller), getShifts({}, controller)]); setPatterns(p.data||[]); setShifts(s.data||[]);} catch { toast.error("Failed to load"); }
  })(); },[]);

  const submit = async (e)=>{
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.recurrenceId || !form.shiftIds.length) { toast.error("Điền đủ thông tin"); return; }
    try {
      let wsId = null;
      if (form.name) {
        const ws = await createWorkSchedule({ name: form.name, startDate: form.startDate, endDate: form.endDate, recurrenceId: Number(form.recurrenceId) }, userInfo.token);
        wsId = ws?.data?.workScheduleId || null;
      }
      const res = await generateFromPattern({ workScheduleId: wsId, recurrenceId: Number(form.recurrenceId), shiftIds: form.shiftIds.map(Number), startDate: form.startDate, endDate: form.endDate, overwrite: false }, userInfo.token);
      toast.success(`Generated ${res?.data?.created||0} slot(s)`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Generate failed");
    }
  };

  const toggleShift = (id)=>{
    setForm(f=>({ ...f, shiftIds: f.shiftIds.includes(id) ? f.shiftIds.filter(x=>x!==id) : [...f.shiftIds, id] }));
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Generate Schedules from Pattern</h1>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card bg-base-100 shadow">
              <div className="card-body space-y-4">
                <div>
                  <label className="label"><span className="label-text">Schedule name (optional)</span></label>
                  <input className="input input-bordered w-full" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} placeholder="Tuần 45/2025" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label"><span className="label-text">Start date</span></label>
                    <input type="date" className="input input-bordered w-full" value={form.startDate} onChange={e=>setForm(f=>({...f, startDate:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label"><span className="label-text">End date</span></label>
                    <input type="date" className="input input-bordered w-full" value={form.endDate} onChange={e=>setForm(f=>({...f, endDate:e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="label"><span className="label-text">Recurrence pattern</span></label>
                  <select className="select select-bordered w-full" value={form.recurrenceId} onChange={e=>setForm(f=>({...f, recurrenceId:e.target.value}))}>
                    <option value="">-- chọn mẫu --</option>
                    {patterns.map(p=> (
                      <option key={p.recurrenceId} value={p.recurrenceId}>{p.recurrenceType === 'WEEKLY' ? (p.dayOfWeek||'') : `Every ${p.intervalDays||1} day(s)`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <div className="font-medium mb-2">Chọn ca áp dụng</div>
                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-auto">
                  {shifts.map(s=> (
                    <label key={s.shiftId} className="flex items-center gap-3 p-2 border rounded">
                      <input type="checkbox" className="checkbox" checked={form.shiftIds.includes(s.shiftId)} onChange={()=>toggleShift(s.shiftId)} />
                      <div>
                        <div className="font-medium">{s.shiftName}</div>
                        <div className="text-xs text-gray-600">{s.startTime} - {s.endTime}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary" type="submit">Tạo lịch từ mẫu lặp</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default WorkSchedules;


