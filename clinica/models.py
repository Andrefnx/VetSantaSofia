from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from pacientes.models import Paciente
from inventario.models import Insumo
from servicios.models import Servicio

class Consulta(models.Model):
    """Modelo para consultas veterinarias"""
    TIPO_CONSULTA_CHOICES = [
        ('consulta_general', 'Consulta general'),
        ('urgencia', 'Urgencia'),
        ('vacuna', 'Vacuna'),
        ('desparacitacion', 'Desparacitación'),
        ('control', 'Control'),
        ('cirugia', 'Cirugía'),
        ('otros', 'Otros'),
    ]
    
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='consultas')
    fecha = models.DateTimeField(default=timezone.now)
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    tipo_consulta = models.CharField(max_length=30, choices=TIPO_CONSULTA_CHOICES, default='consulta_general')
    temperatura = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    peso = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    frecuencia_cardiaca = models.IntegerField(null=True, blank=True)
    frecuencia_respiratoria = models.IntegerField(null=True, blank=True)
    otros = models.TextField(blank=True, null=True)
    diagnostico = models.TextField()
    tratamiento = models.TextField(blank=True)
    notas = models.TextField(blank=True)
    
    # ⭐ NUEVO: Relación ManyToMany con Insumos
    medicamentos = models.ManyToManyField(Insumo, blank=True, related_name='consultas_usadas')
    
    # ⭐ Relación ManyToMany con Servicios
    servicios = models.ManyToManyField(Servicio, blank=True, related_name='consultas')
    
    # ⭐ Control de descuento de inventario
    insumos_descontados = models.BooleanField(
        default=False,
        help_text="Indica si los insumos de esta consulta ya fueron descontados del inventario. "
                  "Previene descuentos duplicados."
    )
    
    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Consulta'
        verbose_name_plural = 'Consultas'
    
    def __str__(self):
        return f"Consulta de {self.paciente.nombre} - {self.fecha.strftime('%d/%m/%Y')}"
    
    def servicios_nombres(self):
        """Retorna los nombres de los servicios separados por comas"""
        return ', '.join([s.nombre for s in self.servicios.all()]) if self.servicios.exists() else self.get_tipo_consulta_display()
    
    def confirmar_y_descontar_insumos(self, usuario, dias_tratamiento=1):
        """
        Confirma la consulta y descuenta todos los insumos asociados.
        
        MOMENTO DE EJECUCIÓN: Solo al confirmar/finalizar la consulta.
        
        Proceso:
        1. Valida que no se haya descontado previamente (insumos_descontados=False)
        2. Para cada ConsultaInsumo:
           - Llama a descontar_stock() que usa calcular_envases_requeridos()
           - Valida stock suficiente
           - Descuenta envases completos
        3. Marca consulta.insumos_descontados = True
        
        Args:
            usuario: Usuario que confirma
            dias_tratamiento: Días del tratamiento (default: 1)
        
        Returns:
            dict: {
                'success': bool,
                'insumos_descontados': [list],
                'total_items': int
            }
        
        Raises:
            ValidationError: Si ya descontado o stock insuficiente
        """
        from django.db import transaction
        
        # Validar que no se haya descontado previamente
        if self.insumos_descontados:
            raise ValidationError(
                "Los insumos de esta consulta ya fueron descontados del inventario."
            )
        
        insumos_detalle = self.insumos_detalle.all()
        
        if not insumos_detalle.exists():
            # Sin insumos, solo marcar como procesado
            self.insumos_descontados = True
            self.save(update_fields=['insumos_descontados'])
            return {
                'success': True,
                'insumos_descontados': [],
                'total_items': 0,
                'message': 'Consulta confirmada sin insumos asociados'
            }
        
        resultados = []
        
        # Descontar dentro de transacción atómica
        with transaction.atomic():
            for detalle in insumos_detalle:
                try:
                    resultado = detalle.descontar_stock(usuario, dias_tratamiento)
                    resultados.append(resultado)
                except ValidationError as e:
                    # Re-lanzar para rollback de toda la transacción
                    raise ValidationError(
                        f"Error al descontar {detalle.insumo.medicamento}: {str(e)}"
                    )
            
            # Marcar consulta como procesada
            self.insumos_descontados = True
            self.save(update_fields=['insumos_descontados'])
        
        return {
            'success': True,
            'insumos_descontados': resultados,
            'total_items': len(resultados),
            'message': f'✅ {len(resultados)} insumos descontados correctamente'
        }


class MedicamentoUtilizado(models.Model):
    """Medicamentos utilizados en una consulta"""
    consulta = models.ForeignKey(Consulta, on_delete=models.CASCADE, related_name='medicamentos_detalle')
    inventario_id = models.IntegerField(blank=True, null=True, help_text="ID del producto de inventario")
    nombre = models.CharField(max_length=200)
    dosis = models.CharField(max_length=100, blank=True, null=True)
    peso_paciente = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Medicamento Utilizado'
        verbose_name_plural = 'Medicamentos Utilizados'
    
    def __str__(self):
        return f"{self.nombre} - {self.dosis or 'Sin dosis'}"


class Hospitalizacion(models.Model):
    """Modelo para hospitalizaciones"""
    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('alta', 'Alta'),
        ('fallecido', 'Fallecido'),
    ]
    
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='hospitalizaciones')
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='hospitalizaciones_atendidas')
    fecha_ingreso = models.DateTimeField()
    fecha_alta = models.DateTimeField(blank=True, null=True)
    motivo = models.TextField()
    diagnostico_hosp = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activa')
    observaciones = models.TextField(blank=True, null=True)
    # Insumos/implementos usados durante la hospitalización completa
    insumos = models.ManyToManyField(Insumo, blank=True, related_name='hospitalizaciones_usadas')
    
    # ⭐ Control de descuento de inventario
    insumos_descontados = models.BooleanField(
        default=False,
        help_text="Indica si los insumos de esta hospitalización ya fueron descontados del inventario. "
                  "Previene descuentos duplicados."
    )
    
    class Meta:
        ordering = ['-fecha_ingreso']
        verbose_name = 'Hospitalización'
        verbose_name_plural = 'Hospitalizaciones'
    
    def clean(self):
        """Valida que no haya otra hospitalización activa para el mismo paciente"""
        if self.estado == 'activa':
            # Buscar otras hospitalizaciones activas para el mismo paciente
            hosp_activas = Hospitalizacion.objects.filter(
                paciente=self.paciente,
                estado='activa'
            ).exclude(pk=self.pk)  # Excluir la actual si es una edición
            
            if hosp_activas.exists():
                raise ValidationError(
                    f"El paciente {self.paciente.nombre} ya tiene una hospitalización activa. "
                    f"No es posible crear una nueva hospitalización mientras haya una activa."
                )
    
    def save(self, *args, **kwargs):
        """Llama al método clean antes de guardar"""
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Hospitalización de {self.paciente.nombre} - {self.fecha_ingreso.strftime('%d/%m/%Y')}"
    
    def finalizar_y_descontar_insumos(self, usuario, dias_tratamiento=None):
        """
        Finaliza la hospitalización y descuenta todos los insumos asociados.
        
        Similar a Consulta.confirmar_y_descontar_insumos() pero para hospitalizaciones.
        Si dias_tratamiento no se especifica, se calcula desde fecha_ingreso hasta fecha_alta.
        
        Args:
            usuario: Usuario que finaliza
            dias_tratamiento: Días del tratamiento (si None, se calcula automáticamente)
        
        Returns:
            dict: Resultado del descuento
        """
        from django.db import transaction
        from datetime import timedelta
        
        if self.insumos_descontados:
            raise ValidationError(
                "Los insumos de esta hospitalización ya fueron descontados del inventario."
            )
        
        # Calcular días de tratamiento si no se especifica
        if dias_tratamiento is None and self.fecha_alta:
            delta = self.fecha_alta - self.fecha_ingreso
            dias_tratamiento = max(1, delta.days)  # Mínimo 1 día
        elif dias_tratamiento is None:
            dias_tratamiento = 1  # Default
        
        insumos_detalle = self.insumos_detalle.all()
        
        if not insumos_detalle.exists():
            self.insumos_descontados = True
            self.save(update_fields=['insumos_descontados'])
            return {
                'success': True,
                'insumos_descontados': [],
                'total_items': 0,
                'message': 'Hospitalización finalizada sin insumos asociados'
            }
        
        resultados = []
        
        with transaction.atomic():
            for detalle in insumos_detalle:
                try:
                    resultado = detalle.descontar_stock(usuario, dias_tratamiento)
                    resultados.append(resultado)
                except ValidationError as e:
                    raise ValidationError(
                        f"Error al descontar {detalle.insumo.medicamento}: {str(e)}"
                    )
            
            self.insumos_descontados = True
            self.save(update_fields=['insumos_descontados'])
        
        return {
            'success': True,
            'insumos_descontados': resultados,
            'total_items': len(resultados),
            'dias_tratamiento': dias_tratamiento,
            'message': f'✅ {len(resultados)} insumos descontados correctamente'
        }


class Cirugia(models.Model):
    """Modelo para cirugías dentro de una hospitalización"""
    RESULTADO_CHOICES = [
        ('', 'Sin resultado'),
        ('exitosa', 'Exitosa'),
        ('con_complicaciones', 'Con complicaciones'),
        ('problemas', 'Problemas'),
    ]
    
    hospitalizacion = models.ForeignKey(Hospitalizacion, on_delete=models.CASCADE, related_name='cirugias')
    servicio = models.ForeignKey(Servicio, on_delete=models.SET_NULL, null=True, blank=True, related_name='cirugias')
    fecha_cirugia = models.DateTimeField()
    veterinario_cirujano = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='cirugias_realizadas')
    tipo_cirugia = models.CharField(max_length=200)
    descripcion = models.TextField()
    duracion_minutos = models.IntegerField(blank=True, null=True)
    anestesiologo = models.CharField(max_length=100, blank=True)
    tipo_anestesia = models.CharField(max_length=100, blank=True)
    # Insumos/implementos usados en la cirugía (usa la misma lógica de consultas)
    medicamentos = models.ManyToManyField(Insumo, blank=True, related_name='cirugias_usadas')
    complicaciones = models.TextField(blank=True)
    resultado = models.CharField(max_length=25, choices=RESULTADO_CHOICES, default='', blank=True)
    
    class Meta:
        ordering = ['-fecha_cirugia']
        verbose_name = 'Cirugía'
        verbose_name_plural = 'Cirugías'
    
    def __str__(self):
        return f"{self.tipo_cirugia} - {self.fecha_cirugia.strftime('%d/%m/%Y')}"


class RegistroDiario(models.Model):
    """Registro diario durante hospitalización"""
    hospitalizacion = models.ForeignKey(Hospitalizacion, on_delete=models.CASCADE, related_name='registros_diarios')
    fecha_registro = models.DateTimeField()
    temperatura = models.DecimalField(max_digits=4, decimal_places=1)  # Obligatorio
    peso = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    frecuencia_cardiaca = models.IntegerField(null=True, blank=True)
    frecuencia_respiratoria = models.IntegerField(null=True, blank=True)
    observaciones = models.TextField(blank=True)
    medicamentos = models.ManyToManyField(Insumo, blank=True, related_name='registros_usados')
    
    class Meta:
        ordering = ['-fecha_registro']
        verbose_name = 'Registro Diario'
        verbose_name_plural = 'Registros Diarios'
    
    def __str__(self):
        return f"Registro {self.hospitalizacion.paciente.nombre} - {self.fecha_registro.strftime('%d/%m/%Y')}"


class Alta(models.Model):
    """Resumen de alta médica"""
    hospitalizacion = models.OneToOneField(Hospitalizacion, on_delete=models.CASCADE, related_name='alta_medica')
    fecha_alta = models.DateTimeField()
    diagnostico_final = models.TextField(blank=True)
    tratamiento_post_alta = models.TextField(blank=True)
    recomendaciones = models.TextField(blank=True)
    proxima_revision = models.DateField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Alta Médica'
        verbose_name_plural = 'Altas Médicas'
    
    def __str__(self):
        return f"Alta de {self.hospitalizacion.paciente.nombre} - {self.fecha_alta.strftime('%d/%m/%Y')}"


class Examen(models.Model):
    """Modelo para exámenes médicos"""
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='examenes')
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    fecha = models.DateField()
    tipo = models.CharField(max_length=100)
    resultado = models.TextField(blank=True, null=True)
    archivo = models.FileField(upload_to='examenes/', blank=True, null=True)
    
    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Examen'
        verbose_name_plural = 'Exámenes'
    
    def __str__(self):
        return f"{self.tipo} - {self.paciente.nombre} ({self.fecha})"


class Documento(models.Model):
    """Modelo para documentos adjuntos"""
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='documentos')
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    archivo = models.FileField(upload_to='documentos/')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-fecha_subida']
        verbose_name = 'Documento'
        verbose_name_plural = 'Documentos'
    
    def __str__(self):
        return f"{self.nombre} - {self.paciente.nombre}"


# =============================================================================
# ✅ NUEVOS MODELOS - Control de Insumos con Cálculo Automático por Dosis
# =============================================================================

class ConsultaInsumo(models.Model):
    """
    Tabla intermedia para registrar insumos usados en consultas
    con cálculo automático de cantidad basado en dosis y peso
    """
    consulta = models.ForeignKey(Consulta, on_delete=models.CASCADE, related_name='insumos_detalle')
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT)
    
    # Datos para el cálculo
    peso_paciente = models.DecimalField(max_digits=6, decimal_places=2)
    dosis_ml_por_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dosis_total_ml = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ml_por_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Cantidad final (puede ser automática o manual)
    cantidad_calculada = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    cantidad_manual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cantidad_final = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    
    # Metadata
    calculo_automatico = models.BooleanField(default=False)
    requiere_confirmacion = models.BooleanField(default=False, help_text="Faltan datos para cálculo automático")
    confirmado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='insumos_consulta_confirmados'
    )
    fecha_confirmacion = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)
    
    # Control de descuento
    stock_descontado = models.BooleanField(
        default=False,
        help_text="Indica si el stock de este insumo ya fue descontado. Previene descuentos duplicados."
    )
    fecha_descuento = models.DateTimeField(null=True, blank=True)
    
    # Registro
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Insumo de Consulta'
        verbose_name_plural = 'Insumos de Consulta'
        ordering = ['id']
    
    def __str__(self):
        return f"{self.insumo.medicamento} x{self.cantidad_final} - Consulta #{self.consulta.id}"
    
    def calcular_cantidad(self):
        """
        Calcula la cantidad de ítems necesarios basándose en:
        - Peso del paciente
        - Dosis ml/kg del insumo
        - ML por contenedor
        """
        from decimal import Decimal, ROUND_UP
        
        # Si ya tiene cantidad manual, usar esa
        if self.cantidad_manual:
            self.cantidad_final = self.cantidad_manual
            self.calculo_automatico = False
            return
        
        # Verificar datos mínimos para cálculo automático
        if not all([self.peso_paciente, self.dosis_ml_por_kg, self.ml_por_contenedor]):
            self.requiere_confirmacion = True
            self.cantidad_final = Decimal('1')  # Default
            return
        
        # Calcular dosis total
        self.dosis_total_ml = self.peso_paciente * self.dosis_ml_por_kg
        
        # Calcular cantidad de contenedores (redondear hacia arriba)
        self.cantidad_calculada = (self.dosis_total_ml / self.ml_por_contenedor).quantize(
            Decimal('1'), 
            rounding=ROUND_UP
        )
        
        self.cantidad_final = self.cantidad_calculada
        self.calculo_automatico = True
        self.requiere_confirmacion = False
    
    def save(self, *args, **kwargs):
        """Calcula cantidad antes de guardar"""
        self.calcular_cantidad()
        super().save(*args, **kwargs)
    
    def descontar_stock(self, usuario, dias_tratamiento=1):
        """
        Descuenta stock del insumo usando calcular_envases_requeridos().
        
        REGLAS:
        - Usa calcular_envases_requeridos() del modelo Insumo
        - Valida stock suficiente ANTES de descontar
        - Marca stock_descontado=True para evitar duplicados
        - Registra metadata del movimiento
        - NUNCA permite stock negativo
        
        Args:
            usuario: Usuario que realiza el descuento
            dias_tratamiento: Días de tratamiento (default: 1)
        
        Returns:
            dict: Resultado del descuento
        
        Raises:
            ValidationError: Si stock insuficiente o ya descontado
        """
        from django.db import transaction
        
        # Validar que no se haya descontado previamente
        if self.stock_descontado:
            raise ValidationError(
                f"El stock del insumo '{self.insumo.medicamento}' "
                f"ya fue descontado para esta consulta."
            )
        
        # Calcular envases requeridos
        resultado = self.insumo.calcular_envases_requeridos(
            peso_paciente_kg=float(self.peso_paciente),
            dias_tratamiento=dias_tratamiento
        )
        
        envases_requeridos = resultado['envases_requeridos']
        
        # Validar stock suficiente
        if self.insumo.stock_actual < envases_requeridos:
            raise ValidationError(
                f"Stock insuficiente para '{self.insumo.medicamento}'. "
                f"Requerido: {envases_requeridos} envases, "
                f"Disponible: {self.insumo.stock_actual} envases"
            )
        
        # Descontar stock dentro de transacción
        with transaction.atomic():
            # Actualizar stock del insumo
            stock_anterior = self.insumo.stock_actual
            self.insumo.stock_actual -= envases_requeridos
            self.insumo.ultimo_movimiento = timezone.now()
            self.insumo.tipo_ultimo_movimiento = 'salida'
            self.insumo.usuario_ultimo_movimiento = usuario
            self.insumo.save(update_fields=[
                'stock_actual',
                'ultimo_movimiento',
                'tipo_ultimo_movimiento',
                'usuario_ultimo_movimiento'
            ])
            
            # Marcar como descontado
            self.stock_descontado = True
            self.fecha_descuento = timezone.now()
            self.save(update_fields=['stock_descontado', 'fecha_descuento'])
        
        return {
            'success': True,
            'insumo': self.insumo.medicamento,
            'envases_descontados': envases_requeridos,
            'stock_anterior': stock_anterior,
            'stock_actual': self.insumo.stock_actual,
            'calculo_automatico': resultado['calculo_automatico'],
            'detalle': resultado['detalle']
        }


class HospitalizacionInsumo(models.Model):
    """
    Tabla intermedia para registrar insumos usados en hospitalizaciones
    Similar a ConsultaInsumo pero para hospitalizaciones
    """
    hospitalizacion = models.ForeignKey(Hospitalizacion, on_delete=models.CASCADE, related_name='insumos_detalle')
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT)
    
    # Datos para el cálculo
    peso_paciente = models.DecimalField(max_digits=6, decimal_places=2)
    dosis_ml_por_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dosis_total_ml = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ml_por_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Cantidad final
    cantidad_calculada = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    cantidad_manual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cantidad_final = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    
    # Metadata
    calculo_automatico = models.BooleanField(default=False)
    requiere_confirmacion = models.BooleanField(default=False)
    confirmado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='insumos_hosp_confirmados'
    )
    fecha_confirmacion = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)
    
    # Control de descuento
    stock_descontado = models.BooleanField(
        default=False,
        help_text="Indica si el stock de este insumo ya fue descontado. Previene descuentos duplicados."
    )
    fecha_descuento = models.DateTimeField(null=True, blank=True)
    
    # Registro
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Insumo de Hospitalización'
        verbose_name_plural = 'Insumos de Hospitalización'
        ordering = ['id']
    
    def __str__(self):
        return f"{self.insumo.medicamento} x{self.cantidad_final} - Hosp #{self.hospitalizacion.id}"
    
    def calcular_cantidad(self):
        """Mismo cálculo que ConsultaInsumo"""
        from decimal import Decimal, ROUND_UP
        
        if self.cantidad_manual:
            self.cantidad_final = self.cantidad_manual
            self.calculo_automatico = False
            return
        
        if not all([self.peso_paciente, self.dosis_ml_por_kg, self.ml_por_contenedor]):
            self.requiere_confirmacion = True
            self.cantidad_final = Decimal('1')
            return
        
        self.dosis_total_ml = self.peso_paciente * self.dosis_ml_por_kg
        self.cantidad_calculada = (self.dosis_total_ml / self.ml_por_contenedor).quantize(
            Decimal('1'),
            rounding=ROUND_UP
        )
        
        self.cantidad_final = self.cantidad_calculada
        self.calculo_automatico = True
        self.requiere_confirmacion = False
    
    def save(self, *args, **kwargs):
        """Calcula cantidad antes de guardar"""
        self.calcular_cantidad()
        super().save(*args, **kwargs)
    
    def descontar_stock(self, usuario, dias_tratamiento=1):
        """
        Descuenta stock del insumo usando calcular_envases_requeridos().
        Misma lógica que ConsultaInsumo.descontar_stock()
        """
        from django.db import transaction
        
        if self.stock_descontado:
            raise ValidationError(
                f"El stock del insumo '{self.insumo.medicamento}' "
                f"ya fue descontado para esta hospitalización."
            )
        
        resultado = self.insumo.calcular_envases_requeridos(
            peso_paciente_kg=float(self.peso_paciente),
            dias_tratamiento=dias_tratamiento
        )
        
        envases_requeridos = resultado['envases_requeridos']
        
        if self.insumo.stock_actual < envases_requeridos:
            raise ValidationError(
                f"Stock insuficiente para '{self.insumo.medicamento}'. "
                f"Requerido: {envases_requeridos} envases, "
                f"Disponible: {self.insumo.stock_actual} envases"
            )
        
        with transaction.atomic():
            stock_anterior = self.insumo.stock_actual
            self.insumo.stock_actual -= envases_requeridos
            self.insumo.ultimo_movimiento = timezone.now()
            self.insumo.tipo_ultimo_movimiento = 'salida'
            self.insumo.usuario_ultimo_movimiento = usuario
            self.insumo.save(update_fields=[
                'stock_actual',
                'ultimo_movimiento',
                'tipo_ultimo_movimiento',
                'usuario_ultimo_movimiento'
            ])
            
            self.stock_descontado = True
            self.fecha_descuento = timezone.now()
            self.save(update_fields=['stock_descontado', 'fecha_descuento'])
        
        return {
            'success': True,
            'insumo': self.insumo.medicamento,
            'envases_descontados': envases_requeridos,
            'stock_anterior': stock_anterior,
            'stock_actual': self.insumo.stock_actual,
            'calculo_automatico': resultado['calculo_automatico'],
            'detalle': resultado['detalle']
        }


class CirugiaInsumo(models.Model):
    """
    Tabla intermedia para insumos usados en cirugías
    """
    cirugia = models.ForeignKey(Cirugia, on_delete=models.CASCADE, related_name='insumos_detalle')
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT)
    
    # Datos para el cálculo
    peso_paciente = models.DecimalField(max_digits=6, decimal_places=2)
    dosis_ml_por_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dosis_total_ml = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ml_por_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Cantidad final
    cantidad_calculada = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    cantidad_manual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cantidad_final = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    
    # Metadata
    calculo_automatico = models.BooleanField(default=False)
    requiere_confirmacion = models.BooleanField(default=False)
    confirmado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='insumos_cirugia_confirmados'
    )
    fecha_confirmacion = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)
    
    # Registro
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Insumo de Cirugía'
        verbose_name_plural = 'Insumos de Cirugía'
        ordering = ['id']
    
    def __str__(self):
        return f"{self.insumo.medicamento} x{self.cantidad_final} - Cirugía #{self.cirugia.id}"
    
    def calcular_cantidad(self):
        """Mismo cálculo"""
        from decimal import Decimal, ROUND_UP
        
        if self.cantidad_manual:
            self.cantidad_final = self.cantidad_manual
            self.calculo_automatico = False
            return
        
        if not all([self.peso_paciente, self.dosis_ml_por_kg, self.ml_por_contenedor]):
            self.requiere_confirmacion = True
            self.cantidad_final = Decimal('1')
            return
        
        self.dosis_total_ml = self.peso_paciente * self.dosis_ml_por_kg
        self.cantidad_calculada = (self.dosis_total_ml / self.ml_por_contenedor).quantize(
            Decimal('1'),
            rounding=ROUND_UP
        )
        
        self.cantidad_final = self.cantidad_calculada
        self.calculo_automatico = True
        self.requiere_confirmacion = False
    
    def save(self, *args, **kwargs):
        """Calcula cantidad antes de guardar"""
        self.calcular_cantidad()
        super().save(*args, **kwargs)