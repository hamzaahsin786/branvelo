"""Create a restaurant tenant from the CLI (Phase 2 proof path; the Phase 3
signup API calls the same provisioning function).

    python manage.py provision_tenant --slug test-cafe --name "Test Cafe" \
        --owner-name "Test Owner" --owner-email owner@example.com
"""
from django.core.management.base import BaseCommand, CommandError

from tenants_app import provisioning


class Command(BaseCommand):
    help = "Create a tenant (schema + primary domain + profile seed)."

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True)
        parser.add_argument("--name", required=True)
        parser.add_argument("--owner-name", default="")
        parser.add_argument("--owner-email", required=True)
        parser.add_argument("--owner-phone", default="")
        parser.add_argument(
            "--owner-password", default=None,
            help="Sets the owner account password. Omit to create the "
            "account with an unusable password (set later).",
        )
        parser.add_argument("--city", default="")
        parser.add_argument(
            "--domain-suffix", default=None,
            help="Defaults to PLATFORM_DOMAIN_SUFFIX (branvelo.com); "
            "use 'localhost' for local testing.",
        )

    def handle(self, *args, **options):
        try:
            tenant = provisioning.create_tenant(
                name=options["name"],
                slug=options["slug"],
                owner_name=options["owner_name"],
                owner_email=options["owner_email"],
                owner_password=options["owner_password"],
                owner_phone=options["owner_phone"],
                city=options["city"],
                domain_suffix=options["domain_suffix"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc
        domain = tenant.domains.get(is_primary=True).domain
        self.stdout.write(self.style.SUCCESS(
            f"tenant created: {tenant.name} "
            f"(schema={tenant.schema_name}, domain={domain})"
        ))
