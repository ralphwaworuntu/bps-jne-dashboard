export type CabangAgenEntityType = "Cabang" | "Agen";

export type CabangAgenRecord = {
    id: string;
    tipe: CabangAgenEntityType;
    nama: string;
    owner: string;
    bank: string;
    noRekening: string;
    namaPemilikRekening: string;
};

export const CABANG_AGEN_STORAGE_KEY = "alc-data-cabang-agen";

export function loadCabangAgenRecords(): CabangAgenRecord[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(CABANG_AGEN_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as CabangAgenRecord[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveCabangAgenRecords(records: CabangAgenRecord[]) {
    localStorage.setItem(CABANG_AGEN_STORAGE_KEY, JSON.stringify(records));
}
