from django.db import models

class Cliente(models.Model):
    idCliente = models.AutoField(primary_key=True)
    rutCliente = models.IntegerField()
    dvCliente = models.IntegerField()
    nombreCliente = models.CharField(max_length=100)
    telCliente = models.CharField(max_length=15)
    emailCliente = models.EmailField()
    direccion = models.CharField(max_length=200)

    def __str__(self):
        return self.nombreCliente


class Mascota(models.Model):
    idMascota = models.AutoField(primary_key=True)
    nombreMascota = models.CharField(max_length=100)
    animal_mascota = models.CharField(max_length=50)
    raza_mascota = models.CharField(max_length=50)
    edad = models.IntegerField()
    peso = models.FloatField()
    idCliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)

    def __str__(self):
        return self.nombreMascota


class DocumentoMascota(models.Model):
    mascota = models.ForeignKey(Mascota, on_delete=models.CASCADE, related_name='documentos')
    archivo = models.FileField(upload_to='documentos_mascota/')
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Documento de {self.mascota.nombreMascota}"


class Consulta(models.Model):
    idConsulta = models.AutoField(primary_key=True)
    idMascota = models.ForeignKey(Mascota, on_delete=models.CASCADE)
    fecha_consulta = models.DateField()
    motivo_consulta = models.TextField()
    diagnostico = models.CharField(max_length=255)
    tratamiento = models.CharField(max_length=100)
    veterinario = models.CharField(max_length=60)

    def __str__(self):
        return f"Consulta {self.idConsulta} - {self.idMascota.nombreMascota}"


class Agenda(models.Model):
    idMascota = models.ForeignKey(Mascota, on_delete=models.CASCADE)
    fecha_agenda = models.DateField()
    hora_agenda = models.TimeField()
    nombreMascota = models.CharField(max_length=100)
    nombre_apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=15)
    razon = models.CharField(max_length=100)
    estado = models.CharField(
        max_length=20,
        choices=[
            ('pendiente', 'Pendiente'),
            ('confirmada', 'Confirmada'),
            ('cancelada', 'Cancelada'),
        ],
        default='pendiente'
    )

    class Meta:
        unique_together = ('nombreMascota', 'fecha_agenda', 'hora_agenda')

    def __str__(self):
        return f"{self.nombreMascota} - {self.fecha_agenda}"
