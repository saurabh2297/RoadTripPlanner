from fastapi import FastAPI

from app.routes.itinerary import router as itinerary_router

app = FastAPI(title="Roadtrip Genie API")
app.include_router(itinerary_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}