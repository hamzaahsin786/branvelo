"""One-time platform bootstrap (idempotent, safe to re-run).

Run after the first `migrate_schemas`:
    python manage.py bootstrap_platform

Creates, in the public schema:
- the public tenant row + `localhost` / `127.0.0.1` domains, so the admin
  and health endpoints resolve on a developer machine;
- the default `starter` plan (Rs 2,499/mo placeholder price - edit it in
  the Admin; it is data, not code);
- a Django superuser when PLATFORM_ADMIN_EMAIL and
  PLATFORM_ADMIN_PASSWORD are set in the environment.
"""
import os

from django.core.management.base import BaseCommand
from django_tenants.utils import get_tenant_model, schema_context

Tenant = get_tenant_model()

DEFAULT_PLAN_PRICE_PKR = 2499  # placeholder until Muhammad sets the real price


class Command(BaseCommand):
    help = "Bootstrap the platform control layer (public tenant, plan, admin)."

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model

        from tenants_app.models import Domain, Plan

        with schema_context("public"):
            public, created = Tenant.objects.get_or_create(
                schema_name="public",
                defaults={
                    "name": "Branvelo Platform",
                    "slug": "platform",
                    "owner_name": "Branvelo",
                    "owner_email": "owner@branvelo.com",
                    "status": Tenant.Status.ACTIVE,
                },
            )
            self.stdout.write(
                f"public tenant: {'created' if created else 'already exists'}"
            )
            for host in ("localhost", "127.0.0.1"):
                _, d_created = Domain.objects.get_or_create(
                    domain=host, defaults={"tenant": public, "is_primary": host == "localhost"}
                )
                if d_created:
                    self.stdout.write(f"domain added: {host} -> public")

            plan, p_created = Plan.objects.get_or_create(
                code="starter",
                defaults={
                    "name": "Starter",
                    "price_monthly_pkr": DEFAULT_PLAN_PRICE_PKR,
                    "max_branches": 1,
                    "is_active": True,
                },
            )
            self.stdout.write(
                f"plan 'starter': {'created' if p_created else 'already exists'} "
                f"(Rs {plan.price_monthly_pkr}/mo)"
            )

            email = os.environ.get("PLATFORM_ADMIN_EMAIL", "").strip()
            password = os.environ.get("PLATFORM_ADMIN_PASSWORD", "").strip()
            if email and password:
                User = get_user_model()
                if not User.objects.filter(username=email).exists():
                    User.objects.create_superuser(
                        username=email, email=email, password=password
                    )
                    self.stdout.write(f"superuser created: {email}")
                else:
                    self.stdout.write(f"superuser already exists: {email}")
            else:
                self.stdout.write(
                    "no PLATFORM_ADMIN_EMAIL/PASSWORD set: create the admin "
                    "later with `python manage.py createsuperuser`"
                )
        self.stdout.write(self.style.SUCCESS("bootstrap complete"))
