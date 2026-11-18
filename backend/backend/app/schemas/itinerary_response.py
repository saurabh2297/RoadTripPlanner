
from typing import Literal

from pydantic import BaseModel


class VehicleMileage(BaseModel):
    mileage: float
    mileage_unit: Literal["km/litre", "km/kg", "km/kWh"]


class Activity(BaseModel):
    time: str
    name: str
    description: str
    location: str
    category: str
    estimated_duration_minutes: int


class DayPlan(BaseModel):
    day: int
    title: str
    activities: list[Activity]
    overnight_location: str


class CostAnalysis(BaseModel):
    fuel_or_charging_cost: float
    toll_cost: float | None = None
    accommodation_cost: float
    food_cost: float
    activities_cost: float
    miscellaneous_cost: float
    total_cost: float
    assumptions: list[str]


class TripResponse(BaseModel):
    destination: str
    starting_location: str
    duration_days: int
    overview: str

    one_way_distance_km: float
    total_driving_distance_km: float

    vehicle: VehicleMileage
    cost_analysis: CostAnalysis
    days: list[DayPlan]
    travel_tips: list[str]
