"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, Table2 } from "lucide-react";

export type DetailRow = Record<string, string | number | null | undefined>;

const DETAIL_ROW_HEIGHT = 33;
const DETAIL_VIEWPORT_HEIGHT = 560;
const DETAIL_OVERSCAN = 12;
const FILTER_ALL = "";
const FILTER_BLANK = "(Kosong)";
const EMPTY_EXTERNAL_FILTERS: Record<string, string> = {};

type OpenColumnFilter = {
    col: string;
    x: number;
    y: number;
};

function cellText(row: DetailRow, col: string): string {
    const raw = row[col];
    if (raw == null || raw === "") return "";
    return String(raw);
}

export function isInboundZone(zone: unknown): boolean {
    const z = String(zone ?? "")
        .trim()
        .toUpperCase();
    return z === "A" || z === "B" || z === "C" || z === "D";
}

function startsWithKoe(value: unknown): boolean {
    return String(value ?? "")
        .trim()
        .toUpperCase()
        .startsWith("KOE");
}

/** UN INBOUND: INBOUND_MANIFEST_DATE kosong (ORIGIN KOE* diizinkan). */
export function isUnInboundRow(row: DetailRow): boolean {
    const imd = String(row.INBOUND_MANIFEST_DATE ?? "").trim();
    return !imd;
}

/**
 * Hapus dari INBOUND hanya jika:
 * IMD kosong + OUTBOUND_MANIFEST terisi ≠ KOE*.
 * Jika OUTBOUND_MANIFEST non-KOE tapi IMD terisi → jangan hapus.
 */
export function isInboundDropRow(row: DetailRow): boolean {
    if (!isUnInboundRow(row)) return false;
    const om = String(row.OUTBOUND_MANIFEST ?? "").trim();
    return Boolean(om) && !startsWithKoe(om);
}

/** INBOUND: Zone/ZONA A–D, dikurangi baris yang memenuhi ketiga kriteria hapus. */
export function isInboundRow(row: DetailRow): boolean {
    if (!isInboundZone(row.Zone ?? row.ZONA)) return false;
    if (isInboundDropRow(row)) return false;
    return true;
}

type ShipmentRowsTableProps = {
    title: string;
    dateLabel: string;
    columns: string[];
    items: DetailRow[];
    totalRows?: number;
    loading?: boolean;
    emptyMessage?: string | null;
    iconClassName?: string;
    hint?: string;
    /** Tanpa border/shadow luar — dipakai di dalam kartu induk. */
    embedded?: boolean;
    /** Format label header (mis. hilangkan suffix .1 dari Excel). */
    formatColumnLabel?: (col: string) => string;
    /**
     * Kunci dataset — jika berubah, scroll/filter direset.
     * Default: fingerprint ringan dari items (panjang + sample).
     */
    resetKey?: string | number;
    /** Filter eksternal (mis. dari klik sel pivot) — digabung dengan filter kolom. */
    externalFilters?: Record<string, string>;
    externalFilterLabel?: string | null;
    onClearExternalFilters?: () => void;
    serverSearchValue?: string;
    onServerSearchChange?: (value: string) => void;
    serverSearchPlaceholder?: string;
    serverSearchLoading?: boolean;
};

export default function ShipmentRowsTable({
    title,
    dateLabel,
    columns,
    items,
    totalRows,
    loading = false,
    emptyMessage = null,
    iconClassName = "text-sky-700",
    hint,
    embedded = false,
    formatColumnLabel,
    resetKey,
    externalFilters = EMPTY_EXTERNAL_FILTERS,
    externalFilterLabel = null,
    onClearExternalFilters,
    serverSearchValue = "",
    onServerSearchChange,
    serverSearchPlaceholder = "Server search lintas data besar…",
    serverSearchLoading = false,
}: ShipmentRowsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [openColumnFilter, setOpenColumnFilter] = useState<OpenColumnFilter | null>(
        null
    );
    const [filterMenuSearch, setFilterMenuSearch] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const scrollRafRef = useRef(0);

    // Fingerprint stabil: jangan reset scroll hanya karena referensi array items berubah.
    const itemsResetKey = useMemo(() => {
        if (resetKey != null) return String(resetKey);
        const first = items[0];
        const last = items.length > 0 ? items[items.length - 1] : undefined;
        const sample = (row: DetailRow | undefined) => {
            if (!row) return "";
            return String(
                row.AWB ?? row.Coding ?? row.CABANG ?? row["3LC ORIGIN"] ?? Object.values(row)[0] ?? ""
            );
        };
        return `${items.length}:${sample(first)}:${sample(last)}`;
    }, [items, resetKey]);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
        return () => window.clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        setScrollTop(0);
        setColumnFilters({});
        setOpenColumnFilter(null);
        setFilterMenuSearch("");
        setSearchTerm("");
        setDebouncedSearch("");
    }, [itemsResetKey]);

    useEffect(() => {
        return () => {
            if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        };
    }, []);

    // Saat drill pivot berubah, reset scroll saja (jangan hapus filter kolom user).
    const externalFiltersKey = useMemo(
        () =>
            Object.entries(externalFilters)
                .filter(([, v]) => Boolean(v))
                .map(([k, v]) => `${k}=${v}`)
                .sort()
                .join("|"),
        [externalFilters]
    );

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        setScrollTop(0);
    }, [externalFiltersKey]);

    useEffect(() => {
        if (!openColumnFilter) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpenColumnFilter(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [openColumnFilter]);

    const searchedItems = useMemo(() => {
        if (!debouncedSearch) return items;
        const q = debouncedSearch.toLowerCase();
        return items.filter((row) =>
            columns.some((col) => cellText(row, col).toLowerCase().includes(q))
        );
    }, [items, columns, debouncedSearch]);

    const filteredItems = useMemo(() => {
        const merged = { ...externalFilters, ...columnFilters };
        const entries = Object.entries(merged).filter(([, v]) => Boolean(v));
        if (!entries.length) return searchedItems;
        return searchedItems.filter((row) =>
            entries.every(([col, val]) => {
                const text = cellText(row, col);
                if (val === FILTER_BLANK) return text === "";
                // Zone: bandingkan case-insensitive
                if (col === "Zone") {
                    return text.toUpperCase() === val.toUpperCase();
                }
                return text === val;
            })
        );
    }, [searchedItems, columnFilters, externalFilters]);

    const activeFilterCount = useMemo(
        () =>
            Object.values(columnFilters).filter(Boolean).length +
            Object.values(externalFilters).filter(Boolean).length,
        [columnFilters, externalFilters]
    );

    const openFilterOptions = useMemo(() => {
        if (!openColumnFilter) return [] as string[];
        const col = openColumnFilter.col;
        const otherFilters = Object.entries({
            ...externalFilters,
            ...columnFilters,
        }).filter(([k, v]) => k !== col && Boolean(v));
        const base =
            otherFilters.length === 0
                ? searchedItems
                : searchedItems.filter((row) =>
                      otherFilters.every(([k, val]) => {
                          const text = cellText(row, k);
                          if (val === FILTER_BLANK) return text === "";
                          if (k === "Zone") {
                              return text.toUpperCase() === val.toUpperCase();
                          }
                          return text === val;
                      })
                  );

        const uniq = new Set<string>();
        let hasBlank = false;
        for (const row of base) {
            const t = cellText(row, col);
            if (!t) hasBlank = true;
            else uniq.add(t);
        }
        const sorted = Array.from(uniq).sort((a, b) =>
            a.localeCompare(b, "id", { sensitivity: "base", numeric: true })
        );
        return hasBlank ? [FILTER_BLANK, ...sorted] : sorted;
    }, [openColumnFilter, searchedItems, columnFilters, externalFilters]);

    const visibleFilterOptions = useMemo(() => {
        const q = filterMenuSearch.trim().toLowerCase();
        const filtered = !q
            ? openFilterOptions
            : openFilterOptions.filter((opt) => opt.toLowerCase().includes(q));
        const MAX = 400;
        return {
            items: filtered.slice(0, MAX),
            truncated: filtered.length > MAX,
            total: filtered.length,
        };
    }, [openFilterOptions, filterMenuSearch]);

    const detailCount = filteredItems.length;
    const startIndex = Math.max(
        0,
        Math.floor(scrollTop / DETAIL_ROW_HEIGHT) - DETAIL_OVERSCAN
    );
    const endIndex = Math.min(
        detailCount,
        Math.ceil((scrollTop + DETAIL_VIEWPORT_HEIGHT) / DETAIL_ROW_HEIGHT) +
            DETAIL_OVERSCAN
    );
    const visibleRows = filteredItems.slice(startIndex, endIndex);
    const topPad = startIndex * DETAIL_ROW_HEIGHT;
    const bottomPad = Math.max(0, (detailCount - endIndex) * DETAIL_ROW_HEIGHT);

    const toggleColumnFilter = (
        e: React.MouseEvent<HTMLButtonElement>,
        col: string
    ) => {
        e.stopPropagation();
        if (openColumnFilter?.col === col) {
            setOpenColumnFilter(null);
            setFilterMenuSearch("");
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const menuWidth = 260;
        const x = Math.min(rect.left, window.innerWidth - menuWidth - 8);
        const y = Math.min(rect.bottom + 4, window.innerHeight - 320);
        setFilterMenuSearch("");
        setOpenColumnFilter({ col, x: Math.max(8, x), y: Math.max(8, y) });
    };

    const applyColumnFilter = (col: string, value: string) => {
        setColumnFilters((prev) => {
            const next = { ...prev };
            if (!value) delete next[col];
            else next[col] = value;
            return next;
        });
        setOpenColumnFilter(null);
        setFilterMenuSearch("");
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        setScrollTop(0);
    };

    const clearColumnFilters = () => {
        setColumnFilters({});
        setOpenColumnFilter(null);
        setFilterMenuSearch("");
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        setScrollTop(0);
    };

    const colLabel = (col: string) => formatColumnLabel?.(col) ?? col;

    return (
        <>
            <div
                className={
                    embedded
                        ? "overflow-hidden bg-white"
                        : "overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                }
            >
                <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Table2 className={`size-4 ${iconClassName}`} />
                        <span className="text-sm font-bold text-foreground">
                            {title} · {dateLabel}
                        </span>
                        {loading ? (
                            <Loader2 className="size-3.5 animate-spin text-secondary" />
                        ) : null}
                        <span className="text-xs text-secondary">
                            {items.length.toLocaleString("id-ID")} baris
                            {typeof totalRows === "number" && totalRows > 0
                                ? ` dari ${totalRows.toLocaleString("id-ID")} baris`
                                : ""}
                            {activeFilterCount > 0 || debouncedSearch
                                ? ` · terfilter ${detailCount.toLocaleString("id-ID")}`
                                : ""}
                        </span>
                        {activeFilterCount > 0 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    clearColumnFilters();
                                    onClearExternalFilters?.();
                                }}
                                className="text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
                            >
                                Reset filter kolom
                            </button>
                        ) : null}
                    </div>
                    <div className="grid w-full gap-2 sm:max-w-xl sm:grid-cols-2">
                        {onServerSearchChange ? (
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                                <input
                                    type="search"
                                    value={serverSearchValue}
                                    onChange={(e) => onServerSearchChange(e.target.value)}
                                    placeholder={serverSearchPlaceholder}
                                    className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-9 text-sm text-foreground"
                                />
                                {serverSearchLoading ? (
                                    <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-secondary" />
                                ) : null}
                            </div>
                        ) : null}
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari AWB, cabang, consignee…"
                                className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground"
                            />
                        </div>
                    </div>
                </div>

                {externalFilterLabel ? (
                    <div className="flex flex-wrap items-center gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2 text-xs text-sky-900">
                        <span className="font-semibold">Filter dari PIVOT:</span>
                        <span>{externalFilterLabel}</span>
                        {onClearExternalFilters ? (
                            <button
                                type="button"
                                onClick={onClearExternalFilters}
                                className="font-semibold underline-offset-2 hover:underline"
                            >
                                Hapus
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {hint ? (
                    <p className="border-b border-border px-4 py-2 text-[11px] text-secondary">
                        {hint}
                    </p>
                ) : null}

                <div
                    ref={scrollRef}
                    onScroll={(e) => {
                        const top = e.currentTarget.scrollTop;
                        if (openColumnFilter) setOpenColumnFilter(null);
                        // Throttle via rAF agar scroll DOM tidak bentrok dengan re-render sync
                        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
                        scrollRafRef.current = requestAnimationFrame(() => {
                            setScrollTop(top);
                        });
                    }}
                    className="overflow-x-auto overflow-y-auto overscroll-contain"
                    style={{ height: DETAIL_VIEWPORT_HEIGHT }}
                >
                    <table className="min-w-max border-collapse text-left">
                        <thead>
                            <tr>
                                {columns.map((col, colIdx) => {
                                    const active = Boolean(
                                        columnFilters[col] || externalFilters[col]
                                    );
                                    return (
                                        <th
                                            key={`${col}__${colIdx}`}
                                            className="sticky top-0 z-[1] whitespace-nowrap border-b border-border bg-[#f3f4f6] px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-foreground"
                                        >
                                            <div className="flex items-center gap-1">
                                                <span
                                                    className="max-w-[160px] truncate"
                                                    title={
                                                        active
                                                            ? `${colLabel(col)}: ${columnFilters[col]}`
                                                            : colLabel(col)
                                                    }
                                                >
                                                    {colLabel(col)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleColumnFilter(e, col)}
                                                    title={
                                                        active
                                                            ? `Filter: ${columnFilters[col]}`
                                                            : `Filter ${col}`
                                                    }
                                                    aria-label={`Filter ${col}`}
                                                    aria-expanded={
                                                        openColumnFilter?.col === col
                                                    }
                                                    className={`inline-flex size-5 shrink-0 items-center justify-center rounded transition ${
                                                        active
                                                            ? "bg-sky-600 text-white"
                                                            : "text-secondary hover:bg-black/10 hover:text-foreground"
                                                    }`}
                                                >
                                                    <ChevronDown
                                                        className="size-3.5"
                                                        aria-hidden
                                                    />
                                                </button>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-4 py-12 text-center text-sm text-secondary"
                                    >
                                        {emptyMessage || "Belum ada data untuk tabel ini."}
                                    </td>
                                </tr>
                            ) : null}

                            {!loading && items.length > 0 && detailCount === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-4 py-12 text-center text-sm text-secondary"
                                    >
                                        Tidak ada baris yang cocok dengan pencarian/filter.{" "}
                                        <button
                                            type="button"
                                            onClick={clearColumnFilters}
                                            className="font-semibold text-sky-700 underline-offset-2 hover:underline"
                                        >
                                            Reset filter
                                        </button>
                                    </td>
                                </tr>
                            ) : null}

                            {/* Spacer: height harus di <div> dalam <td>, bukan di <tr>
                                (browser sering mengabaikan height pada <tr>). */}
                            {topPad > 0 ? (
                                <tr aria-hidden>
                                    <td
                                        colSpan={Math.max(columns.length, 1)}
                                        className="border-0 p-0"
                                        style={{ lineHeight: 0, fontSize: 0 }}
                                    >
                                        <div style={{ height: topPad }} />
                                    </td>
                                </tr>
                            ) : null}

                            {visibleRows.map((row, i) => {
                                const idx = startIndex + i;
                                const rowKey =
                                    String(
                                        row.AWB ??
                                            row.Coding ??
                                            row.CABANG ??
                                            row["3LC"] ??
                                            row["3LC ORIGIN"] ??
                                            ""
                                    ) || "row";
                                return (
                                    <tr
                                        key={`${rowKey}-${idx}`}
                                        style={{ height: DETAIL_ROW_HEIGHT }}
                                        className="odd:bg-white even:bg-muted/20 hover:bg-sky-50/60"
                                    >
                                        {columns.map((col, colIdx) => {
                                            const text = cellText(row, col);
                                            return (
                                                <td
                                                    key={`${col}__${colIdx}`}
                                                    className="max-w-[280px] truncate whitespace-nowrap border-b border-border/60 px-3 py-1.5 text-xs text-foreground"
                                                    title={text}
                                                >
                                                    {text || "-"}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}

                            {bottomPad > 0 ? (
                                <tr aria-hidden>
                                    <td
                                        colSpan={Math.max(columns.length, 1)}
                                        className="border-0 p-0"
                                        style={{ lineHeight: 0, fontSize: 0 }}
                                    >
                                        <div style={{ height: bottomPad }} />
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-border px-4 py-3">
                    <span className="text-xs text-secondary">
                        {activeFilterCount > 0 || debouncedSearch
                            ? `Menampilkan ${detailCount.toLocaleString("id-ID")} dari ${items.length.toLocaleString("id-ID")} baris`
                            : `Menampilkan semua ${items.length.toLocaleString("id-ID")} baris (scroll untuk melihat lainnya)`}
                    </span>
                </div>
            </div>

            {openColumnFilter ? (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setOpenColumnFilter(null);
                            setFilterMenuSearch("");
                        }}
                        aria-hidden
                    />
                    <div
                        role="menu"
                        style={{ left: openColumnFilter.x, top: openColumnFilter.y }}
                        className="fixed z-50 flex max-h-80 w-[260px] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-lg"
                    >
                        <p className="truncate border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                            {colLabel(openColumnFilter.col)}
                        </p>
                        <div className="border-b border-border px-2 py-2">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-secondary" />
                                <input
                                    type="search"
                                    autoFocus
                                    value={filterMenuSearch}
                                    onChange={(e) => setFilterMenuSearch(e.target.value)}
                                    placeholder="Cari nilai…"
                                    className="w-full rounded-lg border border-border py-1.5 pl-7 pr-2 text-xs text-foreground outline-none focus:border-sky-500"
                                />
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto py-1">
                            <button
                                type="button"
                                onClick={() =>
                                    applyColumnFilter(openColumnFilter.col, FILTER_ALL)
                                }
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                            >
                                <span>(Semua)</span>
                                {!columnFilters[openColumnFilter.col] ? (
                                    <Check className="size-4 text-sky-600" aria-hidden />
                                ) : null}
                            </button>
                            {visibleFilterOptions.total === 0 ? (
                                <p className="px-3 py-2 text-sm text-secondary">
                                    Tidak ada pilihan.
                                </p>
                            ) : (
                                <>
                                    {visibleFilterOptions.items.map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() =>
                                                applyColumnFilter(openColumnFilter.col, opt)
                                            }
                                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                                        >
                                            <span className="truncate" title={opt}>
                                                {opt}
                                            </span>
                                            {columnFilters[openColumnFilter.col] === opt ? (
                                                <Check
                                                    className="size-4 shrink-0 text-sky-600"
                                                    aria-hidden
                                                />
                                            ) : null}
                                        </button>
                                    ))}
                                    {visibleFilterOptions.truncated ? (
                                        <p className="px-3 py-2 text-[11px] text-secondary">
                                            Menampilkan 400 dari{" "}
                                            {visibleFilterOptions.total.toLocaleString("id-ID")}{" "}
                                            nilai — ketik di pencarian untuk mempersempit.
                                        </p>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </>
    );
}
