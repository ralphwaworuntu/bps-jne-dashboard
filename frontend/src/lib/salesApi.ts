import { API_URL } from "@/config";

export type InvoiceItem = {
    no: number;
    description: string;
    amount: number;
};

export type InvoiceDetail = {
    invoice_no: string;
    nominal_total: number;
    invoice_date: string;
    top_days: number;
    due_date: string;
    periode: string;
    billed_to: {
        customer_id: string;
        customer_name: string;
        address: string;
        phone: string;
    };
    items: InvoiceItem[];
    summary: {
        gross_total: number;
        discount: number;
        total_after_discount: number;
        tax_base: number;
        vat: number;
        insurance: number;
        stamp: number;
        total_paid: number;
        be_regarded_as: string;
    };
    tax_info: {
        nomor_seri_faktur_pajak: string;
        npwp_id: string;
        npwp_name: string;
        npwp_address: string;
    };
    payment_status: "Lunas" | "Belum Lunas" | string;
};

async function parseError(res: Response): Promise<string> {
    try {
        const j = await res.json();
        if (typeof j?.detail === "string") return j.detail;
        return JSON.stringify(j);
    } catch {
        return res.statusText || "Request gagal";
    }
}

export async function fetchInvoiceByNo(token: string, invoiceNo: string): Promise<InvoiceDetail> {
    const res = await fetch(`${API_URL}/sales/invoice/${encodeURIComponent(invoiceNo)}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function uploadInvoicePdf(token: string, file: File): Promise<InvoiceDetail> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/sales/invoice/upload-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

