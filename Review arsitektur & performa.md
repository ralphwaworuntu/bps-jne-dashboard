# Review Arsitektur & Performa

Tanggal update: 2026-07-30  
Scope: backend FastAPI, frontend Next.js, fitur All Inbound & CTC, UN RUNSHEET, Report Firstmile, Daily Issue.

## Ringkasan Eksekutif

- Arsitektur backend sudah bergerak dari monolitik ke domain router (`ops`, `ops_master`, `daily_issue`, `finance`, dll), sehingga maintainability naik.
- Untuk data besar, performa sudah membaik karena:
  - pagination + server search di endpoint detail CTC,
  - virtualized table di frontend,
  - enrichment CTC tidak diulang saat read CTC.
- Proses bisnis kritikal sudah terkunci di kode:
  - take out INBOUND melanjutkan filter UN INBOUND (tanpa clear filter),
  - pipeline UN RUNSHEET 14 langkah.
- Risiko utama saat ini bukan di fitur, tetapi di operasional:
  - data upload besar masih ditrack di Git biasa (warning >50MB),
  - beberapa flow masih memory-bound untuk export/records besar,
  - akses LAN dev butuh update manual `allowedDevOrigins` saat IP berubah.

## Kondisi Arsitektur Saat Ini

## 1) Backend

- Entry point: `backend/main.py`
  - include router per domain.
  - startup menjalankan Alembic `upgrade head` + safety `create_db_and_tables()`.
  - CORS diizinkan untuk localhost + regex LAN `192.168.x.x`.
- Router operasional besar:
  - `backend/routers/ops.py`: upload, rows API, export, UN RUNSHEET, history upload, dll.
  - `backend/routers/ops_master.py`: master data kind + upload.
- Utility data pipeline:
  - `backend/utils/ctc_inbound.py` untuk parse/enrich/filter INBOUND/UN INBOUND/export.
  - `backend/utils/un_runsheet.py` untuk pipeline UN RUNSHEET dan pivot/detail.

## 2) Frontend

- Next.js App Router (halaman per modul dashboard).
- API call utama memakai `API_URL="/api"` dengan rewrite ke backend (`frontend/next.config.ts`).
- Akses LAN dev sudah disiapkan via:
  - `allowedDevOrigins`,
  - `npm run dev -- --hostname 0.0.0.0 --port 3000`.

## 3) Pola Data Besar (yang sudah diterapkan)

- Server-side pagination (`page`, `limit`) dan search (`q`) pada CTC.
- Virtualized table (`ShipmentRowsTable`) agar render tidak memuat semua baris sekaligus.
- Upload progress bar (XHR progress) untuk file besar.
- Export all data ke XLSX via endpoint khusus.

## Review Performa per Area

## A. All Inbound & CTC

Status saat ini:
- Endpoint rows: `/api/all-shipment/all-inbound-ctc/rows`
  - mendukung `period_mode`, `kind`, `page`, `limit`, `q`.
- Endpoint export: `/api/all-shipment/all-inbound-ctc/export-xlsx`.
- Frontend default page size: 1.000 baris.
- Label tabel sudah menampilkan `x baris dari y baris`.

Perbaikan bisnis yang sudah sinkron:
- Bagian A (UN INBOUND) dan Bagian B (take out INBOUND) kini konsisten:
  - take out INBOUND melanjutkan hasil filter A, bukan mulai ulang dari seluruh dataset.

Potensi bottleneck yang tersisa:
- `list_ctc_detail()` masih membentuk `records = view.to_dict(...)` sebelum paging.
  - Untuk ratusan ribu baris, ini tetap heavy RAM/CPU.
- `export_ctc_detail_xlsx()` membangun DataFrame full in-memory.
  - Aman untuk menengah, bisa berat untuk dataset sangat besar.

## B. UN RUNSHEET

Status saat ini:
- Endpoint:
  - upload `/api/all-shipment/un-runsheet/upload`
  - pivot `/api/all-shipment/un-runsheet/pivot`
  - rows `/api/all-shipment/un-runsheet/rows`
- Pipeline 14 langkah sudah dikodekan di `process_un_runsheet_pipeline()`.

Perhatian performa:
- `read_un_runsheet_frame()` masih memanggil `enrich_ctc_columns(df)` saat read.
  - Ini beda dengan CTC yang sudah skip enrich saat read.
  - Jika file UN RUNSHEET membesar, ini jadi hotspot.

## C. Daily Issue

Status saat ini:
- Form sudah support:
  - All Zona checkbox dan penyimpanan literal `ALL ZONA`,
  - tambahan divisi `PENERUSAN`,
  - input AWB token/chip style (space/comma/enter commit).

Risiko kecil:
- parsing/upload lampiran masih sinkron per request (normal untuk skala sekarang).

## D. Infrastruktur Git & Data

Status saat ini:
- Banyak file data besar (`backend/uploads/...`) sudah ada di repo dan berhasil di-push.
- GitHub memberi warning file >50MB (masih diterima, tapi tidak ideal untuk jangka panjang).

Risiko:
- Clone/pull makin berat.
- Riwayat repo cepat membesar.
- CI/CD (jika nanti dipasang) jadi lambat.

## Prioritas Rekomendasi (disesuaikan kondisi sekarang)

## Prioritas 1 (disarankan segera)

- Pindahkan file data besar ke mekanisme non-Git biasa:
  - minimal: stop tracking data harian yang sifatnya runtime,
  - ideal: storage terpisah atau Git LFS dengan policy jelas.
- Kurangi kerja full-memory di CTC rows:
  - lakukan filter/paging lebih awal sebelum `to_dict` penuh.

## Prioritas 2

- Samakan strategi UN RUNSHEET dengan CTC:
  - enrichment saat upload/save,
  - read tinggal load + canonicalize (tanpa enrich ulang).

## Prioritas 3

- Kurangi maintenance manual akses LAN dev:
  - otomatisasi `allowedDevOrigins` atau dokumentasi update IP yang lebih eksplisit saat startup.

## Checklist Validasi Cepat (Smoke)

- App:
  - `http://localhost:3000` 200
  - `http://localhost:8000/docs` 200
- CTC:
  - ubah page size, pindah page, search server, cek total rows.
  - export XLSX all data per `kind` dan periode.
- UN RUNSHEET:
  - upload 1 file harian, cek pivot LT IM/LT MTI dan detail rows.
- Daily Issue:
  - centang All Zona, submit, pastikan laporan menyimpan `ALL ZONA`.

## Kesimpulan

Secara fungsional, arsitektur saat ini sudah stabil dan fitur utama berjalan.  
Performa UI untuk data besar sudah jauh lebih baik dibanding sebelum pagination/virtualization/search.  
Fokus berikutnya paling berdampak adalah efisiensi backend memory path (rows/export) dan strategi penyimpanan file besar di luar Git biasa.

