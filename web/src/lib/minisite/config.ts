export const MinisiteConfig = {
  v1: {
    // WCAG AA safe grouped color palettes
    palettes: [
      {
        name: 'modern-dark',
        bg: 'bg-slate-950',
        text: 'text-slate-100',
        bodyText: 'text-slate-400',
        heroBg: 'bg-black',
        heroGlow: 'from-blue-600',
        cardBg: 'bg-slate-900 border-slate-800',
        btnBg: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
        btnSecondary: 'bg-slate-800 text-white hover:bg-slate-700',
      },
      {
        name: 'editorial-stark',
        bg: 'bg-white',
        text: 'text-zinc-900',
        bodyText: 'text-zinc-600',
        heroBg: 'bg-zinc-50',
        heroGlow: 'from-zinc-200',
        cardBg: 'bg-white border-zinc-200 shadow-xl shadow-zinc-100',
        btnBg: 'bg-zinc-900 text-white hover:bg-zinc-800',
        btnSecondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
      },
      {
        name: 'soft-minimal',
        bg: 'bg-[#FAFAFA]',
        text: 'text-[#2C2825]',
        bodyText: 'text-[#6B635E]',
        heroBg: 'bg-[#1C1A18]',
        heroGlow: 'from-[#D4C4B7]',
        cardBg: 'bg-white border-[#E8E4E1] shadow-lg shadow-[#D4C4B7]/20',
        btnBg: 'bg-[#D97757] text-white hover:bg-[#C26547]',
        btnSecondary: 'bg-[#F2EFEA] text-[#2C2825] hover:bg-[#E8E4E1]',
      },
      {
        name: 'aquatic-blue',
        bg: 'bg-sky-50',
        text: 'text-slate-900',
        bodyText: 'text-slate-600',
        heroBg: 'bg-sky-950',
        heroGlow: 'from-cyan-500',
        cardBg: 'bg-white border-sky-100 shadow-xl shadow-sky-900/5',
        btnBg: 'bg-cyan-600 text-white hover:bg-cyan-500',
        btnSecondary: 'bg-sky-100 text-sky-900 hover:bg-sky-200',
      }
    ],
    // Typography variations
    fonts: [
      { name: 'sans-inter', class: 'font-sans tracking-tight' },
      { name: 'serif-playfair', class: 'font-serif' },
    ],
    // Border radii for cards and buttons
    corners: [
      { name: 'brutalist', container: 'rounded-none', btn: 'rounded-none', border: 'border-2' },
      { name: 'modern', container: 'rounded-2xl', btn: 'rounded-lg', border: 'border' },
      { name: 'soft', container: 'rounded-[2rem]', btn: 'rounded-full', border: 'border' },
    ],
    heroStructures: ['Split', 'Centered', 'Minimal'] as const,
    contactStructures: ['Sidebar', 'Inline'] as const,
  }
};
