from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    # Campos a mostrar en la lista de usuarios
    list_display = ['rut', 'nombre', 'apellido', 'correo', 'rol', 'is_staff', 'is_active']
    
    # Campos por los que se puede buscar
    search_fields = ('rut', 'nombre', 'apellido', 'correo')
    
    # Filtros en el sidebar
    list_filter = ['is_staff', 'is_active', 'rol']
    
    # Ordenamiento por defecto
    ordering = ('rut',)
    
    # Campos a mostrar en el formulario de edición
    fieldsets = (
        (None, {'fields': ('rut', 'password')}),
        ('Información Personal', {'fields': ('nombre', 'apellido', 'correo', 'telefono', 'direccion')}),
        ('Información Laboral', {'fields': ('tipo_contrato', 'rol')}),
        ('Permisos', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fechas Importantes', {'fields': ('last_login', 'date_joined')}),
    )
    
    # Campos a mostrar al crear un nuevo usuario
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('rut', 'nombre', 'apellido', 'correo', 'password1', 'password2', 'rol', 'is_staff', 'is_active')}
        ),
    )
    
    # Campos de solo lectura
    readonly_fields = ('last_login', 'date_joined')