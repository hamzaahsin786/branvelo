"""Import a v1 (Supabase/Fastify) restaurant into its v2 tenant schema.

Export the v1 tables as JSON arrays into one directory (Supabase table
editor -> Export, or a select-* dump), named:
  tenants.json (or tenant.json)   categories.json
  menu_items.json (or items.json) delivery_zones.json (or zones.json)
  coupons.json

Usage:
  python manage.py import_v1_tenant --dir ./usama-export --slug usama-burgers
  ... add --create --owner-email a@b.c --owner-password ... to provision
  the tenant first (same path as the signup API).

The tenant's existing catalog is wiped before import, so re-runs are
safe. Historical v1 orders are intentionally NOT imported: the pilot
starts fresh on v2 (the v1 database remains the archive of record).
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_datetime
from django_tenants.utils import get_tenant_model, tenant_context

from tenants_app.provisioning import create_tenant

DAY_KEYS = {
    "mon": 0, "monday": 0, "tue": 1, "tuesday": 1, "wed": 2, "wednesday": 2,
    "thu": 3, "thursday": 3, "fri": 4, "friday": 4, "sat": 5, "saturday": 5,
    "sun": 6, "sunday": 6,
}


def _load(directory: Path, *names: str) -> list[dict]:
    for name in names:
        path = directory / name
        if path.exists():
            data = json.loads(path.read_text())
            return data if isinstance(data, list) else [data]
    return []


class Command(BaseCommand):
    help = "Import a v1 Supabase export into a v2 tenant schema."

    def add_arguments(self, parser):
        parser.add_argument("--dir", required=True, help="Export directory")
        parser.add_argument("--slug", required=True)
        parser.add_argument("--create", action="store_true",
                            help="Provision the tenant first")
        parser.add_argument("--owner-email")
        parser.add_argument("--owner-password")
        parser.add_argument("--owner-name", default="Owner")

    def handle(self, *args, **options):
        directory = Path(options["dir"])
        if not directory.is_dir():
            raise CommandError(f"Not a directory: {directory}")
        slug = options["slug"]
        Tenant = get_tenant_model()
        tenant = Tenant.objects.filter(slug=slug).first()
        if tenant is None:
            if not options["create"]:
                raise CommandError(
                    f"No tenant with slug '{slug}'. Pass --create (with "
                    "--owner-email/--owner-password) to provision it."
                )
            if not options["owner_email"] or not options["owner_password"]:
                raise CommandError("--create needs --owner-email and --owner-password")
            tenant_rows = _load(directory, "tenants.json", "tenant.json")
            name = (tenant_rows[0].get("name") if tenant_rows else None) or slug
            tenant = create_tenant(
                slug=slug,
                name=name,
                owner_name=options["owner_name"],
                owner_email=options["owner_email"],
                owner_password=options["owner_password"],
            )
            self.stdout.write(f"provisioned tenant {slug}")

        tenant_rows = _load(directory, "tenants.json", "tenant.json")
        tenant_row = next(
            (r for r in tenant_rows if r.get("slug") == slug),
            tenant_rows[0] if tenant_rows else {},
        )
        categories = _load(directory, "categories.json")
        items = _load(directory, "menu_items.json", "items.json")
        zones = _load(directory, "delivery_zones.json", "zones.json")
        coupons = _load(directory, "coupons.json")
        tid = tenant_row.get("id")
        if tid:
            categories = [r for r in categories if r.get("tenant_id") in (tid, None)]
            items = [r for r in items if r.get("tenant_id") in (tid, None)]
            zones = [r for r in zones if r.get("tenant_id") in (tid, None)]
            coupons = [r for r in coupons if r.get("tenant_id") in (tid, None)]

        with tenant_context(tenant):
            counts = self._import(tenant_row, categories, items, zones, coupons)
        self.stdout.write(self.style.SUCCESS(
            f"imported into {slug}: " +
            ", ".join(f"{k}={v}" for k, v in counts.items())
        ))

    def _import(self, tenant_row, categories, items, zones, coupons) -> dict:
        from catalog.models import (
            Category,
            Coupon,
            DeliveryZone,
            MenuItem,
            OpeningHours,
            RestaurantProfile,
        )

        # Wipe (items first: categories are PROTECTed while items exist).
        MenuItem.objects.all().delete()
        Category.objects.all().delete()
        DeliveryZone.objects.all().delete()
        Coupon.objects.all().delete()

        profile = RestaurantProfile.objects.first()
        if profile is not None and tenant_row:
            profile.name = tenant_row.get("name") or profile.name
            profile.logo_url = tenant_row.get("logo_url") or ""
            profile.phone = tenant_row.get("phone") or ""
            profile.address = tenant_row.get("address") or ""
            profile.announcement = tenant_row.get("announcement") or ""
            if isinstance(tenant_row.get("theme"), dict):
                # Same bounded-token cleaning as the signup API — one
                # implementation, shared (guardrail 1: theme is data).
                from tenants_app.api import _clean_theme
                profile.theme = _clean_theme(tenant_row["theme"])
            profile.save()
            hours = tenant_row.get("hours")
            if isinstance(hours, dict):
                for key, value in hours.items():
                    weekday = DAY_KEYS.get(str(key).lower())
                    if weekday is None or not isinstance(value, dict):
                        continue
                    OpeningHours.objects.update_or_create(
                        weekday=weekday,
                        defaults={
                            # v2 keeps times on closed days (is_closed is
                            # the flag); v1 exports nulls for them.
                            "open_time": value.get("open") or "11:00",
                            "close_time": value.get("close") or "23:00",
                            "is_closed": bool(value.get("closed")),
                        },
                    )

        category_ids: dict[str, int] = {}
        for row in categories:
            cat = Category.objects.create(
                name=row["name"],
                name_ur=row.get("name_ur") or "",
                tagline=row.get("tagline") or "",
                icon=row.get("icon") or "",
                sort=row.get("sort") or 0,
                is_active=row.get("active", True),
            )
            if row.get("id"):
                category_ids[str(row["id"])] = cat.id

        item_count = 0
        for row in items:
            category_id = category_ids.get(str(row.get("category_id")))
            if category_id is None:
                continue
            MenuItem.objects.create(
                category_id=category_id,
                name=row["name"],
                name_ur=row.get("name_ur") or "",
                description=row.get("description") or "",
                price_pkr=row.get("price") or 0,
                photo_url=row.get("photo_url") or "",
                badges=row.get("badges") or [],
                sort=row.get("sort") or 0,
                is_available=row.get("available", True),
                prep_minutes=row.get("prep_minutes") or 15,
            )
            item_count += 1

        for row in zones:
            DeliveryZone.objects.create(
                name=row["name"],
                areas=row.get("areas") or [],
                fee_pkr=row.get("fee") or 0,
                min_order_pkr=row.get("min_order") or 0,
                free_above_pkr=row.get("free_above"),
                is_active=row.get("active", True),
            )
        for row in coupons:
            Coupon.objects.create(
                code=row["code"],
                type=row.get("type") or "flat",
                value=row.get("value") or 0,
                min_order_pkr=row.get("min_order") or 0,
                max_uses=row.get("max_uses"),
                used_count=row.get("uses") or 0,
                valid_from=parse_datetime(row["valid_from"]) if row.get("valid_from") else None,
                valid_to=parse_datetime(row["valid_until"]) if row.get("valid_until") else None,
                is_active=row.get("active", True),
            )
        return {
            "categories": len(categories),
            "items": item_count,
            "zones": len(zones),
            "coupons": len(coupons),
        }
