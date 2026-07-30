/** Konversi angka ke terbilang Bahasa Indonesia (untuk nominal transfer). */
export function terbilangId(raw: string | number): string {
    const digits = String(raw).replace(/[^\d]/g, "");
    if (!digits) return "";

    const n = Number(digits);
    if (!Number.isFinite(n) || n < 0) return "";
    if (n === 0) return "Nol Rupiah";

    const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan"];
    const belasan = [
        "Sepuluh",
        "Sebelas",
        "Dua Belas",
        "Tiga Belas",
        "Empat Belas",
        "Lima Belas",
        "Enam Belas",
        "Tujuh Belas",
        "Delapan Belas",
        "Sembilan Belas",
    ];

    const belowThousand = (num: number): string => {
        if (num === 0) return "";
        if (num < 10) return satuan[num];
        if (num < 20) return belasan[num - 10];
        if (num < 100) {
            const puluh = Math.floor(num / 10);
            const sisa = num % 10;
            return `${satuan[puluh]} Puluh${sisa ? ` ${satuan[sisa]}` : ""}`.trim();
        }
        if (num < 200) {
            const sisa = num % 100;
            return `Seratus${sisa ? ` ${belowThousand(sisa)}` : ""}`.trim();
        }
        const ratus = Math.floor(num / 100);
        const sisa = num % 100;
        return `${satuan[ratus]} Ratus${sisa ? ` ${belowThousand(sisa)}` : ""}`.trim();
    };

    const scales = [
        { value: 1_000_000_000_000, label: "Triliun" },
        { value: 1_000_000_000, label: "Miliar" },
        { value: 1_000_000, label: "Juta" },
        { value: 1_000, label: "Ribu" },
    ];

    let remaining = n;
    const parts: string[] = [];

    for (const scale of scales) {
        if (remaining >= scale.value) {
            const count = Math.floor(remaining / scale.value);
            remaining %= scale.value;
            if (scale.label === "Ribu" && count === 1) {
                parts.push("Seribu");
            } else {
                parts.push(`${belowThousand(count)} ${scale.label}`);
            }
        }
    }

    if (remaining > 0) parts.push(belowThousand(remaining));

    return `${parts.join(" ").replace(/\s+/g, " ").trim()} Rupiah`;
}

export function formatNominalInput(raw: string): string {
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("id-ID");
}

export function parseNominalDigits(raw: string): string {
    return raw.replace(/[^\d]/g, "");
}
