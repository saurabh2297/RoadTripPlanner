from fastapi import APIRouter, HTTPException
from app.schemas.itinerary import TripRequest
from app.schemas.itinerary_response import TripResponse
from app.services.itinerary_service import InfeasibleTripError, generate_itinerary
from app.services.routes_service import (
    InvalidRouteError,
    RoutesAPIConfigurationError,
    RoutesServiceError,
    RoutesTimeoutError,
)

router = APIRouter()

@router.post("/generate", response_model=TripResponse)
def create_itinerary(request: TripRequest):
    try:
        return generate_itinerary(request)
    except InfeasibleTripError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except InvalidRouteError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RoutesTimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail="Google Maps did not respond in time. Please try again.",
        ) from exc
    except RoutesAPIConfigurationError as exc:
        raise HTTPException(
            status_code=503,
            detail="Google Maps route calculation is not configured on the server.",
        ) from exc
    except RoutesServiceError as exc:
        raise HTTPException(
            status_code=502,
            detail="Google Maps could not calculate the trip route. Please try again later.",
        ) from exc