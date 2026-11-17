def calculate_fuel_cost(distance, mileage, fuel_price):

    if not mileage or mileage <= 0:
        raise ValueError("Mileage must be greater than zero")

    fuel_required = distance / mileage

    return round(fuel_required * fuel_price, 2)
