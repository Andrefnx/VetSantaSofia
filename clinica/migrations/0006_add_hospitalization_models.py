# Generated migration for hospitalization models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('clinica', '0005_consulta_tipo_consulta_alter_consulta_diagnostico_and_more'),
    ]

    operations = [
        # Actualizar modelo Hospitalizacion existente
        migrations.AddField(
            model_name='hospitalizacion',
            name='diagnostico_hosp',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='hospitalizacion',
            name='notas',
            field=models.TextField(blank=True, null=True),
            preserve_default=True,
        ),
        migrations.RenameField(
            model_name='hospitalizacion',
            old_name='notas',
            new_name='observaciones',
        ),
        
        # Crear modelo Cirugia
        migrations.CreateModel(
            name='Cirugia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_cirugia', models.DateTimeField()),
                ('tipo_cirugia', models.CharField(max_length=200)),
                ('descripcion', models.TextField()),
                ('duracion_minutos', models.IntegerField(blank=True, null=True)),
                ('anestesiologo', models.CharField(blank=True, max_length=100)),
                ('tipo_anestesia', models.CharField(blank=True, max_length=100)),
                ('complicaciones', models.TextField(blank=True)),
                ('resultado', models.CharField(choices=[('exitosa', 'Exitosa'), ('parcial', 'Parcial'), ('problemas', 'Con problemas')], default='exitosa', max_length=20)),
                ('hospitalizacion', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='cirugia', to='clinica.hospitalizacion')),
                ('veterinario_cirujano', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cirugias_realizadas', to=settings.AUTH_USER_MODEL)),
                ('medicamentos', models.ManyToManyField(blank=True, related_name='cirugias_usadas', to='inventario.insumo')),
            ],
            options={
                'verbose_name': 'Cirugía',
                'verbose_name_plural': 'Cirugías',
                'ordering': ['-fecha_cirugia'],
            },
        ),
        
        # Crear modelo RegistroDiario
        migrations.CreateModel(
            name='RegistroDiario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_registro', models.DateTimeField()),
                ('temperatura', models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True)),
                ('peso', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('frecuencia_cardiaca', models.IntegerField(blank=True, null=True)),
                ('frecuencia_respiratoria', models.IntegerField(blank=True, null=True)),
                ('observaciones', models.TextField(blank=True)),
                ('hospitalizacion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='registros_diarios', to='clinica.hospitalizacion')),
                ('medicamentos', models.ManyToManyField(blank=True, related_name='registros_usados', to='inventario.insumo')),
            ],
            options={
                'verbose_name': 'Registro Diario',
                'verbose_name_plural': 'Registros Diarios',
                'ordering': ['-fecha_registro'],
            },
        ),
        
        # Crear modelo Alta
        migrations.CreateModel(
            name='Alta',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_alta', models.DateTimeField()),
                ('diagnostico_final', models.TextField()),
                ('tratamiento_post_alta', models.TextField()),
                ('recomendaciones', models.TextField()),
                ('proxima_revision', models.DateField(blank=True, null=True)),
                ('hospitalizacion', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='alta_medica', to='clinica.hospitalizacion')),
            ],
            options={
                'verbose_name': 'Alta Médica',
                'verbose_name_plural': 'Altas Médicas',
            },
        ),
    ]
