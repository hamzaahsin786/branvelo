"""Minimal CORS middleware for local development.

The platform is served same-origin behind one proxy in production, so we
keep CORS deliberately simple instead of adding a dependency: reflect the
request Origin, allow the headers/methods the Next.js frontend uses.
"""


class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS" and "HTTP_ACCESS_CONTROL_REQUEST_METHOD" in request.META:
            from django.http import HttpResponse

            response = HttpResponse()
        else:
            response = self.get_response(request)
        origin = request.META.get("HTTP_ORIGIN")
        if origin:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Headers"] = (
                "Authorization, Content-Type, X-Tenant-Slug"
            )
            response["Access-Control-Allow-Methods"] = (
                "GET, POST, PATCH, PUT, DELETE, OPTIONS"
            )
        return response
