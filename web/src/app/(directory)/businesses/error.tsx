"use client";

export default function DirectoryError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-3xl font-black tracking-tight">
        The directory is temporarily unavailable
      </h1>
      <p className="mt-4 text-slate-600">
        No search or listing change was made. Please try again in a moment.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        Try again
      </button>
    </div>
  );
}
