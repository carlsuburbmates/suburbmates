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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSuburb, setSelectedSuburb] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedSuburb) params.set("suburb", selectedSuburb);
    
    // If no filters selected, it will just go to /businesses
    router.push(`/businesses${params.toString() ? '?' + params.toString() : ''}`);
  };

  return (
    <motion.form
      onSubmit={handleSearch}
      className="relative w-full max-w-3xl mx-auto"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      role="search"
    >
      <div
        className="relative flex flex-col md:flex-row items-center overflow-hidden rounded-2xl md:rounded-full transition-all duration-300"
        style={{
          backgroundColor: isFocused ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)",
          border: isFocused
            ? "1.5px solid rgba(255,255,255,0.75)"
            : "1.5px solid rgba(255,255,255,0.30)",
          boxShadow: isFocused ? "0 0 0 3px rgba(255,255,255,0.15)" : "none",
        }}
      >
        {/* Category Select */}
        <div className="relative w-full md:w-1/2 flex items-center border-b md:border-b-0 md:border-r border-white/20">
          <div
            className="absolute left-5 pointer-events-none"
            style={{ color: "rgba(255,255,255,0.90)" }}
            aria-hidden="true"
          >
            <Search size={20} />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-label="Select a service"
            className="w-full pl-12 pr-4 py-4 md:py-5 text-lg bg-transparent border-none focus:outline-none focus:ring-0 appearance-none cursor-pointer"
            style={{
              color: selectedCategory ? "var(--sm-text-on-inverse)" : "rgba(255,255,255,0.55)",
            }}
          >
            <option value="" className="text-black">All Services</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug} className="text-black">
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Suburb Select */}
        <div className="relative w-full md:w-1/2 flex items-center">
          <select
            value={selectedSuburb}
            onChange={(e) => setSelectedSuburb(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-label="Select a suburb"
            className="w-full pl-6 pr-32 py-4 md:py-5 text-lg bg-transparent border-none focus:outline-none focus:ring-0 appearance-none cursor-pointer"
            style={{
              color: selectedSuburb ? "var(--sm-text-on-inverse)" : "rgba(255,255,255,0.55)",
            }}
          >
            <option value="" className="text-black">All Suburbs</option>
            {suburbs.map((sub) => (
              <option key={sub.slug} value={sub.slug} className="text-black">
                {sub.name}
              </option>
            ))}
          </select>

          {/* Submit button */}
          <button
            type="submit"
            aria-label="Search"
            className="btn btn-inverse absolute right-2 top-1/2 -translate-y-1/2"
            style={{
              padding: "0.625rem 1.25rem",
              fontSize: "0.8125rem",
            }}
          >
            Search
          </button>
        </div>
      </div>
    </motion.form>
  );
}
