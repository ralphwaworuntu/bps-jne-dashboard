import * as XLSX from "xlsx";

/** Kolom sesuai struktur file rekening koran (ekspor bank / template internal) */
export type RekeningKoranFields = {
    tanggal: string;
    deskripsiTransaksi: string;
    amount: string;
    type: string;
    catatan: string;
    unknow: string;
    divisiPic: string;
};

export type RekeningKoranRow = RekeningKoranFields & { id: string };

function normalizeHeader(h: string): string {
    return h
        .replace(/\u00A0/g, " ")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

/** Map header sheet → field tabel (variasi penamaan) */
const HEADER_TO_FIELD: Record<string, keyof RekeningKoranFields> = {
    tanggal: "tanggal",
    "deskripsi transaksi": "deskripsiTransaksi",
    amount: "amount",
    type: "type",
    catatan: "catatan",
    unknow: "unknow",
    unknown: "unknow",
    "divisi/pic": "divisiPic",
    "divisi / pic": "divisiPic",
    "divisi pic": "divisiPic",
};

function emptyFields(): RekeningKoranFields {
    return {
        tanggal: "",
        deskripsiTransaksi: "",
        amount: "",
        type: "",
        catatan: "",
        unknow: "",
        divisiPic: "",
    };
}

/**
 * Bangun peta: nama kolom asli di file → field internal (dari baris pertama sheet).
 */
function buildExcelKeyToField(firstRow: Record<string, unknown>): Map<string, keyof RekeningKoranFields> {
    const map = new Map<string, keyof RekeningKoranFields>();
    for (const key of Object.keys(firstRow)) {
        const nk = normalizeHeader(key);
        const field = HEADER_TO_FIELD[nk];
        if (field) map.set(key, field);
    }
    return map;
}

function mapJsonRows(
    jsonRows: Record<string, unknown>[],
    excelToField: Map<string, keyof RekeningKoranFields>
): RekeningKoranFields[] {
    const out: RekeningKoranFields[] = [];
    for (const row of jsonRows) {
        const rec = emptyFields();
        for (const [excelKey, field] of excelToField) {
            const v = row[excelKey];
            rec[field] = v === null || v === undefined ? "" : String(v).trim();
        }
        const hasAny = Object.values(rec).some((s) => s.length > 0);
        if (hasAny) out.push(rec);
    }
    return out;
}

/**
 * Membaca buffer Excel (.xlsx, .xls, .xlsm) atau CSV menjadi baris rekening koran.
 * Gunakan ini setelah `arrayBuffer()` dibaca (mis. langsung saat user memilih file).
 */
export function parseRekeningKoranBuffer(
    buf: ArrayBuffer,
    fileName: string
): {
    rows: RekeningKoranFields[];
    matchedHeaders: number;
} {
    const name = fileName.toLowerCase();

    let workbook: XLSX.WorkBook;
    if (name.endsWith(".csv")) {
        let text = new TextDecoder("utf-8").decode(buf);
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        const firstLine = text.split(/\r?\n/)[0] ?? "";
        const commas = (firstLine.match(/,/g) || []).length;
        const semis = (firstLine.match(/;/g) || []).length;
        const fs = semis > commas ? ";" : ",";
        workbook = XLSX.read(text, { type: "string", raw: false, FS: fs });
    } else {
        workbook = XLSX.read(buf, { type: "array", raw: false });
    }

    if (!workbook.SheetNames.length) {
        throw new Error("File tidak berisi sheet.");
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
    });

    if (!jsonRows.length) {
        return { rows: [], matchedHeaders: 0 };
    }

    const excelToField = buildExcelKeyToField(jsonRows[0]);
    const matchedHeaders = excelToField.size;
    if (matchedHeaders === 0) {
        throw new Error(
            "Header tidak dikenali. Pastikan kolom berisi: Tanggal, Deskripsi Transaksi, Amount, Type, Catatan, UNKNOW, DIVISI/PIC."
        );
    }

    const rows = mapJsonRows(jsonRows, excelToField);
    return { rows, matchedHeaders };
}

/** @deprecated Prefer baca buffer saat pemilihan file, lalu parseRekeningKoranBuffer */
export async function parseRekeningKoranFile(file: File): Promise<{
    rows: RekeningKoranFields[];
    matchedHeaders: number;
}> {
    const buf = await file.arrayBuffer();
    return parseRekeningKoranBuffer(buf, file.name);
}
