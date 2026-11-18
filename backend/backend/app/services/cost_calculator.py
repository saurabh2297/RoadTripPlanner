def calculate_fuel_cost(distance, mileage, fuel_price):

    if not mileage or mileage <= 0:
        raise ValueError("Mileage must be greater than zero")

    fuel_required = distance / mileage

    return round(fuel_required * fuel_price, 2)


def calculate_toll_cost(
    outbound_toll_estimate: float | None,
    return_toll_estimate: float | None,
) -> float | None:
    if outbound_toll_estimate is None or return_toll_estimate is None:
        return None

    return round(outbound_toll_estimate + return_toll_estimate, 2)
