import React, { useState, useEffect } from "react";
import { copyAssignments } from "../../utils/dataProvider/schedule";
import toast from "react-hot-toast";

const CopyAssignmentsModal = ({ isOpen, onClose, sourceDateDefault, onSuccess, token }) => {
  const [sourceDate, setSourceDate] = useState(sourceDateDefault || "");
  const [targetDates, setTargetDates] = useState([]);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sourceDateDefault) setSourceDate(sourceDateDefault);
  }, [sourceDateDefault]);

  useEffect(() => {
    if (!isOpen) {
      // reset when closed
      setTargetDates([]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addTargetDate = () => {
    if (targetDates.length >= 30) {
      toast.error("Giới hạn tối đa 30 ngày");
      return;
    }
    setTargetDates(prev => [...prev, ""]);
  };

  const expandRange = () => {
    if (!rangeStart || !rangeEnd) {
      toast.error("Vui lòng chọn cả ngày bắt đầu và kết thúc của range");
      return;
    }
    const s = new Date(rangeStart);
    const e = new Date(rangeEnd);
    if (isNaN(s) || isNaN(e) || s > e) {
      toast.error("Range không hợp lệ");
      return;
    }

    const days = [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d).toISOString().slice(0,10));
    }

    // merge with existing, remove duplicates and sourceDate
    const merged = Array.from(new Set([...targetDates, ...days])).filter(d => d && d !== sourceDate);
    if (merged.length > 30) {
      toast.error("Thao tác này sẽ vượt quá giới hạn 30 ngày. Vui lòng chọn khoảng nhỏ hơn.");
      return;
    }
    setTargetDates(merged);
  };

  const updateTargetDate = (idx, value) => {
    setTargetDates(prev => prev.map((d, i) => i === idx ? value : d));
  };

  const removeTargetDate = (idx) => {
    setTargetDates(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!sourceDate) {
      toast.error("Vui lòng chọn ngày nguồn");
      return;
    }

    const cleaned = targetDates
      .map(d => d.trim())
      .filter(d => d.length > 0 && d !== sourceDate);

    const uniq = Array.from(new Set(cleaned));

    if (!uniq.length) {
      toast.error("Vui lòng chọn ít nhất 1 ngày đích");
      return;
    }

    if (uniq.length > 30) {
      toast.error("Giới hạn tối đa 30 ngày");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sourceDate: sourceDate,
        targetDates: uniq,
        overwrite: true
      };
      const resp = await copyAssignments(payload, token);
      const count = resp?.data?.created || uniq.length;
      toast.success(`Sao chép hoàn tất: ${count} bản ghi`);
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || "Lỗi khi sao chép";
      toast.error(String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="bg-white rounded shadow-lg max-w-lg w-full p-6 z-10">
        <h3 className="text-lg font-semibold mb-3">Sao chép phân công nhân viên</h3>

        <label className="block text-sm">Ngày nguồn</label>
        <input type="date" className="border p-2 w-full mb-3" value={sourceDate}
               onChange={e => setSourceDate(e.target.value)} />

        <label className="block text-sm">Các ngày đích (tối đa 30)</label>
        <div className="mb-3">
          <div className="flex gap-2 items-end mb-2">
            <div className="flex-1">
              <label className="text-xs">Range start</label>
              <input type="date" className="border p-2 w-full" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs">Range end</label>
              <input type="date" className="border p-2 w-full" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
            </div>
            <div>
              <button className="btn btn-sm" onClick={expandRange}>Expand range</button>
            </div>
          </div>

          <div className="space-y-2">
            {targetDates.map((td, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="date" className="border p-2 flex-1" value={td}
                       onChange={e => updateTargetDate(idx, e.target.value)} />
                <button className="btn btn-ghost text-red-600" onClick={() => removeTargetDate(idx)}>Xóa</button>
              </div>
            ))}
            <div>
              <button className="btn btn-sm" onClick={addTargetDate}>+ Thêm ngày đích</button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose} disabled={isSubmitting}>Hủy</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Đang xử lý...' : 'Sao chép (ghi đè)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CopyAssignmentsModal;
