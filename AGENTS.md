# AGENTS.md — panduan untuk AI Agent (Cursor / lainnya)

Baca file ini **sebelum** mengerjakan task setelah `git clone` atau `git pull` di laptop baru.

## Yang TIDAK ada di Git (wajib setup lokal)

| Item | Status di Git | Yang harus dilakukan AI/dev |
|------|---------------|------------------------------|
| `.venv/` / `backend/venv/` | Tidak di-push | Buat virtualenv + install `backend/requirements.txt` |
| `frontend/node_modules/` | Tidak di-push | Jalankan `npm install` di folder `frontend` |
| `backend/.env` | Tidak di-push (rahasia) | Salin dari `backend/.env.example` → `backend/.env`, isi `JWT_SECRET_KEY` |
| `__pycache__/`, `*.db-shm`, `*.db-wal` | Tidak penting | Abaikan; terbentuk otomatis |
| `main.py.pre_split_backup` | Tidak di-push | Abaikan; bukan bagian runtime |

## Checklist wajib setelah clone / pull

Kerjakan berurutan jika environment belum siap:

1. **Backend env**
   ```bash
   cd backend
   copy .env.example .env
   ```
   (PowerShell: `Copy-Item .env.example .env`)  
   Edit `backend/.env` — set `JWT_SECRET_KEY` (string acak panjang). Untuk Fase 3 lokal biarkan `DATABASE_URL` + `REDIS_URL` seperti di example.

2. **Backend dependencies**
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Fase 3 lokal — Postgres + Redis (Docker Desktop harus Running)**
   ```bash
   # dari root repo
   docker compose up -d
   ```
   Lalu siapkan schema + data (sekali, dari folder `backend`):
   ```bash
   cd backend
   # Schema: create_all + stamp (baseline Alembic adalah no-op untuk DB baru)
   .\venv\Scripts\python.exe -c "from database import create_db_and_tables; create_db_and_tables()"
   .\venv\Scripts\python.exe -m alembic stamp head
   .\venv\Scripts\python.exe scripts\migrate_sqlite_to_postgres.py
   ```
   Catatan: Postgres Docker dipublish di **host port 5433** (`5433:5432`) agar tidak bentrok dengan Postgres Windows lokal di 5432.
5. **Jalankan server (satu klik atau manual)**
   - **Satu klik:** double-click `start-local.bat` di root repo (atau jalankan `start-local.ps1`).  
     Skrip akan: `docker compose up -d` → buka 3 jendela (API :8000, Celery, Frontend :3000).
   - Manual:
     - Docker: biarkan `postgres` + `redis` tetap up (`docker compose up -d`)
     - Backend API: `cd backend` → `.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
     - Celery worker: `cd backend` → `.\venv\Scripts\celery.exe -A celery_app.celery worker --loglevel=INFO --pool=threads --concurrency=2`
     - Frontend: `cd frontend` → `npm run dev -- --hostname 0.0.0.0 --port 3000`

   Darurat tanpa Docker: hapus/komentari `DATABASE_URL` & set `USE_CELERY=0` di `.env` → kembali ke SQLite + antrian in-process.

6. **Akses**
   - Lokal: http://localhost:3000  
   - API docs: http://localhost:8000/docs  
   - LAN: http://`<IP-WiFi>`:3000 — pastikan `frontend/next.config.ts` → `allowedDevOrigins` berisi IP laptop tersebut.

## Yang SUDAH ada di Git (jangan recreate dari nol)

- Kode frontend/backend, routers, utils, Alembic migrations
- `backend/database.db` (data lokal yang di-track; sumber migrasi ke Postgres)
- `docker-compose.yml` (Postgres 16 + Redis 7 lokal)
- Upload di `backend/uploads/` (termasuk file besar CSV/XLSX)
- Docs: `Ekstraksi_Heading_Kolom.md`, `proses take out data inbound.md`

## Konvensi penting project

- Frontend API default: `API_URL = "/api"` (Next.js rewrite ke `127.0.0.1:8000`) — lihat `frontend/src/config.ts` & `frontend/next.config.ts`.
- Jangan commit `backend/.env`, `.venv/`, `node_modules/`, `frontend/.next/`.
- Jangan commit kecuali user meminta; jika user minta push, exclude secrets & venv.
- All Inbound & CTC: filter UN INBOUND (Bagian A) lalu take out INBOUND melanjutkan filter A — lihat `proses take out data inbound.md`.
- UN RUNSHEET: pipeline di `backend/utils/un_runsheet.py`.
- **Olah data besar (wajib):** upload lewat job async (`utils/process_jobs.py` + `GET /api/jobs/{id}`); UI progress via `frontend/src/lib/uploadJobProgress.ts`.
- **Hasil siap pakai (bake-once):** hitung sekali saat upload/job (enrich/pipeline/pivot), simpan CSV/cache; tampilan/export/pivot **baca hasil**, jangan VLOOKUP/formula ulang. Artifact utama:
  - CTC: `ctc_daily` / `ctc_monthly`
  - UN RUNSHEET: `{date}.csv` + `{date}.filtered.csv` + `{date}.pivot.json`
  - Inbound daily: `{date}.csv` + `{date}.pivot.json` (geo Coding NTT di-bake saat upload)
  - Kiriman YES: period CSV + `kiriman_yes.pivot.json`
  - Firstmile Report: `master_report_data.csv` (formula Master di-bake saat upload)
  - ALC Penjualan: `uploads/alc_penjualan/merged/{year}_{mm}.csv` (+ `.stats.json`)
- **Master Data berubah:** tidak cascade otomatis — upload ulang dataset terkait agar lookup ikut terbarui.
- **Fase 3 lokal:** Postgres (`DATABASE_URL`) + Redis (`REDIS_URL`) + Celery worker (`celery_app.py`); concurrency default 2; kontrak `job_id` tidak berubah.

## Graphify (hemat token AI)

Knowledge graph lokal di `graphify-out/` (AST code-only, tanpa API).

- Install CLI: `pip install --user graphifyy` → binary di `%APPDATA%\Python\Python314\Scripts\graphify.exe`
- Cursor rule: `.cursor/rules/graphify.mdc` (`alwaysApply`) — agent wajib `graphify query/path/explain` sebelum Grep/Read besar
- Bangun ulang: `graphify extract . --code-only`
- Update setelah ubah kode: `graphify update .`
- Ignore data besar: `.graphifyignore` (uploads, node_modules, xlsx/csv, dll.)
- Hook git: `graphify hook install` (rebuild ringan setelah commit)

## Jika user bilang “jalankan / setup project”

AI harus: cek `.env` + venv + `node_modules` + Docker (opsional Fase 3) → buat yang kurang → `docker compose up -d` jika Fase 3 → start backend:8000 + celery worker + frontend:3000 → verifikasi HTTP 200.
