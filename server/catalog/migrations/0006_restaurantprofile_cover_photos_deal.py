# Cover carousel (RestaurantProfile.cover_photos; cover_url stays as the
# first-slide mirror) and the Deal model (priced bundles managed in the
# admin, priced server-side at checkout, snapshotted onto order lines).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0005_menuitem_compare_at_pkr"),
    ]

    operations = [
        migrations.AddField(
            model_name="restaurantprofile",
            name="cover_photos",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Banner slides for the storefront hero carousel. "
                "cover_url mirrors the first slide for older readers.",
            ),
        ),
        migrations.CreateModel(
            name="Deal",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                (
                    "contents",
                    models.TextField(
                        blank=True,
                        help_text="What is included, one line per item "
                        "(shown on the card).",
                    ),
                ),
                (
                    "price_pkr",
                    models.IntegerField(default=0, help_text="Whole rupees."),
                ),
                (
                    "compare_at_pkr",
                    models.IntegerField(
                        blank=True,
                        help_text="Total if bought separately; shown struck "
                        "through when higher than price_pkr.",
                        null=True,
                    ),
                ),
                ("photo_url", models.URLField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("sort", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "deals",
                "ordering": ["sort", "id"],
            },
        ),
    ]
