from pydantic import BaseModel
from typing import Optional


class Vehicle(BaseModel):
    type: str
    model: Optional[str] = None
    fuel_type: str
    fuel_price: Optional[float] = None

class TripRequest(BaseModel):
    starting_location: str
    destination: str
    days: int
    preferences: list[str]
    travel_group: str
    vehicle: Vehicle