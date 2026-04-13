import * as XLSX from "xlsx";

export type BuktiRowData = {
    /** Nomor / label hari (Senin, 1, dll. sesuai file) */
    hari: string;
    tanggal: string;
    bri: string;
    bni: string;
    lainnya: string;
    totalSetoran: string;
};

export type BuktiSheetParsed = {
    sheetName: string;
    /** Nilai sel F1 — ditampilkan di header "Total Setoran Bank : …" */
    f1TotalSetoranBank: string;
    rows: BuktiRowData[];
};

function normalizeHeader(h: string): string {
    return h
        .replace(/\u00A0/g, " ")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function cellText(cell: XLSX.CellObject | undefined): string {
    if (!cell) return "";
    if (cell.w != null) return String(cell.w).trim();
    if (cell.v != null && cell.v !== "") return String(cell.v).trim();
    return "";
}

function cellTextPreferFormatted(cell: XLSX.CellObject | undefined): string {
    if (!cell) return "";
    if (cell.w != null) return String(cell.w).trim();
    if (cell.v == null || cell.v === "") return "";

    // Gunakan formatter bawaan SheetJS agar angka/tanggal mengikuti format Excel (ribuan, mata uang, dll)
    try {
        const formatted = XLSX.utils.format_cell(cell);
        if (formatted != null && String(formatted).trim() !== "") {
            return String(formatted).trim();
        }
    } catch {
        // ignore, fallback di bawah
    }

    // Fallback manual bila format_cell gagal (mis. cell.v angka + ada z)
    if (cell.t === "n" && typeof cell.v === "number") {
        const z = (cell as XLSX.CellObject & { z?: string }).z;
        if (z) {
            try {
                return String(XLSX.SSF.format(z, cell.v)).trim();
            } catch {
                // ignore
            }
        }
    }
    return String(cell.v).trim();
}

function sheetCellText(sheet: XLSX.WorkSheet, r: number, c: number): string {
    const addr = XLSX.utils.encode_cell({ r, c });
    return cellTextPreferFormatted(sheet[addr] as XLSX.CellObject | undefined);
}

function mapHeaderIndicesFromSheet(
    sheet: XLSX.WorkSheet,
    headerRow: number,
    range: XLSX.Range
): Partial<Record<keyof BuktiRowData, number>> {
    const map: Partial<Record<keyof BuktiRowData, number>> = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
        const nk = normalizeHeader(sheetCellText(sheet, headerRow, c));
        if (!nk) continue;
        if (nk === "hari") map.hari = c;
        else if (nk === "tanggal" || nk === "tgl") map.tanggal = c;
        else if (nk === "bri") map.bri = c;
        else if (nk === "bni") map.bni = c;
        else if (nk === "lainnya") map.lainnya = c;
        else if (nk === "total setoran") map.totalSetoran = c;
    }
    if (map.totalSetoran === undefined) {
        for (let c = range.s.c; c <= range.e.c; c++) {
            const nk = normalizeHeader(sheetCellText(sheet, headerRow, c));
            if (nk === "total") {
                map.totalSetoran = c;
                break;
            }
        }
    }
    return map;
}

function emptyBuktiRow(): BuktiRowData {
    return {
        hari: "",
        tanggal: "",
        bri: "",
        bni: "",
        lainnya: "",
        totalSetoran: "",
    };
}

function readWorkbook(buf: ArrayBuffer, fileName: string): XLSX.WorkBook {
    const name = fileName.toLowerCase();
    if (name.endsWith(".csv")) {
        let text = new TextDecoder("utf-8").decode(buf);
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        const firstLine = text.split(/\r?\n/)[0] ?? "";
        const commas = (firstLine.match(/,/g) || []).length;
        const semis = (firstLine.match(/;/g) || []).length;
        const fs = semis > commas ? ";" : ",";
        return XLSX.read(text, { type: "string", raw: false, FS: fs });
    }
    return XLSX.read(buf, { type: "array", raw: false });
}

/** Cocokkan indeks kolom dari baris header (Hari, Tanggal, BRI, …) */
function mapHeaderIndices(headerRow: unknown[]): Partial<Record<keyof BuktiRowData, number>> {
    const map: Partial<Record<keyof BuktiRowData, number>> = {};
    headerRow.forEach((cell, idx) => {
        const nk = normalizeHeader(String(cell ?? ""));
        if (nk === "hari") map.hari = idx;
        else if (nk === "tanggal" || nk === "tgl") map.tanggal = idx;
        else if (nk === "bri") map.bri = idx;
        else if (nk === "bni") map.bni = idx;
        else if (nk === "lainnya") map.lainnya = idx;
        else if (nk === "total setoran") map.totalSetoran = idx;
    });
    /* fallback "total" jika tidak ada "total setoran" */
    if (map.totalSetoran === undefined) {
        headerRow.forEach((cell, idx) => {
            const nk = normalizeHeader(String(cell ?? ""));
            if (nk === "total") map.totalSetoran = idx;
        });
    }
    return map;
}

function parseOneSheet(sheet: XLSX.WorkSheet, sheetName: string): BuktiSheetParsed {
    const f1TotalSetoranBank = cellText(sheet["F1"]);

    const rows: BuktiRowData[] = [];

    const ref = sheet["!ref"];
    if (!ref) return { sheetName, f1TotalSetoranBank, rows: [] };
    const range = XLSX.utils.decode_range(ref);

    let headerRowIdx = -1;
    let colMap: Partial<Record<keyof BuktiRowData, number>> = {};

    const scanRows = Math.min(range.e.r, range.s.r + 80);
    for (let r = range.s.r; r <= scanRows; r++) {
        let hasHari = false;
        let hasTanggal = false;
        for (let c = range.s.c; c <= range.e.c; c++) {
            const nk = normalizeHeader(sheetCellText(sheet, r, c));
            if (nk === "hari") hasHari = true;
            if (nk === "tanggal" || nk === "tgl") hasTanggal = true;
        }
        if (hasHari && hasTanggal) {
            headerRowIdx = r;
            colMap = mapHeaderIndicesFromSheet(sheet, r, range);
            break;
        }
    }

    if (headerRowIdx >= 0 && Object.keys(colMap).length >= 2) {
        for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
            const rec = emptyBuktiRow();
            (Object.keys(colMap) as (keyof BuktiRowData)[]).forEach((field) => {
                const c = colMap[field];
                if (c === undefined) return;
                rec[field] = sheetCellText(sheet, r, c);
            });

            // Stop kalau sudah ketemu baris kosong total setelah data mulai
            if (!Object.values(rec).some((v) => v.length > 0)) {
                // masih boleh ada baris kosong di awal; tapi setelah sudah ada data, putus.
                if (rows.length > 0) break;
                continue;
            }
            rows.push(rec);
        }
    } else {
        /* fallback: sheet_to_json dengan baris pertama sebagai header */
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
            raw: false,
        });
        if (!jsonRows.length) {
            return { sheetName, f1TotalSetoranBank, rows: [] };
        }
        const headerToField = (h: string): keyof BuktiRowData | null => {
            const nk = normalizeHeader(h);
            if (nk === "hari") return "hari";
            if (nk === "tanggal" || nk === "tgl") return "tanggal";
            if (nk === "bri") return "bri";
            if (nk === "bni") return "bni";
            if (nk === "lainnya") return "lainnya";
            if (nk === "total setoran" || nk === "total setoran bank") return "totalSetoran";
            return null;
        };
        const keyMap = new Map<string, keyof BuktiRowData>();
        for (const k of Object.keys(jsonRows[0])) {
            const f = headerToField(k);
            if (f) keyMap.set(k, f);
        }
        for (const jr of jsonRows) {
            const rec = emptyBuktiRow();
            for (const [excelKey, field] of keyMap) {
                const v = jr[excelKey];
                rec[field] = v === null || v === undefined ? "" : String(v).trim();
            }
            if (Object.values(rec).some((v) => v.length > 0)) rows.push(rec);
        }
    }

    return { sheetName, f1TotalSetoranBank, rows };
}

/**
 * Parse semua sheet file bukti transaksi (Excel / CSV).
 * Header per sheet: Total Setoran Bank diambil dari sel F1.
 * Tabel: kolom Hari, Tanggal, BRI, BNI, Lainnya, Total Setoran.
 */
export function parseBuktiTransaksiBuffer(buf: ArrayBuffer, fileName: string): BuktiSheetParsed[] {
    const wb = readWorkbook(buf, fileName);
    const out: BuktiSheetParsed[] = [];
    for (const name of wb.SheetNames) {
        const sheet = wb.Sheets[name];
        if (!sheet) continue;
        out.push(parseOneSheet(sheet, name));
    }
    return out;
}
