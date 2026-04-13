from datetime import datetime, timedelta

import os
import shutil
import uuid
from pathlib import Path
import importlib.util as importlib_util

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, select

from auth import get_current_active_user
from database import get_session
from models import (
    User,
    SalesInvoice,
    SalesInvoiceItem,
    SalesInvoiceSummary,
    SalesInvoiceTaxInfo,
    SalesInvoiceRead,
    SalesInvoiceItemRead,
    SalesInvoiceSummaryRead,
    SalesInvoiceTaxInfoRead,
)
from utils.invoice_pdf_parser import parse_invoice_jne_text

UPLOAD_DIR = Path("uploads/sales/invoices")
RAW_DIR = UPLOAD_DIR / "raw"
OCR_DIR = UPLOAD_DIR / "ocr"
RAW_DIR.mkdir(parents=True, exist_ok=True)
OCR_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/sales", tags=["sales"])


def _seed_if_empty(session: Session):
    # Seed 1 invoice demo agar halaman langsung bisa dites
    existing = session.exec(select(SalesInvoice).limit(1)).first()
    if existing:
        return
    inv = SalesInvoice(
        invoice_no="INV-2026-0001",
        # sesuai gambar
        invoice_date=datetime(2026, 2, 5),
        top_days=14,
        periode="01 January 2026 s/d 31 January 2026",
        billed_customer_id="10938000",
        billed_customer_name="HANNA PUTRI AYU CV",
        billed_address="JL. TOMPELLO NO 18 RT 003 RW 001",
        billed_phone="08123256131",
        nominal_total=2968296,
    )
    session.add(inv)
    session.commit()
    session.refresh(inv)
    items = [
        SalesInvoiceItem(
            invoice_id=inv.id,
            line_no=1,
            description="pengiriman reguler periode januari 2026",
            amount=2936000,
        ),
    ]
    for it in items:
        session.add(it)
    session.commit()

    summary = SalesInvoiceSummary(
        invoice_id=inv.id,
        gross_total=2936000,
        discount=0,
        total_after_discount=2936000,
        tax_base=2936000,
        vat=32296,
        insurance=0,
        stamp=0,
        total_paid=2968296,
        be_regarded_as="dua juta sembilan ratus enam puluh delapan ribu dua ratus sembilan puluh enam Rupiah",
    )
    session.add(summary)
    session.commit()

    tax = SalesInvoiceTaxInfo(
        invoice_id=inv.id,
        nomor_seri_faktur_pajak="05002600029344412",
        npwp_id="0720147313922000 (000000)",
        npwp_name="CV. HANNA PUTRI AYU",
        npwp_address="JL. TOMPELLO NO.18 RT 003 RW 001. KEL. OETETE KEC. OEBOBO. KOTA KUPANG",
    )
    session.add(tax)
    session.commit()


@router.get("/invoice/{invoice_no}", response_model=SalesInvoiceRead)
def get_invoice(
    invoice_no: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    _seed_if_empty(session)

    no = (invoice_no or "").strip()
    if not no:
        raise HTTPException(status_code=400, detail="Nomor invoice wajib diisi")

    inv = session.exec(select(SalesInvoice).where(SalesInvoice.invoice_no == no)).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")

    items = session.exec(
        select(SalesInvoiceItem).where(SalesInvoiceItem.invoice_id == inv.id).order_by(SalesInvoiceItem.line_no.asc())
    ).all()
    summary = session.exec(
        select(SalesInvoiceSummary).where(SalesInvoiceSummary.invoice_id == inv.id)
    ).first()
    if not summary:
        # fallback ringkasan dari nominal_total jika summary belum ada
        summary = SalesInvoiceSummary(
            invoice_id=inv.id,
            gross_total=inv.nominal_total,
            discount=0,
            total_after_discount=inv.nominal_total,
            tax_base=inv.nominal_total,
            vat=0,
            insurance=0,
            stamp=0,
            total_paid=0,
            be_regarded_as="",
        )
        session.add(summary)
        session.commit()
        session.refresh(summary)
    due_date = inv.invoice_date + timedelta(days=int(inv.top_days or 0))
    tax = session.exec(select(SalesInvoiceTaxInfo).where(SalesInvoiceTaxInfo.invoice_id == inv.id)).first()
    if not tax:
        tax = SalesInvoiceTaxInfo(invoice_id=inv.id)
        session.add(tax)
        session.commit()
        session.refresh(tax)
    payment_status = "Lunas" if int(summary.total_paid or 0) >= int(summary.total_after_discount or inv.nominal_total) else "Belum Lunas"
    return SalesInvoiceRead(
        invoice_no=inv.invoice_no,
        nominal_total=inv.nominal_total,
        invoice_date=inv.invoice_date,
        top_days=inv.top_days,
        due_date=due_date,
        periode=inv.periode,
        billed_to={
            "customer_id": inv.billed_customer_id,
            "customer_name": inv.billed_customer_name,
            "address": inv.billed_address,
            "phone": inv.billed_phone,
        },
        items=[
            SalesInvoiceItemRead(no=it.line_no, description=it.description, amount=it.amount) for it in items
        ],
        summary=SalesInvoiceSummaryRead(
            gross_total=summary.gross_total,
            discount=summary.discount,
            total_after_discount=summary.total_after_discount,
            tax_base=summary.tax_base,
            vat=summary.vat,
            insurance=summary.insurance,
            stamp=summary.stamp,
            total_paid=summary.total_paid,
            be_regarded_as=summary.be_regarded_as or "",
        ),
        tax_info=SalesInvoiceTaxInfoRead(
            nomor_seri_faktur_pajak=tax.nomor_seri_faktur_pajak or "",
            npwp_id=tax.npwp_id or "",
            npwp_name=tax.npwp_name or "",
            npwp_address=tax.npwp_address or "",
        ),
        payment_status=payment_status,
    )


@router.post("/invoice/upload-pdf", response_model=SalesInvoiceRead)
async def upload_invoice_pdf(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File harus PDF")

    # Simpan raw upload
    safe_name = os.path.basename(file.filename).replace(" ", "_")
    raw_path = RAW_DIR / f"{uuid.uuid4().hex}_{safe_name}"
    try:
        with open(raw_path, "wb") as out:
            shutil.copyfileobj(file.file, out)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal simpan file: {e!s}") from e

    # OCR (wajib untuk scan)
    ocr_path = OCR_DIR / raw_path.name
    sidecar_txt = OCR_DIR / (raw_path.stem + ".txt")
    try:
        # Pastikan modul OCR tersedia di python interpreter backend aktif
        if importlib_util.find_spec("ocrmypdf") is None:
            raise HTTPException(
                status_code=500,
                detail=(
                    "OCR engine belum terpasang di environment backend aktif "
                    "(module 'ocrmypdf' tidak ditemukan). "
                    "Install dependency di venv backend lalu restart backend."
                ),
            )
        import ocrmypdf
        import shutil as _shutil

        # Fallback path Tesseract untuk Windows jika PATH proses backend belum ter-refresh
        if _shutil.which("tesseract") is None:
            default_tesseract = r"C:\Program Files\Tesseract-OCR"
            if os.path.exists(os.path.join(default_tesseract, "tesseract.exe")):
                os.environ["PATH"] = default_tesseract + os.pathsep + os.environ.get("PATH", "")
                # Optional: hint tessdata explicit
                os.environ.setdefault("TESSDATA_PREFIX", os.path.join(default_tesseract, "tessdata"))

        if _shutil.which("tesseract") is None:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Tesseract OCR belum terdeteksi. "
                    "Pastikan tesseract.exe ada di PATH atau di C:\\Program Files\\Tesseract-OCR, "
                    "lalu restart backend."
                ),
            )

        # penting di Windows: guard ada di modul entrypoint, tetapi di server FastAPI ini aman (single process)
        ocrmypdf.ocr(
            str(raw_path),
            str(ocr_path),
            language=["ind", "eng"],
            rotate_pages=True,
            deskew=True,
            remove_background=False,
            skip_text=True,
            sidecar=str(sidecar_txt),
            optimize=0,
        )
    except ModuleNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="OCR engine belum terpasang. Install ocrmypdf + Tesseract terlebih dulu.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR gagal: {e!s}") from e

    # Ambil teks hasil OCR
    text = ""
    try:
        if sidecar_txt.exists():
            text = sidecar_txt.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        text = ""

    if not text.strip():
        # fallback: extract text dari PDF OCR memakai pypdf
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(ocr_path))
            chunks = []
            for p in reader.pages:
                chunks.append(p.extract_text() or "")
            text = "\n".join(chunks)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal ekstrak teks dari PDF OCR: {e!s}") from e

    parsed = parse_invoice_jne_text(text)

    # Upsert: berdasarkan invoice_no
    inv = session.exec(select(SalesInvoice).where(SalesInvoice.invoice_no == parsed.invoice_no)).first()
    if not inv:
        inv = SalesInvoice(
            invoice_no=parsed.invoice_no,
            invoice_date=parsed.invoice_date,
            top_days=parsed.top_days,
            periode=parsed.periode,
            billed_customer_id=parsed.billed_customer_id,
            billed_customer_name=parsed.billed_customer_name,
            billed_address=parsed.billed_address,
            billed_phone=parsed.billed_phone,
            nominal_total=int(parsed.summary.get("total_paid") or 0) or int(parsed.summary.get("total_after_discount") or 0),
        )
        session.add(inv)
        session.commit()
        session.refresh(inv)
    else:
        inv.invoice_date = parsed.invoice_date
        inv.top_days = parsed.top_days
        inv.periode = parsed.periode
        inv.billed_customer_id = parsed.billed_customer_id
        inv.billed_customer_name = parsed.billed_customer_name
        inv.billed_address = parsed.billed_address
        inv.billed_phone = parsed.billed_phone
        inv.nominal_total = int(parsed.summary.get("total_paid") or 0) or int(parsed.summary.get("total_after_discount") or 0)
        session.add(inv)
        session.commit()

    # Replace items (template biasanya 1 item, tapi tetap generik)
    old_items = session.exec(select(SalesInvoiceItem).where(SalesInvoiceItem.invoice_id == inv.id)).all()
    for it in old_items:
        session.delete(it)
    session.commit()
    session.add(
        SalesInvoiceItem(
            invoice_id=inv.id,
            line_no=1,
            description=parsed.item_description,
            amount=int(parsed.item_amount),
        )
    )
    session.commit()

    # Upsert summary
    s = session.exec(select(SalesInvoiceSummary).where(SalesInvoiceSummary.invoice_id == inv.id)).first()
    if not s:
        s = SalesInvoiceSummary(invoice_id=inv.id, gross_total=0, total_after_discount=0, tax_base=0)
        session.add(s)
        session.commit()
        session.refresh(s)
    s.gross_total = int(parsed.summary.get("gross_total") or 0)
    s.discount = int(parsed.summary.get("discount") or 0)
    s.total_after_discount = int(parsed.summary.get("total_after_discount") or 0)
    s.tax_base = int(parsed.summary.get("tax_base") or 0)
    s.vat = int(parsed.summary.get("vat") or 0)
    s.insurance = int(parsed.summary.get("insurance") or 0)
    s.stamp = int(parsed.summary.get("stamp") or 0)
    s.total_paid = int(parsed.summary.get("total_paid") or 0)
    s.be_regarded_as = parsed.summary.get("be_regarded_as") or ""
    session.add(s)
    session.commit()
    session.refresh(s)

    # Upsert tax info
    tax = session.exec(select(SalesInvoiceTaxInfo).where(SalesInvoiceTaxInfo.invoice_id == inv.id)).first()
    if not tax:
        tax = SalesInvoiceTaxInfo(invoice_id=inv.id)
        session.add(tax)
        session.commit()
        session.refresh(tax)
    tax.nomor_seri_faktur_pajak = parsed.tax_info.get("nomor_seri_faktur_pajak") or ""
    tax.npwp_id = parsed.tax_info.get("npwp_id") or ""
    tax.npwp_name = parsed.tax_info.get("npwp_name") or ""
    tax.npwp_address = parsed.tax_info.get("npwp_address") or ""
    session.add(tax)
    session.commit()

    # return detail terbaru
    return get_invoice(parsed.invoice_no, session=session, current_user=current_user)

