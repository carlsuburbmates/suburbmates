"use client";

import { useState } from "react";

type ReasonPreset = {
  label: string;
  value: string;
};

export function DecisionReasonField({
  id,
  label,
  presets,
  rows = 4,
}: {
  id: string;
  label: string;
  presets: readonly ReasonPreset[];
  rows?: number;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold">Quick reason</p>
        <p id={`${id}-presets`} className="mt-1 text-sm text-slate-600">Choose a starting point, then check and edit it to match the evidence.</p>
      </div>
      <div className="flex flex-wrap gap-2" aria-describedby={`${id}-presets`}>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setReason(preset.value)}
            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label className="block text-sm font-bold" htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name="reason"
        required
        maxLength={2000}
        rows={rows}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-full rounded-xl border border-slate-300 p-3"
      />
    </div>
  );
}
