"use client";

import { ChevronDown } from "lucide-react";
import { CABANG_OPTIONS, type CabangName } from "./cabang";

type CabangSelectProps = {
    id?: string;
    value: CabangName;
    onChange: (value: CabangName) => void;
    className?: string;
};

export default function CabangSelect({
    id = "cabang",
    value,
    onChange,
    className = "",
}: CabangSelectProps) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label htmlFor={id} className="text-sm font-semibold text-foreground">
                Cabang
            </label>
            <div className="relative max-w-sm">
                <select
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value as CabangName)}
                    className="w-full appearance-none rounded-xl border border-border bg-white px-4 py-3 pr-10 text-sm font-medium text-foreground"
                >
                    {CABANG_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
            </div>
        </div>
    );
}
