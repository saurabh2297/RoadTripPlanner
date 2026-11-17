from fastapi import APIRouter
from app.schemas.itinerary import TripRequest
from app.schemas.itinerary_response import TripResponse
from app.services.itinerary_service import generate_itinerary

router = APIRouter()

@router.post("/generate", response_model=TripResponse)
def create_itinerary(request: TripRequest):

    result = generate_itinerary(request)

    return result