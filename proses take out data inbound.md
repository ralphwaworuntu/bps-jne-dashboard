# Proses Take Out Data INBOUND (All Inbound & CTC)

Dokumen ini menjelaskan secara detail alur pengolahan data pada halaman  
**All Inbound & CTC** (`/dashboard/v2/lastmile/all-shipment/all-inbound-ctc`), khususnya:

1. Bagaimana data **disalin (duplikat)** ke tabel **UN INBOUND** (Bagian A)
2. Bagaimana data **dihapus (take out)** dari tabel **INBOUND** dengan **melanjutkan** filter Bagian A — **tanpa clear filter** (Bagian B)

Implementasi ada di `backend/utils/ctc_inbound.py`:
- `_un_inbound_mask()` → mask filter Bagian A (dipakai bersama)
- `filter_un_inbound_rows()` → tampilan **UN INBOUND** (copy)
- `filter_inbound_rows_after_un_inbound()` → tampilan **INBOUND** (take out lanjutan)

---

## Prinsip penting

- Proses dijalankan **saat membaca/menampilkan data**, bukan menghapus file sumber di disk.
- File upload APEX tetap utuh; yang berubah hanya **view** tabel di UI (dan export XLSX sesuai view).
- Filter dijalankan **1 per 1 dari atas, tidak boleh lompat**.
- **Bagian B tidak mulai ulang dari seluruh dataset.** Setelah copy ke UN INBOUND, filter Bagian A **tetap aktif**, lalu langsung dilanjutkan aturan take out.

```text
Upload APEX
   → Enrichment rumus CTC
   → Simpan file periode
        │
        ├─ View UN INBOUND
        │     → Bagian A saja (copy subset)
        │
        └─ View INBOUND
              → Bagian A (filter tetap aktif)
              → lanjut Bagian B (take out pada subset A)
              → hasil = seluruh data − baris yang dihapus di B
```

---

## Bagian A — Copy data ke tabel UN INBOUND

Fungsi: `filter_un_inbound_rows(df)` (mask: `_un_inbound_mask`)

Tujuan: memilih baris yang memenuhi **semua** kriteria berikut, lalu menampilkannya di tabel **UN INBOUND**.  
Baris ini **diduplikasikan** ke view UN INBOUND (sumber file tidak dihapus).

### Filter berurutan (semua harus lolos)

| Urutan | Kolom | Aturan | Arti |
|--------|--------|--------|------|
| 1 | `INBOUND_MANIFEST_DATE` | harus **Kosong (Blank)** | Belum ada inbound manifest date |
| 2 | `MANIFEST_TRANSIT_AGEN` | harus **Kosong (Blank)** | Belum ada MTS / transit agen |
| 3 | `SERVICE` | **tidak** berawalan `CTC` | Bukan layanan CTC* |

Hanya baris yang lolos ketiga filter (AND) yang masuk tabel UN INBOUND.

### Contoh singkat

| AWB | INBOUND_MANIFEST_DATE | MANIFEST_TRANSIT_AGEN | SERVICE | ORIGIN | Masuk UN INBOUND? |
|-----|------------------------|------------------------|---------|--------|-------------------|
| 1 | *(blank)* | *(blank)* | REG | CGK | Ya |
| 2 | 2026-07-01 | *(blank)* | REG | CGK | Tidak (IMD terisi) |
| 3 | *(blank)* | *(blank)* | CTC001 | CGK | Tidak (SERVICE CTC*) |
| 4 | *(blank)* | *(blank)* | REG | KOE01 | Ya (ORIGIN KOE* diizinkan) |

---

## Bagian B — Take out INBOUND (lanjutan Bagian A, tanpa clear filter)

Fungsi: `filter_inbound_rows_after_un_inbound(df)`

### Inti revisi

| Salah (lama) | Benar (sekarang) |
|--------------|------------------|
| Bagian B mulai dari **seluruh** baris, filter `RUNSHEET_NO` ≠ KOE* dari awal | Bagian B **melanjutkan** subset hasil Bagian A |
| Baris di luar UN INBOUND bisa ikut terhapus jika kena aturan B | Hanya baris yang sudah lolos Bagian A yang bisa di-take out |
| Seolah “clear filter lalu mulai proses baru” | Seperti Excel: **copy → jangan clear filter → lanjut hapus** |

### Cara kerja

1. **Kandidat awal take out = mask Bagian A** (filter A masih aktif).
2. Sempitkan / hapus bertahap dengan aturan Bagian B (langkah 1–5 di bawah).
3. Setiap kali baris langsung dihapus, baris itu keluar dari kandidat berikutnya.
4. Di akhir, sisa kandidat dihapus semua.
5. View INBOUND akhir = **seluruh baris sumber − baris yang masuk `delete_mask`**.

Baris yang **tidak** lolos Bagian A **tidak pernah** masuk kandidat take out → **tetap di INBOUND**.

### Langkah detail (lanjutan setelah A)

#### Prasyarat — Filter Bagian A tetap aktif

Kandidat = baris yang sudah:
- `INBOUND_MANIFEST_DATE` blank  
- `MANIFEST_TRANSIT_AGEN` blank  
- `SERVICE` bukan CTC*  

#### Langkah 1 — Sempitkan: `RUNSHEET_NO` tidak berawalan KOE

- Scope: kandidat Bagian A
- Keep di jalur take out: `RUNSHEET_NO` **tidak** berawalan `KOE` (termasuk blank)
- Baris A dengan `RUNSHEET_NO` berawalan `KOE` → **keluar kandidat** → **tetap di INBOUND** (meski tetap bisa ada di UN INBOUND sebagai copy)

#### Langkah 2 — Hapus jika `OUTBOUND_MANIFEST` kosong

- Scope: sisa kandidat langkah 1
- Jika `OUTBOUND_MANIFEST` **Blank** → **langsung hapus** dari INBOUND

#### Langkah 3 — Hapus jika `HOLD_REASON` ada isinya

- Scope: sisa kandidat setelah langkah 2
- Jika `HOLD_REASON` **tidak blank** → **langsung hapus**

#### Langkah 4 — Sempitkan berdasarkan cabang

- Scope: sisa kandidat setelah langkah 3
- Whitelist (keluar kandidat, **tidak** dihapus lewat jalur ini):
  - `KOTA KUPANG`
  - `TAMBOLAKA`
  - `WAINGAPU`
- Kandidat yang tetap = cabang **selain** whitelist

#### Langkah 5 — Hapus semua sisa kandidat

- Sisa kandidat setelah langkah 4 → **hapus semua** dari INBOUND

### Ringkasan keputusan

| Kondisi | Aksi di INBOUND |
|---------|-----------------|
| Tidak lolos Bagian A | **Tetap** (di luar proses take out) |
| Lolos A + `RUNSHEET_NO` berawalan `KOE` | **Tetap** (keluar kandidat B langkah 1) |
| Lolos A + RUNSHEET ≠ KOE* + OM blank | **Dihapus** |
| Lolos A + RUNSHEET ≠ KOE* + HOLD_REASON terisi | **Dihapus** |
| Lolos A + RUNSHEET ≠ KOE* + cabang bukan whitelist | **Dihapus** |
| Lolos A + RUNSHEET ≠ KOE* + cabang whitelist (setelah lolos OM/HOLD) | **Tetap** |

### Contoh alur (semua baris di bawah diasumsikan sudah lolos Bagian A, kecuali baris Z)

| AWB | Lolos A? | RUNSHEET_NO | OUTBOUND_MANIFEST | HOLD_REASON | CABANG BY CODING DEST | Hasil INBOUND |
|-----|----------|-------------|-------------------|-------------|------------------------|---------------|
| Z | Tidak | ABC99 | *(blank)* | | SOE | **Tetap** (bukan kandidat; di luar A) |
| A | Ya | KOE123 | *(bebas)* | *(bebas)* | SOE | **Tetap** (RUNSHEET KOE*) |
| B | Ya | ABC99 | *(blank)* | | SOE | **Dihapus** (langkah 2) |
| C | Ya | ABC99 | OM001 | HOLD-X | SOE | **Dihapus** (langkah 3) |
| D | Ya | ABC99 | OM001 | *(blank)* | SOE | **Dihapus** (langkah 4–5) |
| E | Ya | ABC99 | OM001 | *(blank)* | KOTA KUPANG | **Tetap** (whitelist) |

Catatan: AWB B/C/D/E tetap bisa muncul di tabel **UN INBOUND** (hasil copy Bagian A), meskipun sebagian sudah di-take out dari view **INBOUND**.

---

## Hubungan UN INBOUND vs Take Out INBOUND

| Aspek | UN INBOUND | Take Out INBOUND |
|--------|------------|------------------|
| Basis filter | Bagian A saja | Bagian A → lanjut Bagian B (satu rangkaian) |
| Clear filter di antara A dan B? | — | **Tidak** |
| Efek ke sumber file | Tidak | Tidak |
| Siapa yang bisa dihapus dari INBOUND? | — | Hanya subset yang lolos A lalu kena aturan B |

---

## Di mana dipanggil

Pada `list_ctc_detail(...)`:

- `kind=un_inbound` → `filter_un_inbound_rows(df)`
- `kind=inbound` (default) → `filter_inbound_rows_after_un_inbound(df)`

Export XLSX all data mengikuti `kind` yang sama.

---

## Catatan teknis implementasi

- Mask Bagian A diekstrak ke `_un_inbound_mask()` agar A (copy) dan B (take out) memakai kriteria yang sama.
- Pengecekan blank: string kosong setelah trim.
- Prefix `KOE` / `CTC`: case-insensitive.
- Whitelist cabang: `KOTA KUPANG`, `TAMBOLAKA`, `WAINGAPU` (case-insensitive).
- Proses harian dan bulanan memakai logika filter yang sama; yang berbeda hanya sumber periode data.

---

## Referensi kode

- `backend/utils/ctc_inbound.py`
  - `_un_inbound_mask`
  - `filter_un_inbound_rows`
  - `filter_inbound_rows_after_un_inbound`
  - `list_ctc_detail`
- Halaman UI: `frontend/src/app/dashboard/v2/lastmile/all-shipment/all-inbound-ctc/page.tsx`
