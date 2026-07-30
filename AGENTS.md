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
   Edit `backend/.env` — set `JWT_SECRET_KEY` (string acak panjang).

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

4. **Jalankan server (dua terminal)**
   - Backend: `cd backend` → `.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
   - Frontend: `cd frontend` → `npm run dev -- --hostname 0.0.0.0 --port 3000`

5. **Akses**
   - Lokal: http://localhost:3000  
   - API docs: http://localhost:8000/docs  
   - LAN: http://`<IP-WiFi>`:3000 — pastikan `frontend/next.config.ts` → `allowedDevOrigins` berisi IP laptop tersebut.

## Yang SUDAH ada di Git (jangan recreate dari nol)

- Kode frontend/backend, routers, utils, Alembic migrations
- `backend/database.db` (data lokal yang di-track)
- Upload di `backend/uploads/` (termasuk file besar CSV/XLSX)
- Docs: `Ekstraksi_Heading_Kolom.md`, `proses take out data inbound.md`

## Konvensi penting project

- Frontend API default: `API_URL = "/api"` (Next.js rewrite ke `127.0.0.1:8000`) — lihat `frontend/src/config.ts` & `frontend/next.config.ts`.
- Jangan commit `backend/.env`, `.venv/`, `node_modules/`, `frontend/.next/`.
- Jangan commit kecuali user meminta; jika user minta push, exclude secrets & venv.
- All Inbound & CTC: filter UN INBOUND (Bagian A) lalu take out INBOUND melanjutkan filter A — lihat `proses take out data inbound.md`.
- UN RUNSHEET: pipeline di `backend/utils/un_runsheet.py`.

## Jika user bilang “jalankan / setup project”

AI harus: cek `.env` + venv + `node_modules` → buat yang kurang → start backend:8000 + frontend:3000 → verifikasi HTTP 200.
