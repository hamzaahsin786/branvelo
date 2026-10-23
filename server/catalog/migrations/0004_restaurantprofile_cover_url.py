# Storefront upgrade: optional cover (hero banner) photo on the profile.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0003_category_coupon_deliveryzone_menuitem_modifiergroup_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="restaurantprofile",
            name="cover_url",
            field=models.URLField(
                blank=True,
                help_text="Wide banner photo for the storefront hero (optional).",
            ),
        ),
    ]
