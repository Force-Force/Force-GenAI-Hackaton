from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any


@dataclass(frozen=True)
class MarginCalculation:
    revenue: Decimal
    cost_of_goods_sold: Decimal
    gross_margin: Decimal
    gross_margin_percentage: Decimal | None


def _decimal(row: dict[str, Any], *names: str) -> Decimal:
    for name in names:
        if name in row and row[name] is not None:
            try:
                return Decimal(str(row[name]))
            except (InvalidOperation, ValueError) as exc:
                raise ValueError(f"Non-numeric value for {name}") from exc
    raise ValueError(f"Missing required measure; expected one of {', '.join(names)}")


def calculate_margin(row: dict[str, Any]) -> MarginCalculation:
    revenue = _decimal(row, "revenue", "total_revenue", "sales")
    cogs = _decimal(row, "cost_of_goods_sold", "cogs", "cost")
    gross_margin = revenue - cogs
    percentage = None if revenue == 0 else (gross_margin / revenue) * Decimal("100")
    return MarginCalculation(revenue, cogs, gross_margin, percentage)


def compare_margin_periods(current: dict[str, Any], previous: dict[str, Any]) -> dict[str, Any]:
    current_result = calculate_margin(current)
    previous_result = calculate_margin(previous)
    return {
        "current": {
            "revenue": str(current_result.revenue),
            "cost_of_goods_sold": str(current_result.cost_of_goods_sold),
            "gross_margin": str(current_result.gross_margin),
            "gross_margin_percentage": (
                str(current_result.gross_margin_percentage)
                if current_result.gross_margin_percentage is not None
                else None
            ),
        },
        "previous": {
            "revenue": str(previous_result.revenue),
            "cost_of_goods_sold": str(previous_result.cost_of_goods_sold),
            "gross_margin": str(previous_result.gross_margin),
            "gross_margin_percentage": (
                str(previous_result.gross_margin_percentage)
                if previous_result.gross_margin_percentage is not None
                else None
            ),
        },
        "period_change": {
            "gross_margin": str(current_result.gross_margin - previous_result.gross_margin),
            "gross_margin_percentage": (
                str(current_result.gross_margin_percentage - previous_result.gross_margin_percentage)
                if current_result.gross_margin_percentage is not None
                and previous_result.gross_margin_percentage is not None
                else None
            ),
        },
    }
