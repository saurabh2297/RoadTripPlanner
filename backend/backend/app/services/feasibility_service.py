import math
from dataclasses import dataclass


@dataclass(frozen=True)
class FeasibilityAssessment:
    feasible: bool
    round_trip_distance_km: float
    estimated_driving_hours: float
    recommended_days: int


def assess_round_trip_feasibility(
    outbound_distance_km: float,
    outbound_duration_seconds: float,
    return_distance_km: float,
    return_duration_seconds: float,
    requested_days: int,
    route_buffer_ratio: float,
    max_daily_driving_hours: float,
) -> FeasibilityAssessment:
    """Estimate round-trip driving after allowing for local detours and sightseeing."""
    distance_total = (outbound_distance_km + return_distance_km) * (1 + route_buffer_ratio)
    driving_hours = (
        (outbound_duration_seconds + return_duration_seconds)
        * (1 + route_buffer_ratio)
        / 3600
    )
    recommended_days = max(1, math.ceil(driving_hours / max_daily_driving_hours))

    return FeasibilityAssessment(
        feasible=driving_hours <= requested_days * max_daily_driving_hours,
        round_trip_distance_km=distance_total,
        estimated_driving_hours=driving_hours,
        recommended_days=recommended_days,
    )


def infeasible_trip_message(
    requested_days: int,
    assessment: FeasibilityAssessment,
    route_buffer_ratio: float,
    max_daily_driving_hours: float,
) -> str:
    buffer_percent = round(route_buffer_ratio * 100)
    return (
        f"Your requested trip may be too demanding for {requested_days} days. "
        f"The estimated round-trip driving time is approximately "
        f"{assessment.estimated_driving_hours:.1f} hours, including a "
        f"{buffer_percent}% allowance for local sightseeing and detours. "
        f"At a limit of {max_daily_driving_hours:g} driving hours per day, "
        f"plan at least {assessment.recommended_days} days. Consider extending "
        f"your trip to {assessment.recommended_days} days or choosing a closer destination."
    )
