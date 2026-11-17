# Roadtrip Genie

## Backend

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

Open http://127.0.0.1:8000/docs to explore the API. `GET /health` checks that the
backend is running, and `POST /generate` is implemented in
`backend/app/routes/itinerary.py`.

Set `AI_KEY`, `AI_URL`, and `AI_MODEL` in `backend/.env` before calling the
OpenAI service.

