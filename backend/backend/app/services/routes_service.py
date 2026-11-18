import json
import logging
import math
import re
import socket
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from urllib import error, request

from app.config import settings

logger = logging.getLogger(__name__)

ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
FIELD_MASK = "routes.distanceMeters,routes.duration,routes.travelAdvisory.tollInfo"
REQUEST_TIMEOUT_SECONDS = 10


class RoutesServiceError(Exception):
    """Base error for Google Routes API failures."""


class InvalidRouteError(RoutesServiceError):
    """Raised when Google cannot find a route for the locations."""


class RoutesTimeoutError(RoutesServiceError):
    """Raised when Google Routes API does not respond before the timeout."""


class RoutesAPIConfigurationError(RoutesServiceError):
    """Raised when the server-side Google Maps API key is missing."""


@dataclass(frozen=True)
class RouteMetrics:
    distance_km: float
    duration_seconds: float
    toll_estimate_inr: float | None = None


def compute_route(
    origin: str,
    destination: str,
    vehicle_type: str = "car",
    fuel_type: str | None = None,
) -> RouteMetrics:
    api_key = settings.google_maps_api_key
    if not api_key:
        raise RoutesAPIConfigurationError("Google Maps API key is not configured.")

    is_two_wheeler = vehicle_type.strip().lower() in {"bike", "motorbike", "motorcycle"}
    route_modifiers = {}
    if not is_two_wheeler:
        emission_type = _emission_type(fuel_type)
        if emission_type is not None:
            route_modifiers["vehicleInfo"] = {"emissionType": emission_type}

    payload = json.dumps(
        {
            "origin": {"address": origin},
            "destination": {"address": destination},
            "travelMode": "TWO_WHEELER" if is_two_wheeler else "DRIVE",
            "extraComputations": ["TOLLS"],
            **({"routeModifiers": route_modifiers} if route_modifiers else {}),
        }
    ).encode("utf-8")
    api_request = request.Request(
        ROUTES_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": FIELD_MASK,
        },
        method="POST",
    )

    try:
        with request.urlopen(api_request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            response_body = response.read()
    except error.HTTPError as exc:
        error_body = exc.read()
        _log_google_error(exc.code, error_body, api_key)
        provider_status = _provider_status(error_body)
        if provider_status in {"INVALID_ARGUMENT", "NOT_FOUND", "FAILED_PRECONDITION"}:
            raise InvalidRouteError(
                "Google Maps could not find a route for these locations. Check the starting location and destination."
            ) from exc
        raise RoutesServiceError(
            "Google Maps could not calculate this route."
        ) from exc
    except (TimeoutError, socket.timeout) as exc:
        logger.warning("Google Routes API request timed out")
        raise RoutesTimeoutError("Google Routes API request timed out.") from exc
    except error.URLError as exc:
        if isinstance(exc.reason, (TimeoutError, socket.timeout)):
            logger.warning("Google Routes API request timed out")
            raise RoutesTimeoutError("Google Routes API request timed out.") from exc
        logger.warning("Google Routes API network request failed: %s", exc.reason)
        raise RoutesServiceError("Google Routes API is unavailable.") from exc

    try:
        result = json.loads(response_body)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning("Google Routes API returned invalid JSON")
        raise RoutesServiceError("Google Routes API returned an invalid response.") from exc

    routes = result.get("routes") if isinstance(result, dict) else None
    if not isinstance(routes, list) or not routes:
        raise InvalidRouteError(
            "Google Maps could not find a route for these locations. Check the starting location and destination."
        )

    route = routes[0]
    distance_meters = route.get("distanceMeters") if isinstance(route, dict) else None
    duration = route.get("duration") if isinstance(route, dict) else None
    duration_match = re.fullmatch(r"(\d+(?:\.\d+)?)s", duration) if isinstance(duration, str) else None

    if (
        isinstance(distance_meters, bool)
        or not isinstance(distance_meters, (int, float))
        or distance_meters <= 0
        or duration_match is None
    ):
        logger.warning("Google Routes API response omitted valid distance or duration fields")
        raise RoutesServiceError("Google Routes API returned incomplete route data.")

    return RouteMetrics(
        distance_km=float(distance_meters) / 1000,
        duration_seconds=float(duration_match.group(1)),
        toll_estimate_inr=_parse_toll_estimate(route),
    )


def _emission_type(fuel_type: str | None) -> str | None:
    if fuel_type is None:
        return None

    return {
        "petrol": "GASOLINE",
        "gasoline": "GASOLINE",
        "diesel": "DIESEL",
        "electric": "ELECTRIC",
        "hybrid": "HYBRID",
    }.get(fuel_type.strip().lower())


def _parse_toll_estimate(route: dict) -> float | None:
    advisory = route.get("travelAdvisory")
    if advisory is None:
        return 0.0
    if not isinstance(advisory, dict):
        return None

    toll_info = advisory.get("tollInfo")
    if toll_info is None:
        return 0.0
    if not isinstance(toll_info, dict):
        return None

    prices = toll_info.get("estimatedPrice")
    if not isinstance(prices, list) or not prices:
        return None

    total = Decimal(0)
    for price in prices:
        if not isinstance(price, dict) or price.get("currencyCode") != "INR":
            return None

        units = price.get("units", "0")
        nanos = price.get("nanos", 0)
        if isinstance(units, bool) or not isinstance(units, (str, int)):
            return None
        if isinstance(nanos, bool) or not isinstance(nanos, int):
            return None
        if not -999_999_999 <= nanos <= 999_999_999:
            return None

        try:
            amount = Decimal(str(units)) + Decimal(nanos) / Decimal(1_000_000_000)
        except InvalidOperation:
            return None
        if not amount.is_finite() or amount < 0:
            return None
        total += amount

    toll_estimate = round(float(total), 2)
    return toll_estimate if math.isfinite(toll_estimate) else None


def _provider_status(response_body: bytes) -> str | None:
    try:
        payload = json.loads(response_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None

    error_payload = payload.get("error") if isinstance(payload, dict) else None
    status = error_payload.get("status") if isinstance(error_payload, dict) else None
    return status if isinstance(status, str) else None


def _log_google_error(status_code: int, response_body: bytes, api_key: str) -> None:
    try:
        payload = json.loads(response_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.warning("Google Routes API returned HTTP %s with an unreadable error", status_code)
        return

    error_payload = payload.get("error") if isinstance(payload, dict) else None
    provider_status = error_payload.get("status") if isinstance(error_payload, dict) else None
    message = error_payload.get("message") if isinstance(error_payload, dict) else None
    if isinstance(message, str):
        message = message.replace(api_key, "[REDACTED]")
    logger.warning(
        "Google Routes API returned HTTP %s (status=%s): %s",
        status_code,
        provider_status,
        message if isinstance(message, str) else "No provider message",
    )
