from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

# Primero, desregistra si ya existe
admin.site.unregister(CustomUser)

# Luego registra con la configuración personalizada
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    # Campos a mostrar en la lista de usuarios
    list_display = ('rut', 'nombre', 'apellido', 'correo', 'tipo_contrato', 'is_staff', 'is_active')
    
    # Campos por los que se puede buscar
    search_fields = ('rut', 'nombre', 'apellido', 'correo')
    
    # Filtros en el sidebar
    list_filter = ('tipo_contrato', 'is_staff', 'is_active', 'date_joined')
    
    # Ordenamiento por defecto
    ordering = ('rut',)
    
    # Campos a mostrar en el formulario de edición
    fieldsets = (
        ('Información Personal', {
            'fields': ('rut', 'nombre', 'apellido', 'correo', 'telefono', 'direccion')
        }),
        ('Información Laboral', {
            'fields': ('tipo_contrato',)
        }),
        ('Permisos', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Fechas Importantes', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    
    # Campos a mostrar al crear un nuevo usuario
    add_fieldsets = (
        ('Información Personal', {
            'classes': ('wide',),
            'fields': ('rut', 'nombre', 'apellido', 'correo', 'telefono', 'direccion', 'password1', 'password2'),
        }),
        ('Información Laboral', {
            'fields': ('tipo_contrato',)
        }),
        ('Permisos', {
            'fields': ('is_staff', 'is_active')
        }),
    )
    
    # Campos de solo lectura
    readonly_fields = ('last_login', 'date_joined')