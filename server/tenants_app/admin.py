"""Platform super-admin (public schema): Muhammad runs the whole platform
from here until a custom dashboard is worth building (Phase 6+)."""
from django.contrib import admin

from tenants_app.models import AuditLog, Domain, Plan, Subscription, Tenant


class DomainInline(admin.TabularInline):
    model = Domain
    extra = 0


class SubscriptionInline(admin.TabularInline):
    model = Subscription
    extra = 0
    readonly_fields = ("created_at", "updated_at")


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "schema_name", "status", "plan", "city", "created_at")
    list_filter = ("status", "plan")
    search_fields = ("name", "slug", "owner_name", "owner_email")
    readonly_fields = ("schema_name", "created_at", "updated_at")
    inlines = (DomainInline, SubscriptionInline)


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "price_monthly_pkr", "max_branches", "is_active")
    list_filter = ("is_active",)
    search_fields = ("code", "name")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("tenant", "plan", "status", "current_period_end")
    list_filter = ("status", "plan")
    search_fields = ("tenant__slug", "tenant__name")


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ("domain", "tenant", "is_primary")
    search_fields = ("domain", "tenant__slug")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "tenant_id")
    list_filter = ("action",)
    search_fields = ("actor", "action")
    readonly_fields = ("actor", "action", "tenant_id", "detail", "created_at")
