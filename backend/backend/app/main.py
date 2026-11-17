from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.itinerary import router as itinerary_router

app = FastAPI(title="Roadtrip Genie API")

# Allow requests from local frontend and deployed Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://road-trip-planner-ochre.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(itinerary_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}
