# Order tax total, customer note and pickup branch snapshot.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ordering", "0002_order_assigned_rider"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="tax_pkr",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="order",
            name="customer_note",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="order",
            name="branch_name",
            field=models.CharField(
                blank=True,
                help_text="Pickup branch snapshot for this order.",
                max_length=120,
            ),
        ),
    ]
