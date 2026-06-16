# AI HR Scanner Backend MVP

Backend MVP local cho tool AI hỗ trợ HR scan CV, evaluate CV theo JD và generate feedback.

## Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Gemini API
- Local filesystem storage
- React + Vite + TypeScript frontend

## Features

- Tạo Job/JD
- Parse JD bằng Gemini thành requirement JSON
- Upload CV PDF/DOCX cho từng job
- Lưu file CV local tại `uploads/cvs/{candidate_id}/{original_filename}`
- Extract text từ CV
- Parse CV bằng Gemini thành structured JSON
- Rule-based scoring chạy hoàn toàn ở backend
- Gemini chỉ generate feedback, risks, summary, interview questions
- Swagger docs tại `/docs`
- Frontend riêng tại `frontend/` để review jobs, candidates và evaluation UI

## Project structure

```text
app/
  main.py
  core/
    config.py
    database.py
  models/
    job.py
    candidate.py
    evaluation.py
  schemas/
    job.py
    candidate.py
    evaluation.py
  api/
    routes/
      jobs.py
      candidates.py
  services/
    gemini_service.py
    cv_parser_service.py
    scoring_service.py
    storage_service.py
  repositories/
    job_repository.py
    candidate_repository.py
    evaluation_repository.py
  utils/
    exceptions.py
alembic/
requirements.txt
.env.example
README.md
```

## Setup

1. Tạo virtual environment

```powershell
python -m venv .venv
```

2. Kích hoạt virtual environment

```powershell
.venv\Scripts\Activate.ps1
```

3. Cài dependencies

```powershell
pip install -r requirements.txt
```

4. Tạo PostgreSQL database

```sql
CREATE DATABASE ai_hr_scanner;
```

5. Copy file env

```powershell
Copy-Item .env.example .env
```

6. Cập nhật giá trị trong `.env`

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `LOCAL_UPLOAD_DIR`

7. Chạy migration

```powershell
alembic upgrade head
```

8. Run backend server

```powershell
uvicorn app.main:app --reload
```

9. Run frontend

```powershell
cd frontend
npm install
npm run dev
```

## One-click start

The repo is standardized around one start script and one stop script.

Start:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Stop:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop.ps1
```

If you want real Gemini parsing instead of demo-only seeded data:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1 -GeminiApiKey "your_real_key"
```

This Docker-based flow starts PostgreSQL and the app stack with a clean database and opens the UI at `http://127.0.0.1:8000/`.

See [DEMO_QUICKSTART.md](DEMO_QUICKSTART.md) for the short version and [USER_GUIDE.md](USER_GUIDE.md) for the full usage guide.

## API summary

- `POST /jobs`
- `GET /jobs`
- `GET /jobs/{job_id}`
- `POST /jobs/{job_id}/candidates`
- `GET /jobs/{job_id}/candidates`
- `GET /candidates/{candidate_id}`
- `GET /candidates/{candidate_id}/file`

## Example curl commands

### Create job

```bash
curl -X POST "http://127.0.0.1:8000/jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Frontend Developer (Angular)",
    "description": "Can ung vien co Angular, TypeScript, RxJS, HTML/CSS, toi thieu 3 nam kinh nghiem, uu tien Docker, domain fintech.",
    "default_weights": {
      "experience_weight": 20,
      "domain_weight": 10
    }
  }'
```

### List jobs

```bash
curl "http://127.0.0.1:8000/jobs"
```

### Job detail

```bash
curl "http://127.0.0.1:8000/jobs/{job_id}"
```

### Upload candidate CV

```bash
curl -X POST "http://127.0.0.1:8000/jobs/{job_id}/candidates" \
  -F "file=@E:/cv/nguyen-van-a.pdf"
```

### List candidates by job

```bash
curl "http://127.0.0.1:8000/jobs/{job_id}/candidates"
```

### Candidate detail

```bash
curl "http://127.0.0.1:8000/candidates/{candidate_id}"
```

### Download candidate file

```bash
curl -L "http://127.0.0.1:8000/candidates/{candidate_id}/file" --output candidate_cv.pdf
```

## Notes

- MVP này xử lý sync để giữ luồng đơn giản.
- Chưa hỗ trợ OCR.
- Chưa dùng cloud storage, Celery, embeddings, fine-tuning hoặc multi-tenant.
- Quyết định tuyển dụng vẫn thuộc về HR, AI chỉ đóng vai trò hỗ trợ.
- Frontend dev server mặc định chạy ở `http://127.0.0.1:5173`.
- Backend đã mở CORS cho `http://localhost:5173` và `http://127.0.0.1:5173`.
- If `frontend/dist` exists, FastAPI will serve the built UI directly at `/`.
