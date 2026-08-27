"use client";

export default function TaxonomyDirectoryError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-3xl font-black tracking-tight">
        These directory results are temporarily unavailable
      </h1>
      <p className="mt-4 text-slate-600">
        No listing has changed. Please try again in a moment.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        Try again
      </button>
    </div>
  );
}
