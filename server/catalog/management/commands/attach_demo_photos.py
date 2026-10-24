"""Attach the bundled sample dish photos to one tenant's menu.

Purpose: visual checking only. The 25 sample photos ship in the repo at
apps/web/public/menu/ (served by the web app at /menu/<file>.jpg), and
this command points a tenant's menu items, category banners and cover
photo at them by matching item and category names. It only fills empty
photo fields unless --force is given, and --clear removes the sample
photos again (any photo_url starting with /menu/).

Run inside the api container:
    python manage.py attach_demo_photos usama-burgers
    python manage.py attach_demo_photos usama-burgers --force
    python manage.py attach_demo_photos usama-burgers --clear
"""
from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import get_tenant_model, schema_context

from catalog.models import Category, MenuItem, RestaurantProfile

PHOTO_PREFIX = "/menu/"
COVER_PHOTO = "/menu/shawarma-platter.jpg"

# Ordered: the first rule whose keyword appears in the item name wins,
# so specific dishes come before generic ones.
ITEM_RULES = [
    ("loaded fries", "loaded-fries.jpg"),
    ("masala fries", "masala-fries.jpg"),
    ("fries", "fries.jpg"),
    ("steak", "chicken-steak.jpg"),
    ("fried chicken", "fried-chicken.jpg"),
    ("panini", "panini.jpg"),
    ("shami sandwich", "shami-sandwich.jpg"),
    ("shami", "shami-burger.jpg"),
    ("zinger sandwich", "zinger-sandwich.jpg"),
    ("zinger", "zinger-burger.jpg"),
    ("grilled chicken burger", "grilled-chicken-burger.jpg"),
    ("tikka burger", "tikka-burger.jpg"),
    ("beef burger", "beef-burger.jpg"),
    ("chicken burger", "chicken-burger.jpg"),
    ("club sandwich", "club-sandwich.jpg"),
    ("chicken sandwich", "chicken-sandwich.jpg"),
    ("sandwich", "chicken-sandwich.jpg"),
    ("bbq wrap", "bbq-wrap.jpg"),
    ("wrap", "bbq-wrap.jpg"),
    ("paratha roll", "paratha-roll.jpg"),
    ("roll", "paratha-roll.jpg"),
    ("plater", "shawarma-platter.jpg"),
    ("shawarma platter", "shawarma-platter.jpg"),
    ("platter", "shawarma-platter.jpg"),
    ("shawarma", "chicken-shawarma.jpg"),
    ("hot wings", "hot-wings.jpg"),
    ("wings", "hot-wings.jpg"),
    ("water bottle", "water-bottle.jpg"),
    ("bottle", "water-bottle.jpg"),
    ("extra cheese", "extra-cheese.jpg"),
    ("mayo", "mayo-dip.jpg"),
    ("jelopino", "jalapeno-sauce.jpg"),
    ("jalapeno", "jalapeno-sauce.jpg"),
    ("sauce", "mayo-dip.jpg"),
    ("cheese", "extra-cheese.jpg"),
    ("burger", "beef-burger.jpg"),
]

CATEGORY_RULES = [
    ("burger", "grilled-chicken-burger.jpg"),
    ("sandwich", "club-sandwich.jpg"),
    ("shawarma", "shawarma-platter.jpg"),
    ("fries", "loaded-fries.jpg"),
    ("bbq", "bbq-wrap.jpg"),
    ("wrap", "bbq-wrap.jpg"),
    ("roll", "paratha-roll.jpg"),
    ("wings", "hot-wings.jpg"),
    ("deal", "zinger-burger.jpg"),
    ("side", "fries.jpg"),
]


def match_photo(name, rules):
    lowered = name.lower()
    for keyword, filename in rules:
        if keyword in lowered:
            return PHOTO_PREFIX + filename
    return None


class Command(BaseCommand):
    help = (
        "Point one tenant's menu items, categories and cover at the "
        "bundled sample dish photos in apps/web/public/menu/."
    )

    def add_arguments(self, parser):
        parser.add_argument("slug", help="Tenant slug, e.g. usama-burgers")
        parser.add_argument(
            "--force", action="store_true",
            help="Overwrite photo fields that already have a value.",
        )
        parser.add_argument(
            "--clear", action="store_true",
            help="Remove sample photos (values starting with /menu/) "
                 "from this tenant and stop.",
        )

    def handle(self, *args, **options):
        Tenant = get_tenant_model()
        with schema_context("public"):
            tenant = Tenant.objects.filter(slug=options["slug"]).first()
            if tenant is None:
                slugs = ", ".join(
                    Tenant.objects.exclude(schema_name="public")
                    .values_list("slug", flat=True)
                )
                raise CommandError(
                    f"No tenant with slug {options['slug']!r}. "
                    f"Known slugs: {slugs or 'none'}"
                )
            schema_name = tenant.schema_name

        force = options["force"]
        with schema_context(schema_name):
            if options["clear"]:
                items = MenuItem.objects.filter(
                    photo_url__startswith=PHOTO_PREFIX
                ).update(photo_url="")
                cats = Category.objects.filter(
                    banner_url__startswith=PHOTO_PREFIX
                ).update(banner_url="")
                cover = RestaurantProfile.objects.filter(
                    cover_url__startswith=PHOTO_PREFIX
                ).update(cover_url="")
                self.stdout.write(
                    f"Cleared sample photos: {items} items, "
                    f"{cats} categories, cover cleared: {bool(cover)}"
                )
                return

            updated, skipped, unmatched = 0, 0, []
            for item in MenuItem.objects.all():
                if item.photo_url and not force:
                    skipped += 1
                    continue
                photo = match_photo(item.name, ITEM_RULES)
                if photo is None:
                    unmatched.append(item.name)
                    continue
                if item.photo_url != photo:
                    item.photo_url = photo
                    item.save(update_fields=["photo_url", "updated_at"])
                    updated += 1

            cat_updated = 0
            for category in Category.objects.all():
                if category.banner_url and not force:
                    continue
                photo = match_photo(category.name, CATEGORY_RULES)
                if photo and category.banner_url != photo:
                    category.banner_url = photo
                    category.save(update_fields=["banner_url", "updated_at"])
                    cat_updated += 1

            cover_set = False
            profile = RestaurantProfile.objects.first()
            if profile and (force or not profile.cover_url):
                if profile.cover_url != COVER_PHOTO:
                    profile.cover_url = COVER_PHOTO
                    profile.save(update_fields=["cover_url", "updated_at"])
                cover_set = True

        self.stdout.write(
            f"Items: {updated} updated, {skipped} already had a photo, "
            f"{len(unmatched)} unmatched"
        )
        if unmatched:
            self.stdout.write("Unmatched items: " + ", ".join(unmatched))
        self.stdout.write(f"Categories: {cat_updated} updated")
        self.stdout.write(f"Cover photo set: {cover_set} ({COVER_PHOTO})")
