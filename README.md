# BPS JNE Dashboard

Monorepo dashboard operasional JNE (FastAPI + Next.js).

## Untuk developer / AI Agent

**Baca dulu:** [AGENTS.md](./AGENTS.md) — checklist setup setelah `git clone` / `git pull` (venv, `.env`, `npm install`, cara menjalankan server).

File yang **tidak** ikut Git (harus disiapkan lokal): `.venv` / `venv`, `node_modules`, `backend/.env`.

## Quick start

```bash
# Backend
cd backend
copy .env.example .env
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (terminal lain)
cd frontend
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```

- App: http://localhost:3000  
- API docs: http://localhost:8000/docs
