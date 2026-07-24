export default function OpsLoading() {
  return <div className="animate-pulse space-y-5" role="status" aria-live="polite"><p className="text-sm font-semibold text-slate-600">Loading Operations…</p><div className="h-24 rounded-3xl bg-slate-200" /><div className="h-32 rounded-3xl bg-slate-200" /><span className="sr-only">Loading Operations</span></div>;
}
