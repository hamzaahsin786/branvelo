# Tax settings + SEO text on the profile, ETA on zones, branches.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0006_restaurantprofile_cover_photos_deal"),
    ]

    operations = [
        migrations.AddField(
            model_name="restaurantprofile",
            name="tax_country",
            field=models.CharField(default="PK", max_length=2),
        ),
        migrations.AddField(
            model_name="restaurantprofile",
            name="tax_rate_percent",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="restaurantprofile",
            name="tax_digital_rate_percent",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="restaurantprofile",
            name="tax_name",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="restaurantprofile",
            name="tax_on_delivery",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="restaurantprofile",
            name="seo_text",
            field=models.TextField(
                blank=True, help_text="Short marketing text for the footer."
            ),
        ),
        migrations.AddField(
            model_name="deliveryzone",
            name="eta_minutes",
            field=models.IntegerField(
                default=45,
                help_text="Typical delivery time shown to customers.",
            ),
        ),
        migrations.CreateModel(
            name="Branch",
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
                ("name", models.CharField(max_length=80)),
                ("address", models.TextField(blank=True)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("sort", models.IntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"db_table": "branches", "ordering": ["sort", "id"]},
        ),
    ]
