"""Platform-level views (public schema side): health probe."""
import redis as redis_lib
from django.conf import settings
from django.db import connection
from django.http import JsonResponse


def health(request):
    """GET /health - used by Docker, the keep-alive checks, and Muhammad's
    first local test. 200 only when every dependency answers."""
    checks = {}
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
    try:
        client = redis_lib.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        client.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"
    ok = all(value == "ok" for value in checks.values())
    return JsonResponse(
        {"ok": ok, "service": "branvelo-api", "checks": checks},
        status=200 if ok else 503,
    )
