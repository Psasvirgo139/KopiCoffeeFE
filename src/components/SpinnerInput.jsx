import React from "react";

function clampValue(v, min, max) {
  const n = Number.isFinite(Number(v)) ? Number(v) : 0;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

const SpinnerInput = ({ value = 0, onChange, min = 0, max = 9, className = "", inputProps = {}, widthClass = "w-20" }) => {
  const setVal = (next) => {
    const clamped = clampValue(next, min, max);
    onChange && onChange(clamped);
  };

  return (
    <div className={`relative inline-flex items-stretch ${widthClass} ${className}`}>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        inputMode="numeric"
        className="input input-bordered w-full pr-10"
        value={String(value)}
        onChange={(e) => {
          const raw = String(e.target.value || "");
          const numeric = raw.replace(/[^0-9]/g, "");
          const cleaned = numeric.replace(/^0+(\d)/, '$1');
          setVal(cleaned === "" ? 0 : cleaned);
        }}
        onBlur={(e) => {
          const raw = String(e.target.value || "");
          const numeric = raw.replace(/[^0-9]/g, "");
          const cleaned = numeric.replace(/^0+(\d)/, '$1');
          setVal(cleaned === "" ? 0 : cleaned);
        }}
        style={{ appearance: 'textfield' }}
        {...inputProps}
      />
      <div className="absolute right-1 top-1 bottom-1 flex flex-col">
        <button type="button" className="btn btn-xs min-h-0 h-5 leading-none" onClick={() => setVal(Number(value) + 1)} disabled={Number(value) >= max}>
          ▲
        </button>
        <button type="button" className="btn btn-xs min-h-0 h-5 mt-1 leading-none" onClick={() => setVal(Number(value) - 1)} disabled={Number(value) <= min}>
          ▼
        </button>
      </div>
    </div>
  );
};

export default SpinnerInput;


