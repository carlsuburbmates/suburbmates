"use client";

import { useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

type Option = { name: string; slug: string };

export function CategoryField({ options }: { options: Option[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Option | null>(null);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return options.slice(0, 8);
    return options.filter((option) => option.name.toLocaleLowerCase().includes(term)).slice(0, 8);
  }, [options, query]);

  function choose(option: Option) {
    setSelected(option);
    setQuery(option.name);
    setOpen(false);
  }

  return <div className="relative min-w-0 text-sm font-bold">
    <label htmlFor={listId}>Category</label>
    <input type="hidden" name="categorySlug" value={selected?.slug ?? ""} />
    <input
      id={listId}
      type="search"
      value={query}
      autoComplete="off"
      placeholder="Start typing a category"
      role="combobox"
      aria-autocomplete="list"
      aria-controls={`${listId}-options`}
      aria-expanded={open}
      aria-invalid={query.length > 0 && !selected}
      onChange={(event) => { setQuery(event.target.value); setSelected(null); setOpen(true); }}
      onFocus={() => setOpen(true)}
      className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 p-3 font-normal"
    />
    <p className="mt-2 text-xs font-normal leading-5 text-slate-600">Type to find and choose a category.</p>
    {open && <ul id={`${listId}-options`} role="listbox" className="absolute z-10 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
      {matches.length > 0 ? matches.map((option) => <li key={option.slug} role="option" aria-selected={selected?.slug === option.slug}>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">{option.name}</button>
      </li>) : <li className="px-3 py-2 text-sm font-normal text-slate-600">No matching category. Try another term.</li>}
    </ul>}
  </div>;
}

export function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary" aria-describedby="submission-progress">{pending ? pendingLabel : children}<span id="submission-progress" className="sr-only" aria-live="polite">{pending ? " Submission in progress." : ""}</span></button>;
}
