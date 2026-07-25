"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type SyncedHorizontalTableProps = {
    children: ReactNode;
    className?: string;
    tableClassName?: string;
};

/** Scroll horizontal di atas dan di bawah tabel, scrollLeft tersinkron */
export default function SyncedHorizontalTable({
    children,
    className = "",
    tableClassName = "",
}: SyncedHorizontalTableProps) {
    const topRef = useRef<HTMLDivElement>(null);
    const midRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [spacerW, setSpacerW] = useState(0);
    const syncing = useRef(false);

    const updateSpacer = useCallback(() => {
        const el = midRef.current;
        if (!el) return;
        // Prefer table scrollWidth so spacer matches content
        const table = el.querySelector("table");
        setSpacerW(table ? table.scrollWidth : el.scrollWidth);
    }, []);

    useEffect(() => {
        const el = midRef.current;
        if (!el) return;
        updateSpacer();
        const ro = new ResizeObserver(() => updateSpacer());
        ro.observe(el);
        const table = el.querySelector("table");
        if (table) ro.observe(table);
        window.addEventListener("resize", updateSpacer);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", updateSpacer);
        };
    }, [updateSpacer, children]);

    const syncScroll = (source: "top" | "mid" | "bottom", left: number) => {
        if (syncing.current) return;
        syncing.current = true;
        if (source !== "top" && topRef.current) topRef.current.scrollLeft = left;
        if (source !== "mid" && midRef.current) midRef.current.scrollLeft = left;
        if (source !== "bottom" && bottomRef.current) bottomRef.current.scrollLeft = left;
        requestAnimationFrame(() => {
            syncing.current = false;
        });
    };

    return (
        <div className={`rounded-2xl border border-border bg-white overflow-hidden ${className}`}>
            {/* Top scrollbar */}
            <div
                ref={topRef}
                className="overflow-x-auto overflow-y-hidden border-b border-border bg-muted/30 px-0 py-1"
                style={{ scrollbarWidth: "thin" }}
                onScroll={(e) => syncScroll("top", e.currentTarget.scrollLeft)}
                aria-label="Scroll horizontal atas"
            >
                <div style={{ width: Math.max(spacerW, 1), height: 8 }} />
            </div>

            {/* Table body */}
            <div
                ref={midRef}
                className={`overflow-x-auto scrollbar-hide ${tableClassName}`}
                onScroll={(e) => syncScroll("mid", e.currentTarget.scrollLeft)}
            >
                {children}
            </div>

            {/* Bottom scrollbar */}
            <div
                ref={bottomRef}
                className="overflow-x-auto overflow-y-hidden border-t border-border bg-muted/30 px-0 py-1"
                style={{ scrollbarWidth: "thin" }}
                onScroll={(e) => syncScroll("bottom", e.currentTarget.scrollLeft)}
                aria-label="Scroll horizontal bawah"
            >
                <div style={{ width: Math.max(spacerW, 1), height: 8 }} />
            </div>
        </div>
    );
}
