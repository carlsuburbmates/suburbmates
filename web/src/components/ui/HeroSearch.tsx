"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface HeroSearchProps {
  categories: { name: string; slug: string }[];
  suburbs: { name: string; slug: string }[];
}

export function HeroSearch({ categories, suburbs }: HeroSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSuburb, setSelectedSuburb] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedSuburb) params.set("suburb", selectedSuburb);
    router.push(`/businesses${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <motion.form
      action="/businesses"
      method="get"
      onSubmit={handleSearch}
      className="relative mx-auto w-full max-w-5xl"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      role="search"
    >
      <div
        className="grid grid-cols-1 overflow-hidden rounded-2xl transition-all duration-300 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:rounded-full"
        style={{
          backgroundColor: isFocused ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)",
          border: isFocused ? "1.5px solid rgba(255,255,255,0.75)" : "1.5px solid rgba(255,255,255,0.30)",
          boxShadow: isFocused ? "0 0 0 3px rgba(255,255,255,0.15)" : "none",
        }}
      >
        <div className="relative flex items-center border-b border-white/20 lg:border-b-0 lg:border-r">
          <Search className="pointer-events-none absolute left-5" size={20} color="rgba(255,255,255,0.90)" aria-hidden="true" />
          <label className="sr-only" htmlFor="hero-search">Search business name or keyword</label>
          <input
            id="hero-search"
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search business name or keyword"
            className="w-full rounded-xl bg-transparent py-4 pl-12 pr-4 text-base text-white placeholder:text-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black lg:rounded-l-full sm:text-lg"
          />
        </div>

        <div className="flex items-center border-b border-white/20 lg:border-b-0 lg:border-r">
          <label className="sr-only" htmlFor="hero-category">Select a service</label>
          <select
            id="hero-category"
            name="category"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full cursor-pointer appearance-none rounded-xl border-none bg-transparent px-5 py-4 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
            style={{ color: selectedCategory ? "var(--sm-text-on-inverse)" : "rgba(255,255,255,0.75)" }}
          >
            <option value="" className="text-black">All services</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug} className="text-black">{category.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center border-b border-white/20 lg:border-b-0 lg:border-r">
          <label className="sr-only" htmlFor="hero-suburb">Select a suburb</label>
          <select
            id="hero-suburb"
            name="suburb"
            value={selectedSuburb}
            onChange={(event) => setSelectedSuburb(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full cursor-pointer appearance-none rounded-xl border-none bg-transparent px-5 py-4 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
            style={{ color: selectedSuburb ? "var(--sm-text-on-inverse)" : "rgba(255,255,255,0.75)" }}
          >
            <option value="" className="text-black">All suburbs</option>
            {suburbs.map((suburb) => (
              <option key={suburb.slug} value={suburb.slug} className="text-black">{suburb.name}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-inverse m-2 min-h-11 justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black" aria-label="Search directory">Search</button>
      </div>
    </motion.form>
  );
}
