import re
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def parse_money(text: str) -> int:
    """
    Parse angka format invoice: 2.968.296,00 -> 2968296
    Toleran: Rp, spasi, titik, koma.
    """
    t = (text or "").strip()
    if not t:
        return 0
    t = t.replace("Rp.", "").replace("Rp", "")
    # ambil bagian sebelum koma desimal
    t = t.split(",")[0]
    t = re.sub(r"[^\d]", "", t)
    return int(t) if t else 0


def parse_date_en(text: str) -> Optional[datetime]:
    """
    Contoh: 05 February 2026
    """
    t = _clean(text)
    m = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", t)
    if not m:
        return None
    day = int(m.group(1))
    month_name = m.group(2).lower()
    year = int(m.group(3))
    month = MONTHS.get(month_name)
    if not month:
        return None
    try:
        return datetime(year, month, day)
    except Exception:
        return None


@dataclass
class ParsedInvoice:
    invoice_no: str
    invoice_date: datetime
    top_days: int
    periode: str
    billed_customer_id: str
    billed_customer_name: str
    billed_address: str
    billed_phone: str
    item_description: str
    item_amount: int
    summary: dict
    tax_info: dict


def parse_invoice_jne_text(text: str) -> ParsedInvoice:
    """
    Parser berbasis template invoice JNE seperti gambar user.
    Mengandalkan OCR text layer (hasil OCRmyPDF).
    """
    t = (text or "")
    # Normalisasi sederhana untuk memudahkan regex
    compact = re.sub(r"[ \t]+", " ", t)

    inv_no = _clean(
        (re.search(r"Invoice Number\s*:\s*([A-Z0-9/\-]+)", compact, re.I) or re.search(r"Invoice Number\s*([A-Z0-9/\-]+)", compact, re.I) or re.search(r"Invoice Number\s*\n?\s*([A-Z0-9/\-]+)", t, re.I))
        .group(1)
        if re.search(r"Invoice Number", t, re.I)
        else ""
    )
    if not inv_no:
        # fallback: cari token dengan pola XXX/XXX/.. panjang
        m = re.search(r"\b[A-Z]{2,}\/[A-Z0-9]+\/\d{8,}\/\d+\b", compact)
        inv_no = _clean(m.group(0)) if m else ""
    if not inv_no:
        raise ValueError("Invoice Number tidak terbaca dari PDF. Pastikan OCR berhasil.")

    invoice_date_str = _clean(
        (re.search(r"Invoice Date\s*:\s*([^\n\r]+)", t, re.I) or re.search(r"Invoice Date\s*([^\n\r]+)", t, re.I)).group(1)
        if re.search(r"Invoice Date", t, re.I)
        else ""
    )
    inv_date = parse_date_en(invoice_date_str) or datetime.utcnow()

    top_str = _clean(
        (re.search(r"\bTOP\s*:\s*(\d+)\s*Days?\b", t, re.I) or re.search(r"\bTOP\s*(\d+)\s*Days?\b", t, re.I)).group(1)
        if re.search(r"\bTOP\b", t, re.I)
        else "0"
    )
    top_days = int(re.sub(r"[^\d]", "", top_str) or 0)

    periode = _clean(
        (re.search(r"Periode\s*:\s*([^\n\r]+)", t, re.I) or re.search(r"Periode\s*([^\n\r]+)", t, re.I)).group(1)
        if re.search(r"Periode", t, re.I)
        else ""
    )

    # Billed to block
    cust_id = _clean((re.search(r"Customer ID\s*:\s*([0-9]+)", t, re.I) or re.search(r"Customer ID\s*([0-9]+)", t, re.I)).group(1))
    cust_name = _clean((re.search(r"Customer Name\s*:\s*([^\n\r]+)", t, re.I) or re.search(r"Customer Name\s*([^\n\r]+)", t, re.I)).group(1))
    address = _clean((re.search(r"\bAddress\s*:\s*([^\n\r]+)", t, re.I) or re.search(r"\bAddress\s*([^\n\r]+)", t, re.I)).group(1))
    phone = _clean((re.search(r"\bPhone\s*:\s*([0-9+\- ]+)", t, re.I) or re.search(r"\bPhone\s*([0-9+\- ]+)", t, re.I)).group(1))

    # Item: Ambil baris pertama setelah header table yang mengandung 'Description' dan amount
    # Heuristic: cari amount terbesar pertama dengan format 2.936.000,00 dekat kata "Description" / "pengiriman"
    item_desc = ""
    item_amount = 0
    m_amount = re.search(r"(\d{1,3}(?:\.\d{3})+,\d{2})", t)
    if m_amount:
        item_amount = parse_money(m_amount.group(1))
    # description: cari kata 'pengiriman' atau baris setelah 'Description'
    m_desc = re.search(r"\bDescription\b[\s\S]{0,200}\n?\s*\d+\s+([^\n\r]{5,120})", t, re.I)
    if m_desc:
        item_desc = _clean(m_desc.group(1))
    else:
        m_desc2 = re.search(r"(pengiriman[^\n\r]{5,120})", t, re.I)
        item_desc = _clean(m_desc2.group(1)) if m_desc2 else ""

    # Summary table values (fallback 0 jika gagal)
    def grab(label: str) -> int:
        mm = re.search(label + r"\s+Rp\.?\s*([0-9\.\,]+)", t, re.I)
        return parse_money(mm.group(1)) if mm else 0

    summary = {
        "gross_total": grab(r"Gross\s+Total"),
        "discount": grab(r"Discount"),
        "total_after_discount": grab(r"Total\s+After\s+Discount"),
        "tax_base": grab(r"Tax\s+Base"),
        "vat": grab(r"VAT"),
        "insurance": grab(r"Insurance"),
        "stamp": grab(r"Stamp"),
        "total_paid": grab(r"Total\s+Paid"),
        "be_regarded_as": _clean((re.search(r"Be\s+Regarded\s+As\s*:\s*([\s\S]{0,200})", t, re.I) or re.search(r"Be\s+Regarded\s+As\s*([\s\S]{0,200})", t, re.I)).group(1)) if re.search(r"Be\s+Regarded\s+As", t, re.I) else "",
    }

    tax_info = {
        "nomor_seri_faktur_pajak": _clean((re.search(r"Nomor\s+Seri\s+Faktur\s+Pajak\s*:?\s*([0-9]+)", t, re.I) or re.search(r"Nomor\s+Seri\s+Faktur\s+Pajak\s*\n\s*([0-9]+)", t, re.I)).group(1)) if re.search(r"Nomor\s+Seri\s+Faktur\s+Pajak", t, re.I) else "",
        "npwp_id": _clean((re.search(r"NPWP\s+ID\s*:?\s*([0-9\(\) ]+)", t, re.I) or re.search(r"NPWP\s+ID\s*\n\s*([0-9\(\) ]+)", t, re.I)).group(1)) if re.search(r"NPWP\s+ID", t, re.I) else "",
        "npwp_name": _clean((re.search(r"NPWP\s+Name\s*:?\s*([^\n\r]+)", t, re.I) or re.search(r"NPWP\s+Name\s*\n\s*([^\n\r]+)", t, re.I)).group(1)) if re.search(r"NPWP\s+Name", t, re.I) else "",
        "npwp_address": _clean((re.search(r"NPWP\s+Address\s*:?\s*([^\n\r]+)", t, re.I) or re.search(r"NPWP\s+Address\s*\n\s*([^\n\r]+)", t, re.I)).group(1)) if re.search(r"NPWP\s+Address", t, re.I) else "",
    }

    # Nominal total: prioritaskan total_paid, kalau tidak ada, pakai total_after_discount + vat
    if item_amount == 0 and summary["gross_total"]:
        item_amount = summary["gross_total"]

    return ParsedInvoice(
        invoice_no=inv_no,
        invoice_date=inv_date,
        top_days=top_days,
        periode=periode,
        billed_customer_id=cust_id,
        billed_customer_name=cust_name,
        billed_address=address,
        billed_phone=phone,
        item_description=item_desc or "—",
        item_amount=item_amount,
        summary=summary,
        tax_info=tax_info,
    )

