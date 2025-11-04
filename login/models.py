from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class UsuarioManager(BaseUserManager):
    """Manager personalizado para el modelo Usuario"""
    
    def create_user(self, rut, email, password=None, **extra_fields):
        """Crea y guarda un usuario normal"""
        if not rut:
            raise ValueError('El RUT es obligatorio')
        if not email:
            raise ValueError('El email es obligatorio')
        
        email = self.normalize_email(email)
        # Usar rut también como username
        extra_fields.setdefault('username', rut)
        user = self.model(rut=rut, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, rut, email, password=None, **extra_fields):
        """Crea y guarda un superusuario"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser debe tener is_superuser=True.')
        
        return self.create_user(rut, email, password, **extra_fields)

class Usuario(AbstractUser):
    rut = models.CharField(max_length=12, unique=True, verbose_name="RUT")
    telefono = models.CharField(max_length=15, blank=True, null=True, verbose_name="Teléfono")
    direccion = models.CharField(max_length=255, blank=True, null=True, verbose_name="Dirección")
    fecha_nacimiento = models.DateField(blank=True, null=True, verbose_name="Fecha de Nacimiento")
    
    # Usar el manager personalizado
    objects = UsuarioManager()
    
    # Override username to use RUT
    USERNAME_FIELD = 'rut'
    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']
    
    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
    
    def __str__(self):
        return f"{self.rut} - {self.get_full_name()}"
    
    def save(self, *args, **kwargs):
        # Asegurar que username sea igual a rut
        if not self.username:
            self.username = self.rut
        super().save(*args, **kwargs)
