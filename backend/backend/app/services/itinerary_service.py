from app.config import settings
from app.services.openai_service import generate_ai_response
from app.services.cost_calculator import calculate_fuel_cost, calculate_toll_cost
from app.services.feasibility_service import (
    assess_round_trip_feasibility,
    infeasible_trip_message,
)
from app.services.routes_service import compute_route


class InfeasibleTripError(Exception):
    """Raised when a round trip exceeds the driving time available."""


def generate_itinerary(request):
    # Routes are requested separately because road conditions can differ by direction.
    route_options = {
        "vehicle_type": request.vehicle.type,
        "fuel_type": request.vehicle.fuel_type,
    }
    outbound = compute_route(
        request.starting_location, request.destination, **route_options
    )
    return_route = compute_route(
        request.destination, request.starting_location, **route_options
    )
    assessment = assess_round_trip_feasibility(
        outbound_distance_km=outbound.distance_km,
        outbound_duration_seconds=outbound.duration_seconds,
        return_distance_km=return_route.distance_km,
        return_duration_seconds=return_route.duration_seconds,
        requested_days=request.days,
        route_buffer_ratio=settings.route_buffer_ratio,
        max_daily_driving_hours=settings.max_daily_driving_hours,
    )
    if not assessment.feasible:
        raise InfeasibleTripError(
            infeasible_trip_message(
                request.days,
                assessment,
                settings.route_buffer_ratio,
                settings.max_daily_driving_hours,
            )
        )

    # 1. Generate structured itinerary using AI
    itinerary = generate_ai_response(request)

    # 2. Calculate fuel and toll costs independently
    fuel_price = request.vehicle.fuel_price

    if fuel_price is not None:
        fuel_cost = calculate_fuel_cost(
            distance=itinerary.total_driving_distance_km,
            mileage=itinerary.vehicle.mileage,
            fuel_price=fuel_price
        )

        itinerary.cost_analysis.fuel_or_charging_cost = fuel_cost

    costs = itinerary.cost_analysis
    toll_cost = calculate_toll_cost(
        outbound.toll_estimate_inr,
        return_route.toll_estimate_inr,
    )
    costs.toll_cost = toll_cost
    if toll_cost is None:
        costs.assumptions.append(
            "Google Maps could not provide a toll price for one or both routes; tolls are not included in the estimated total."
        )
    costs.assumptions.append(
        "Toll estimates cover the outbound and return routes; sightseeing detours may add tolls."
    )
    if request.vehicle.type.strip().lower() in {"bike", "motorbike", "motorcycle"}:
        costs.assumptions.append(
            "Google Maps two-wheeler routes are in beta and may be incomplete."
        )

    costs.total_cost = (
        costs.fuel_or_charging_cost
        + costs.accommodation_cost
        + costs.food_cost
        + costs.activities_cost
        + costs.miscellaneous_cost
        + (toll_cost or 0)
    )

    return itinerary
