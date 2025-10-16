from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notes', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='workspace',
            name='ai_key_enc',
            field=models.TextField(blank=True, null=True),
        ),
    ]

