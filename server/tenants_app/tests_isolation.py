# Tenant-isolation test suite (Phase 7). Run:
#   python manage.py test tenants_app.tests_isolation
# Proves the property the whole product rests on: one tenant can never
# see, read, or act on another tenant's data - by hostname, by token,
# or by guessing ids.
from django.contrib.auth import get_user_model
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import get_tenant_model, schema_context, tenant_context
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import StaffUser
from catalog.models import Category, MenuItem, RestaurantProfile
from tenants_app.models import Domain

HOST_A = "alpha.test"
HOST_B = "bravo.test"


def _make_owner(tenant, email):
    with tenant_context(tenant):
        user = get_user_model().objects.create_user(
            username=email, password="test-pass-123", first_name="Owner"
        )
        StaffUser.objects.create(user=user, role="owner")
        return Token.objects.create(user=user).key


def _seed_menu(tenant, item_name):
    with tenant_context(tenant):
        profile, _ = RestaurantProfile.objects.get_or_create(
            pk=1, defaults={"name": tenant.name}
        )
        profile.name = tenant.name
        profile.save()
        cat = Category.objects.create(name="Mains")
        MenuItem.objects.create(
            category=cat, name=item_name, price_pkr=500, is_available=True
        )


class TenantIsolationTests(TenantTestCase):
    @classmethod
    def get_test_schema_name(cls):
        return "alpha"

    @classmethod
    def get_test_tenant_domain(cls):
        return HOST_A

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.slug = "alpha"
        tenant.name = "Alpha Eats"
        tenant.owner_email = "owner@alpha.test"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    @classmethod
    def setUpClass(cls):
        # NOTE: django-tenants' TenantTestCase.setUpClass never calls
        # TestCase.setUpClass, so setUpTestData would silently never run.
        # Everything (tenant B, public host, seed data, tokens) is
        # therefore created here, after the tenant-A setup.
        super().setUpClass()
        Tenant = get_tenant_model()
        # Tenant rows live in the public schema; creating them requires
        # the connection to be there (it currently points at tenant A).
        with schema_context("public"):
            public, _ = Tenant.objects.get_or_create(
                schema_name="public",
                defaults={
                    "slug": "public",
                    "name": "Platform",
                    "owner_email": "platform@branvelo.test",
                },
            )
            Domain.objects.get_or_create(
                domain="platform.test",
                defaults={"tenant": public, "is_primary": True},
            )
            cls.tenant_b = Tenant(
                schema_name="bravo", slug="bravo", name="Bravo Bites",
                owner_email="owner@bravo.test",
            )
            cls.tenant_b.save(verbosity=0)
            Domain.objects.create(
                tenant=cls.tenant_b, domain=HOST_B, is_primary=True
            )
        _seed_menu(cls.tenant, "Alpha Burger")
        _seed_menu(cls.tenant_b, "Bravo Pizza")
        cls.token_a = _make_owner(cls.tenant, "owner@alpha.test")
        cls.token_b = _make_owner(cls.tenant_b, "owner@bravo.test")

    @classmethod
    def tearDownClass(cls):
        Tenant = get_tenant_model()
        for slug in ("charlie",):
            extra = Tenant.objects.filter(slug=slug).first()
            if extra is not None:
                extra.delete(force_drop=True)
        if getattr(cls, "tenant_b", None) is not None:
            Domain.objects.filter(tenant=cls.tenant_b).delete()
            cls.tenant_b.delete(force_drop=True)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()

    # 1. Storefronts serve only their own menu.
    def test_storefront_menu_isolated(self):
        res_a = self.client.get("/api/storefront/", HTTP_HOST=HOST_A)
        self.assertEqual(res_a.status_code, 200)
        names_a = [
            item["name"]
            for cat in res_a.data["categories"]
            for item in cat["items"]
        ]
        self.assertEqual(names_a, ["Alpha Burger"])
        res_b = self.client.get("/api/storefront/", HTTP_HOST=HOST_B)
        names_b = [
            item["name"]
            for cat in res_b.data["categories"]
            for item in cat["items"]
        ]
        self.assertEqual(names_b, ["Bravo Pizza"])

    # 2. A staff token from tenant A is worthless at tenant B.
    def test_staff_token_rejected_across_tenants(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_a}")
        for path in ("/api/staff/catalog/categories", "/api/staff/orders/"):
            res = self.client.get(path, HTTP_HOST=HOST_B)
            self.assertEqual(res.status_code, 401, path)
        # ...and still valid at home.
        res = self.client.get("/api/staff/catalog/categories", HTTP_HOST=HOST_A)
        self.assertEqual(res.status_code, 200)

    # 3. An order placed at A does not exist at B - publicly or for staff.
    def test_order_invisible_across_tenants(self):
        with tenant_context(self.tenant):
            item = MenuItem.objects.get(name="Alpha Burger")
        res = self.client.post(
            "/api/orders/",
            {
                "customer_name": "Iso Tester",
                "customer_phone": "0300 1234567",
                "type": "pickup",
                "items": [{"item_id": item.id, "qty": 1}],
            },
            format="json",
            HTTP_HOST=HOST_A,
        )
        self.assertEqual(res.status_code, 201, res.content)
        order_id = res.data["id"]

        public_b = self.client.get(f"/api/orders/{order_id}", HTTP_HOST=HOST_B)
        self.assertEqual(public_b.status_code, 404)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_b}")
        detail_b = self.client.get(
            f"/api/staff/orders/{order_id}", HTTP_HOST=HOST_B
        )
        self.assertEqual(detail_b.status_code, 404)
        list_b = self.client.get("/api/staff/orders/", HTTP_HOST=HOST_B)
        self.assertEqual(list_b.data["orders"], [])

    # 4. Signup: slugs are globally unique; a fresh tenant starts empty
    #    and separate.
    def test_signup_duplicate_slug_rejected(self):
        res = self.client.post(
            "/api/platform/signup",
            {
                "name": "Copycat",
                "slug": "alpha",
                "owner_name": "Copy",
                "owner_email": "copy@cat.test",
                "password": "test-pass-123",
            },
            format="json",
            HTTP_HOST="platform.test",
        )
        self.assertEqual(res.status_code, 400)

    def test_signup_creates_isolated_tenant(self):
        res = self.client.post(
            "/api/platform/signup",
            {
                "name": "Charlie Chow",
                "slug": "charlie",
                "owner_name": "Charlie",
                "owner_email": "owner@charlie.test",
                "password": "test-pass-123",
            },
            format="json",
            HTTP_HOST="platform.test",
        )
        self.assertEqual(res.status_code, 201, res.content)
        domain = res.data["domain"]
        storefront = self.client.get("/api/storefront/", HTTP_HOST=domain)
        self.assertEqual(storefront.status_code, 200)
        self.assertEqual(storefront.data["categories"], [])
        self.assertEqual(storefront.data["profile"]["name"], "Charlie Chow")
