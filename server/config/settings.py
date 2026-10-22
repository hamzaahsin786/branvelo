"""Branvelo v2 server settings.

Multi-tenancy (Phase 2): django-tenants, one PostgreSQL schema per
restaurant. SHARED_APPS live in the public schema (platform control
layer); TENANT_APPS are synced into every restaurant schema. Which schema
a request uses is decided by the hostname (django-tenants middleware,
first in the chain). Spec: docs/04-db-design-v2.md.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
# Local development only. Deployment phase tightens this to real domains.
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

# --- django-tenants app split -------------------------------------------------
SHARED_APPS = [
    "django_tenants",  # must be first
    "tenants_app",  # TENANT_MODEL lives here; shared by definition
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
]

TENANT_APPS = [
    # auth + contenttypes must exist inside tenant schemas too: staff
    # logins are per-tenant auth users (see accounts.StaffUser).
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "accounts",
    "catalog",
    "ordering",
]

INSTALLED_APPS = SHARED_APPS + [app for app in TENANT_APPS if app not in SHARED_APPS]

TENANT_MODEL = "tenants_app.Tenant"
TENANT_DOMAIN_MODEL = "tenants_app.Domain"
DATABASE_ROUTERS = ["django_tenants.routers.TenantSyncRouter"]
# Tenant subdomains are minted under this suffix at provisioning time.
PLATFORM_DOMAIN_SUFFIX = os.environ.get("PLATFORM_DOMAIN_SUFFIX", "branvelo.com")

MIDDLEWARE = [
    # Resolves the tenant from the hostname and sets the DB schema for the
    # whole request. Must run before anything that touches the database.
    "django_tenants.middleware.main.TenantMainMiddleware",
    "config.middleware.SimpleCorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# PostgreSQL when POSTGRES_HOST is set (Docker Compose always sets it);
# SQLite fallback so `manage.py check` and unit smoke tests run anywhere.
# The django-tenants backend is required: it owns search_path switching.
if os.environ.get("POSTGRES_HOST"):
    DATABASES = {
        "default": {
            "ENGINE": "django_tenants.postgresql_backend",
            "NAME": os.environ.get("POSTGRES_DB", "branvelo"),
            "USER": os.environ.get("POSTGRES_USER", "branvelo"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "branvelo-dev-password"),
            "HOST": os.environ["POSTGRES_HOST"],
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Karachi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}
