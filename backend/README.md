# Roadtrip Genie

## Backend

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

Open http://127.0.0.1:8000/docs to explore the API. `GET /health` checks that the
backend is running, and `POST /generate` is implemented in
`backend/app/routes/itinerary.py`.

Copy `backend/backend/.env.example` to `backend/backend/.env` and set
`AI_KEY`, `AI_URL`, and `AI_MODEL` before calling the OpenAI service. Set
`GOOGLE_MAPS_API_KEY` to a server-side Google Maps Platform key with the Routes
API enabled; it is only read by the backend and must not be added to the React
frontend. `ROUTE_BUFFER_RATIO` (default `0.3`) adds an allowance for local
driving and detours, and `MAX_DAILY_DRIVING_HOURS` (default `8`) controls the
daily driving limit used for the feasibility check.

The `/generate` endpoint checks the outbound and return routes separately
before calling OpenAI. Infeasible trips return an HTTP 422 `detail` message;
the existing frontend displays this message in its planner error alert.

Google toll estimates are requested for both directions and are shown separately
from fuel. If Google reports tolls but has no price for either direction, the
toll cost is marked unavailable and excluded from the total rather than treated
as zero. Without a selected toll pass the Routes API returns cash pricing where
available; its toll computations have higher billing rates and coverage is
limited to supported locations. Google lists `IN_FASTAG` and
`IN_LOCAL_HP_PLATE_EXEMPT` among supported India toll passes, but this app does
not assume either because it does not ask users about pass or plate eligibility.
Cars use `DRIVE`; bikes use Google's beta `TWO_WHEELER` mode. Toll estimates are
for non-commercial vehicles, and Google does not expose a CNG emission category.

