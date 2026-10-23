"""Sales reports: aggregated from orders (items are JSONB snapshots, so
item stats are computed in Python - exact by construction)."""
import csv
from datetime import timedelta

from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsActiveStaff
from ordering.models import Order


def _range(request):
    today = timezone.localdate()
    date_from = parse_date(request.query_params.get("from") or "") or (today - timedelta(days=6))
    date_to = parse_date(request.query_params.get("to") or "") or today
    if date_to < date_from:
        date_from, date_to = date_to, date_from
    return date_from, date_to


def _orders(date_from, date_to):
    return Order.objects.filter(
        created_at__date__gte=date_from, created_at__date__lte=date_to
    ).exclude(status=Order.Status.CANCELLED)


def build_sales_report(date_from, date_to) -> dict:
    orders = list(_orders(date_from, date_to))
    by_day: dict[str, dict] = {}
    by_hour: dict[int, dict] = {}
    by_item: dict[str, dict] = {}
    by_status: dict[str, int] = {}
    revenue = 0
    for order in orders:
        day = timezone.localtime(order.created_at).date().isoformat()
        hour = timezone.localtime(order.created_at).hour
        d = by_day.setdefault(day, {"date": day, "orders": 0, "revenue": 0})
        d["orders"] += 1
        d["revenue"] += order.total_pkr
        h = by_hour.setdefault(hour, {"hour": hour, "orders": 0, "revenue": 0})
        h["orders"] += 1
        h["revenue"] += order.total_pkr
        by_status[order.status] = by_status.get(order.status, 0) + 1
        revenue += order.total_pkr
        for line in order.items or []:
            item = by_item.setdefault(
                line.get("name", "?"), {"name": line.get("name", "?"), "qty": 0, "revenue": 0}
            )
            item["qty"] += line.get("qty", 0)
            item["revenue"] += line.get("line_total_pkr", 0)
    count = len(orders)
    return {
        "from": date_from.isoformat(),
        "to": date_to.isoformat(),
        "orders": count,
        "revenue_pkr": revenue,
        "avg_order_pkr": (revenue // count) if count else 0,
        "by_day": [by_day[k] for k in sorted(by_day)],
        "by_hour": [by_hour[k] for k in sorted(by_hour)],
        "by_item": sorted(by_item.values(), key=lambda x: -x["revenue"])[:20],
        "by_status": by_status,
    }


class SalesReportView(APIView):
    """GET /api/staff/reports/sales?from=&to= (default: last 7 days)."""

    permission_classes = [IsActiveStaff]

    def get(self, request):
        date_from, date_to = _range(request)
        return Response(build_sales_report(date_from, date_to))


class SalesCsvView(APIView):
    """GET /api/staff/reports/sales.csv?kind=days|items - same range rules."""

    permission_classes = [IsActiveStaff]

    def get(self, request):
        date_from, date_to = _range(request)
        report = build_sales_report(date_from, date_to)
        kind = request.query_params.get("kind", "days")
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="sales-{kind}-{report["from"]}-to-{report["to"]}.csv"'
        )
        writer = csv.writer(response)
        if kind == "items":
            writer.writerow(["item", "qty_sold", "revenue_pkr"])
            for row in report["by_item"]:
                writer.writerow([row["name"], row["qty"], row["revenue"]])
        else:
            writer.writerow(["date", "orders", "revenue_pkr"])
            for row in report["by_day"]:
                writer.writerow([row["date"], row["orders"], row["revenue"]])
        return response
