from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone

class CustomUserManager(BaseUserManager):
    def create_user(self, rut, password=None, **extra_fields):
        if not rut:
            raise ValueError("El usuario debe tener un RUT")

        rut = rut.strip().upper()
        user = self.model(rut=rut, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, rut, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('rol', 'administracion')  # Rol por defecto para superusuarios

        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True.')

        return self.create_user(rut, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLES = [
        ('administracion', 'Administración'),
        ('veterinario', 'Veterinario'),
        ('recepcion', 'Recepción'),
    ]
    
    rut = models.CharField(max_length=12, unique=True, verbose_name="RUT")
    nombre = models.CharField(max_length=50)
    apellido = models.CharField(max_length=50)
    correo = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    tipo_contrato = models.CharField(max_length=50, blank=True, null=True)
    rol = models.CharField(max_length=20, choices=ROLES, default='recepcion', verbose_name="Rol")

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = CustomUserManager()

    USERNAME_FIELD = 'rut'
    REQUIRED_FIELDS = ['correo', 'nombre', 'apellido']

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.rut})"
    
    def get_rol_display_custom(self):
        """Retorna el rol con formato personalizado"""
        if self.is_staff and self.is_superuser:
            return 'Administración'
        return self.get_rol_display()
