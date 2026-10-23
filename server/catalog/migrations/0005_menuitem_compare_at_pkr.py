# compare_at_pkr: strikethrough "was" pricing on menu items (indolj-style
# sale presentation). Nullable; only rendered when higher than price_pkr.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0004_restaurantprofile_cover_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="menuitem",
            name="compare_at_pkr",
            field=models.IntegerField(
                blank=True,
                help_text="Original price before a discount, whole rupees. "
                "Shown struck through next to price_pkr when higher.",
                null=True,
            ),
        ),
    ]
