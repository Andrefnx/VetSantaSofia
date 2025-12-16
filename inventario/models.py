# hospital/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone

class Insumo(models.Model):
    TIPO_MOVIMIENTO_CHOICES = [
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
        ('registro_inicial', 'Registro Inicial'),
    ]
    
    FORMATO_CHOICES = [
        ('liquido', 'Líquido'),
        ('pastilla', 'Pastilla'),
        ('pipeta', 'Pipeta'),
        ('inyectable', 'Inyectable'),
        ('polvo', 'Polvo'),
        ('crema', 'Crema'),
        ('otro', 'Otro'),
    ]
    
    idInventario = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=255)
    marca = models.CharField(max_length=100, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    tipo = models.CharField(max_length=100, blank=True, null=True)
    formato = models.CharField(max_length=50, choices=FORMATO_CHOICES, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    especie = models.CharField(max_length=100, blank=True, null=True)
    
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=10, help_text="Nivel mínimo de stock (rojo)")
    stock_medio = models.IntegerField(default=20, help_text="Nivel medio de stock (naranja)")
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    archivado = models.BooleanField(default=False, help_text="Producto archivado (no se muestra en listado activo)")
    
    # Campos para dosis - MEJORADOS
    # Para líquidos
    dosis_ml = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Dosis en ml (para líquidos)")
    ml_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="ML por contenedor")
    
    # Para pastillas
    cantidad_pastillas = models.IntegerField(null=True, blank=True, help_text="Cantidad de pastillas")
    
    # Para pipetas
    unidades_pipeta = models.IntegerField(null=True, blank=True, help_text="Unidades de pipeta")
    
    # Peso de referencia (común para todos)
    peso_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Peso de referencia en kg")
    
    # Rango de peso
    tiene_rango_peso = models.BooleanField(default=False, help_text="¿Tiene rango de peso específico?")
    peso_min_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Peso mínimo en kg")
    peso_max_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Peso máximo en kg")
    
    # Campos informativos
    precauciones = models.TextField(blank=True, null=True)
    contraindicaciones = models.TextField(blank=True, null=True)
    efectos_adversos = models.TextField(blank=True, null=True)
    
    # Campos de seguimiento
    fecha_creacion = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    ultimo_ingreso = models.DateTimeField(null=True, blank=True)
    ultimo_movimiento = models.DateTimeField(null=True, blank=True)
    tipo_ultimo_movimiento = models.CharField(max_length=20, choices=TIPO_MOVIMIENTO_CHOICES, null=True, blank=True)
    usuario_ultimo_movimiento = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'inventario'
        verbose_name = 'Insumo'
        verbose_name_plural = 'Insumos'
        ordering = ['medicamento']
    
    def __str__(self):
        return self.medicamento
    
    def get_usuario_nombre_completo(self):
        if self.usuario_ultimo_movimiento:
            return f"{self.usuario_ultimo_movimiento.nombre} {self.usuario_ultimo_movimiento.apellido}"
        return "(sin registro)"
    
    def get_stock_nivel(self):
        """Retorna el nivel de stock: 'bajo', 'medio', 'alto'"""
        if self.stock_actual <= self.stock_minimo:
            return 'bajo'
        elif self.stock_actual <= self.stock_medio:
            return 'medio'
        else:
            return 'alto'
    
    def get_stock_color(self):
        """Retorna el color según el nivel de stock"""
        nivel = self.get_stock_nivel()
        colores = {
            'bajo': '#dc2626',    # rojo
            'medio': '#f59e0b',   # naranja
            'alto': '#16a34a'     # verde
        }
        return colores.get(nivel, '#6b7280')
    
    def get_dosis_display(self):
        """Retorna la dosis formateada según el formato del producto"""
        if not self.formato:
            return "-"
        
        # Rango de peso
        rango_peso = ""
        if self.tiene_rango_peso and self.peso_min_kg and self.peso_max_kg:
            rango_peso = f" ({self.peso_min_kg}-{self.peso_max_kg} kg)"
        elif self.peso_kg:
            rango_peso = f" por {self.peso_kg} kg"
        
        if self.formato == 'liquido' and self.dosis_ml:
            return f"{self.dosis_ml} ml{rango_peso}"
        elif self.formato == 'pastilla' and self.cantidad_pastillas:
            pastilla_texto = "pastilla" if self.cantidad_pastillas == 1 else "pastillas"
            return f"{self.cantidad_pastillas} {pastilla_texto}{rango_peso}"
        elif self.formato == 'pipeta' and self.unidades_pipeta:
            unidad_texto = "unidad" if self.unidades_pipeta == 1 else "unidades"
            return f"{self.unidades_pipeta} {unidad_texto}{rango_peso}"
        elif self.formato == 'inyectable' and self.dosis_ml:
            return f"{self.dosis_ml} ml{rango_peso}"
        
        return "-"
    
    def calcular_envases_requeridos(self, peso_paciente_kg, dias_tratamiento=1):
        """
        Calcula la cantidad de ENVASES completos requeridos para un tratamiento.
        
        REGLAS:
        - stock_actual = número de ENVASES (no unidades sueltas)
        - 1 envase contiene según formato:
          * liquido/inyectable → ml_contenedor (ML)
          * pastilla → cantidad_pastillas (unidades)
          * pipeta → unidades_pipeta (unidades)
          * polvo/crema/otro → ml_contenedor (contenido genérico)
        
        Args:
            peso_paciente_kg (float): Peso del paciente en kg
            dias_tratamiento (int): Días de duración del tratamiento (default: 1)
        
        Returns:
            dict: {
                'envases_requeridos': int,  # Siempre entero, redondeado hacia arriba
                'calculo_automatico': bool,  # True si se pudo calcular automáticamente
                'detalle': str,  # Descripción del cálculo
                'dosis_calculada': float,  # Dosis total calculada
                'contenido_envase': float,  # Contenido de 1 envase
            }
        """
        import math
        from decimal import Decimal
        
        resultado = {
            'envases_requeridos': 1,  # Por defecto: 1 envase
            'calculo_automatico': False,
            'detalle': '',
            'dosis_calculada': 0,
            'contenido_envase': 0,
        }
        
        # Validar datos de entrada
        if not peso_paciente_kg or peso_paciente_kg <= 0:
            resultado['detalle'] = "Peso del paciente no válido"
            return resultado
        
        if not self.formato:
            resultado['detalle'] = "Formato no definido - requiere cálculo manual"
            return resultado
        
        # PASO 1: Determinar CONTENIDO de 1 ENVASE según formato
        contenido_envase = None
        
        if self.formato in ['liquido', 'inyectable']:
            if self.ml_contenedor:
                contenido_envase = float(self.ml_contenedor)
        elif self.formato == 'pastilla':
            if self.cantidad_pastillas:
                contenido_envase = float(self.cantidad_pastillas)
        elif self.formato == 'pipeta':
            if self.unidades_pipeta:
                contenido_envase = float(self.unidades_pipeta)
        elif self.formato in ['polvo', 'crema', 'otro']:
            # Usar ml_contenedor como contenido genérico
            if self.ml_contenedor:
                contenido_envase = float(self.ml_contenedor)
        
        if not contenido_envase or contenido_envase <= 0:
            resultado['detalle'] = f"Contenido del envase no definido para formato '{self.formato}'"
            return resultado
        
        resultado['contenido_envase'] = contenido_envase
        
        # PASO 2: Calcular DOSIS TOTAL requerida
        dosis_total = 0
        
        # Para líquidos e inyectables: usar dosis_ml
        if self.formato in ['liquido', 'inyectable']:
            if not self.dosis_ml:
                resultado['detalle'] = "Dosis (ml) no definida - requiere cálculo manual"
                return resultado
            
            # Calcular dosis según peso
            if self.peso_kg and self.peso_kg > 0:
                # dosis_ml es "por X kg", calcular proporcionalmente
                factor_peso = float(peso_paciente_kg) / float(self.peso_kg)
                dosis_diaria = float(self.dosis_ml) * factor_peso
            else:
                # dosis_ml es fija
                dosis_diaria = float(self.dosis_ml)
            
            dosis_total = dosis_diaria * dias_tratamiento
        
        # Para pastillas: cantidad_pastillas define la dosis
        elif self.formato == 'pastilla':
            # Si hay peso de referencia, ajustar
            if self.peso_kg and self.peso_kg > 0:
                # Verificar rango de peso si existe
                if self.tiene_rango_peso:
                    if self.peso_min_kg and peso_paciente_kg < float(self.peso_min_kg):
                        resultado['detalle'] = f"Peso del paciente ({peso_paciente_kg} kg) menor al mínimo recomendado ({self.peso_min_kg} kg)"
                        return resultado
                    if self.peso_max_kg and peso_paciente_kg > float(self.peso_max_kg):
                        resultado['detalle'] = f"Peso del paciente ({peso_paciente_kg} kg) mayor al máximo recomendado ({self.peso_max_kg} kg)"
                        return resultado
            
            # Asumir que cantidad_pastillas es la dosis diaria
            dosis_diaria = float(self.cantidad_pastillas) if self.cantidad_pastillas else 1
            dosis_total = dosis_diaria * dias_tratamiento
        
        # Para pipetas: generalmente 1 unidad por aplicación
        elif self.formato == 'pipeta':
            # Verificar rango de peso si existe
            if self.tiene_rango_peso:
                if self.peso_min_kg and peso_paciente_kg < float(self.peso_min_kg):
                    resultado['detalle'] = f"Peso del paciente ({peso_paciente_kg} kg) menor al mínimo recomendado ({self.peso_min_kg} kg)"
                    return resultado
                if self.peso_max_kg and peso_paciente_kg > float(self.peso_max_kg):
                    resultado['detalle'] = f"Peso del paciente ({peso_paciente_kg} kg) mayor al máximo recomendado ({self.peso_max_kg} kg)"
                    return resultado
            
            # Pipetas: típicamente 1 unidad por aplicación
            dosis_total = 1 * dias_tratamiento
        
        # Para otros formatos: usar ml_contenedor como referencia
        else:
            if self.dosis_ml:
                dosis_diaria = float(self.dosis_ml)
                dosis_total = dosis_diaria * dias_tratamiento
            else:
                resultado['detalle'] = "Dosis no definida para formato genérico - requiere cálculo manual"
                return resultado
        
        resultado['dosis_calculada'] = dosis_total
        
        # PASO 3: Calcular ENVASES REQUERIDOS (siempre redondear hacia arriba)
        if dosis_total > 0 and contenido_envase > 0:
            envases_calculados = dosis_total / contenido_envase
            envases_requeridos = math.ceil(envases_calculados)  # SIEMPRE redondear hacia arriba
            
            resultado['envases_requeridos'] = envases_requeridos
            resultado['calculo_automatico'] = True
            resultado['detalle'] = (
                f"Dosis total: {dosis_total:.2f} unidades | "
                f"Contenido por envase: {contenido_envase:.2f} | "
                f"Envases: {envases_requeridos} (calculado: {envases_calculados:.2f})"
            )
        else:
            resultado['detalle'] = "No se pudo calcular automáticamente - valores insuficientes"
        
        return resultado
