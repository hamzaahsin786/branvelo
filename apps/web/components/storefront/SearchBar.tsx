"use client";

import { SearchIcon } from "./icons";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="px-3 pt-3">
      <label className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <SearchIcon className="h-5 w-5 shrink-0 text-neutral-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search items…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
      </label>
    </div>
  );
}
