from app.services.openai_service import generate_ai_response
from app.services.cost_calculator import calculate_fuel_cost


def generate_itinerary(request):

    # 1. Generate structured itinerary using AI
    itinerary = generate_ai_response(request)

    # 2. Calculate fuel cost independently
    fuel_price = request.vehicle.fuel_price

    if fuel_price is not None:
        fuel_cost = calculate_fuel_cost(
            distance=itinerary.total_driving_distance_km,
            mileage=itinerary.vehicle.mileage,
            fuel_price=fuel_price
        )

        # 3. Update the AI-generated cost analysis
        itinerary.cost_analysis.fuel_or_charging_cost = fuel_cost

        # 4. Recalculate total cost
        costs = itinerary.cost_analysis

        costs.total_cost = (
            costs.fuel_or_charging_cost
            + costs.accommodation_cost
            + costs.food_cost
            + costs.activities_cost
            + costs.miscellaneous_cost
        )

    return itinerary
