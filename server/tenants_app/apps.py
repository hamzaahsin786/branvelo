from django.apps import AppConfig


class TenantsAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tenants_app"
    verbose_name = "Platform control (tenants, plans, billing)"
