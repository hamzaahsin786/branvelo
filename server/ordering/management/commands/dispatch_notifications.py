"""Drain the notifications queue for every tenant.

Dashboard notifications are visible in the admin the moment they are
written, so dispatch = mark sent. External channels (WhatsApp/SMS/email)
plug in here at deployment, behind provider credentials; rows for those
channels stay queued (and are counted) until a sender exists.

Run: python manage.py dispatch_notifications
(On the server this runs on a timer — see docs/05.)
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django_tenants.utils import get_tenant_model, schema_context

from ordering.models import Notification


class Command(BaseCommand):
    help = "Mark queued dashboard notifications as sent, per tenant schema."

    def handle(self, *args, **options):
        total_sent = 0
        total_waiting = 0
        Tenant = get_tenant_model()
        for tenant in Tenant.objects.exclude(schema_name="public"):
            with schema_context(tenant.schema_name):
                sent = Notification.objects.filter(
                    channel=Notification.Channel.DASHBOARD,
                    status=Notification.Status.QUEUED,
                ).update(
                    status=Notification.Status.SENT, sent_at=timezone.now()
                )
                waiting = Notification.objects.filter(
                    status=Notification.Status.QUEUED
                ).exclude(channel=Notification.Channel.DASHBOARD).count()
                total_sent += sent
                total_waiting += waiting
                self.stdout.write(
                    f"{tenant.schema_name}: {sent} dashboard sent, "
                    f"{waiting} external waiting for a provider"
                )
        self.stdout.write(
            self.style.SUCCESS(
                f"done: {total_sent} sent, {total_waiting} waiting"
            )
        )
