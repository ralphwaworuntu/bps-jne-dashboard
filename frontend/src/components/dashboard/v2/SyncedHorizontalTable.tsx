"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type SyncedHorizontalTableProps = {
    children: ReactNode;
    className?: string;
    tableClassName?: string;
};

/** Scroll horizontal di atas dan di bawah, scrollLeft tersinkron */
export default function SyncedHorizontalTable({
    children,
    className = "",
    tableClassName = "",
}: SyncedHorizontalTableProps) {
    const topRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [spacerW, setSpacerW] = useState(0);

    const updateSpacer = useCallback(() => {
        const el = bottomRef.current;
        if (!el) return;
        setSpacerW(el.scrollWidth);
    }, []);

    useEffect(() => {
        const el = bottomRef.current;
        if (!el) return;
        updateSpacer();
        const ro = new ResizeObserver(() => updateSpacer());
        ro.observe(el);
        window.addEventListener("resize", updateSpacer);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", updateSpacer);
        };
    }, [updateSpacer]);

    const onTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const left = e.currentTarget.scrollLeft;
        if (bottomRef.current) bottomRef.current.scrollLeft = left;
    };

    const onBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const left = e.currentTarget.scrollLeft;
        if (topRef.current) topRef.current.scrollLeft = left;
    };

    return (
        <div className={`rounded-2xl border border-border bg-white overflow-hidden ${className}`}>
            <div
                ref={topRef}
                className="overflow-x-auto overflow-y-hidden border-b border-border bg-muted/40"
                style={{ scrollbarWidth: "thin" }}
                onScroll={onTopScroll}
                aria-hidden
            >
                <div style={{ width: spacerW || "100%", height: 1 }} />
            </div>
            <div
                ref={bottomRef}
                className={`overflow-x-auto ${tableClassName}`}
                style={{ scrollbarWidth: "thin" }}
                onScroll={onBottomScroll}
            >
                {children}
            </div>
        </div>
    );
}
