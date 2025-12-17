from django.contrib import admin
from .models import Venta, DetalleVenta, SesionCaja

# Register your models here.

class DetalleVentaInline(admin.TabularInline):
    model = DetalleVenta
    extra = 0
    readonly_fields = ('tipo', 'descripcion', 'cantidad', 'precio_unitario', 'subtotal')
    can_delete = False

@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ('numero_venta', 'tipo_origen', 'estado', 'total', 'fecha_creacion', 'sesion')
    list_filter = ('estado', 'tipo_origen', 'metodo_pago', 'fecha_creacion')
    search_fields = ('numero_venta', 'paciente__nombre', 'paciente__propietario__nombre')
    readonly_fields = ('numero_venta', 'fecha_creacion', 'subtotal_servicios', 'subtotal_insumos', 'total', 'descuento')
    inlines = [DetalleVentaInline]
    
    fieldsets = (
        ('Información General', {
            'fields': ('numero_venta', 'sesion', 'estado', 'tipo_origen', 'paciente')
        }),
        ('Origen', {
            'fields': ('consulta', 'hospitalizacion'),
            'classes': ('collapse',)
        }),
        ('Montos', {
            'fields': ('subtotal_servicios', 'subtotal_insumos', 'descuento', 'total', 'metodo_pago')
        }),
        ('Pago', {
            'fields': ('fecha_pago', 'usuario_cobro'),
            'classes': ('collapse',)
        }),
        ('Registro', {
            'fields': ('fecha_creacion', 'usuario_creacion'),
            'classes': ('collapse',)
        }),
        ('Observaciones', {
            'fields': ('observaciones',),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return False  # No permitir crear ventas desde el admin
    
    def has_delete_permission(self, request, obj=None):
        return False  # No permitir eliminar ventas desde el admin

@admin.register(SesionCaja)
class SesionCajaAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario_apertura', 'esta_cerrada', 'fecha_apertura', 'fecha_cierre', 'monto_inicial')
    list_filter = ('esta_cerrada', 'fecha_apertura')
    search_fields = ('usuario_apertura__username', 'usuario_cierre__username')
    readonly_fields = ('fecha_apertura', 'fecha_cierre', 'monto_final_calculado', 'monto_final_contado', 'diferencia')
    
    fieldsets = (
        ('Información General', {
            'fields': ('usuario_apertura', 'usuario_cierre', 'esta_cerrada')
        }),
        ('Montos', {
            'fields': ('monto_inicial', 'monto_final_calculado', 'monto_final_contado', 'diferencia')
        }),
        ('Fechas', {
            'fields': ('fecha_apertura', 'fecha_cierre')
        }),
        ('Observaciones', {
            'fields': ('observaciones_apertura', 'observaciones_cierre'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return False  # No permitir crear sesiones desde el admin
    
    def has_delete_permission(self, request, obj=None):
        return False  # No permitir eliminar sesiones desde el admin
