from app.schemas.itinerary import TripRequest


def build_itinerary_prompt(trip_request: TripRequest) -> str:
    return (
        "Create a practical road-trip itinerary using the following trip details. "
        "Organize it by day and account for the travel group's preferences.\n\n"
        f"{trip_request.model_dump_json(indent=2)}"
    )
