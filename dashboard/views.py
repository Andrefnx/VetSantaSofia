from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.db.models import Q, Count, Sum
from datetime import date, timedelta
from decimal import Decimal


@login_required(login_url='login')
def dashboard(request):
    """
    Dashboard principal con contenido diferenciado por rol
    Redirige a la vista específica según el rol del usuario
    """
    usuario = request.user
    hoy = date.today()
    
    # Contexto base
    context = {
        'usuario': usuario,
        'hoy': hoy,
    }
    
    # Cargar datos según rol
    if usuario.rol == 'administracion' or usuario.is_superuser:
        context.update(_datos_administrador(hoy))
        template = 'dashboard/admin.html'
    
    elif usuario.rol == 'recepcion':
        context.update(_datos_recepcion(hoy, usuario))
        template = 'dashboard/recepcion.html'
    
    elif usuario.rol == 'veterinario':
        context.update(_datos_veterinario(hoy, usuario))
        template = 'dashboard/veterinario.html'
    
    else:
        # Fallback
        template = 'dashboard.html'
    
    return render(request, template, context)

# Components views
def avatars(request):
    return render(request, 'kaiadmin/components/avatars.html')

def buttons(request):
    return render(request, 'kaiadmin/components/buttons.html')

def gridsystem(request):
    return render(request, 'kaiadmin/components/gridsystem.html')

def panels(request):
    return render(request, 'kaiadmin/components/panels.html')

def notifications(request):
    return render(request, 'kaiadmin/components/notifications.html')

def typography(request):
    return render(request, 'kaiadmin/components/typography.html')

def font_awesome_icons(request):
    return render(request, 'kaiadmin/components/font-awesome-icons.html')

def simple_line_icons(request):
    return render(request, 'kaiadmin/components/simple-line-icons.html')

def sweetalert(request):
    return render(request, 'kaiadmin/components/sweetalert.html')

# Forms views
def forms(request):
    return render(request, 'kaiadmin/forms/forms.html')

# Tables views
def tables(request):
    return render(request, 'kaiadmin/tables/tables.html')

def datatables(request):
    return render(request, 'kaiadmin/tables/datatables.html')

# Charts views
def charts(request):
    return render(request, 'kaiadmin/charts/charts.html')


# =============================================================================
# FUNCIONES AUXILIARES PARA DASHBOARD
# =============================================================================

def _datos_administrador(hoy):
    """Carga datos para el dashboard de administrador"""
    from agenda.models import Cita
    from pacientes.models import Paciente
    from clinica.models import Hospitalizacion
    from inventario.models import Insumo
    from caja.models import SesionCaja, Venta
    
    # 1. AGENDA - Resumen del día
    citas_hoy = Cita.objects.filter(fecha=hoy)
    citas_stats = {
        'total': citas_hoy.count(),
        'pendientes': citas_hoy.filter(estado='pendiente').count(),
        'confirmadas': citas_hoy.filter(estado='confirmada').count(),
        'completadas': citas_hoy.filter(estado='completada').count(),
        'canceladas': citas_hoy.filter(estado='cancelada').count(),
    }
    
    proximas_citas = citas_hoy.filter(
        estado__in=['pendiente', 'confirmada']
    ).select_related('paciente', 'veterinario').order_by('hora_inicio')[:5]
    
    # 2. HOSPITALIZACIONES
    hospitalizaciones_activas = Hospitalizacion.objects.filter(
        estado='activa'
    ).select_related('paciente', 'veterinario')
    
    # Agregar cálculo de días de hospitalización
    for hosp in hospitalizaciones_activas:
        fecha_ingreso = hosp.fecha_ingreso.date() if hasattr(hosp.fecha_ingreso, 'date') else hosp.fecha_ingreso
        hosp.dias_hospitalizacion = (hoy - fecha_ingreso).days
    
    fecha_limite = hoy - timedelta(days=5)
    hospitalizaciones_prolongadas = hospitalizaciones_activas.filter(
        fecha_ingreso__date__lte=fecha_limite
    )
    
    # 3. INVENTARIO / STOCK
    stock_bajo = Insumo.objects.filter(
        stock_actual__lte=10
    ).order_by('stock_actual')[:10]
    
    # Insumos más utilizados hoy
    insumos_utilizados_hoy = []
    try:
        from caja.models import DetalleVenta
        insumos_hoy = DetalleVenta.objects.filter(
            venta__fecha_pago__date=hoy,
            venta__estado='pagado',
            tipo='insumo'
        ).values('descripcion').annotate(
            cantidad_total=Sum('cantidad')
        ).order_by('-cantidad_total')[:5]
        insumos_utilizados_hoy = list(insumos_hoy)
    except:
        pass
    
    # 4. CAJA
    sesion_activa = SesionCaja.objects.filter(esta_cerrada=False).first()
    
    caja_stats = {
        'estado': 'abierta' if sesion_activa else 'cerrada',
        'sesion': sesion_activa,
        'total_vendido_hoy': Decimal('0.00'),
        'cobros_pendientes_count': 0,
        'cobros_pendientes_total': Decimal('0.00'),
    }
    
    if sesion_activa:
        caja_stats['total_vendido_hoy'] = sesion_activa.calcular_total_vendido()
    
    cobros_pendientes = Venta.objects.filter(estado='pendiente')
    caja_stats['cobros_pendientes_count'] = cobros_pendientes.count()
    caja_stats['cobros_pendientes_total'] = sum(v.total for v in cobros_pendientes)
    
    # 5. INDICADORES GENERALES
    indicadores = {
        'pacientes_atendidos_hoy': Cita.objects.filter(
            fecha=hoy,
            estado='completada'
        ).values('paciente').distinct().count(),
        
        'ingresos_del_dia': Venta.objects.filter(
            fecha_pago__date=hoy,
            estado='pagado'
        ).aggregate(total=Sum('total'))['total'] or Decimal('0.00'),
        
        'total_pacientes': Paciente.objects.filter(activo=True).count(),
        
        'hospitalizaciones_activas_count': hospitalizaciones_activas.count(),
    }
    
    return {
        'citas_stats': citas_stats,
        'proximas_citas': proximas_citas,
        'hospitalizaciones_activas': hospitalizaciones_activas[:10],
        'hospitalizaciones_prolongadas': hospitalizaciones_prolongadas,
        'stock_bajo': stock_bajo,
        'insumos_utilizados_hoy': insumos_utilizados_hoy,
        'caja_stats': caja_stats,
        'indicadores': indicadores,
    }


def _datos_recepcion(hoy, usuario):
    """Carga datos para el dashboard de recepción"""
    from agenda.models import Cita
    from pacientes.models import Paciente
    from caja.models import SesionCaja, Venta
    from datetime import time
    
    # 1. AGENDA SIMPLE - Vista del día completo
    citas_hoy = Cita.objects.filter(fecha=hoy).select_related(
        'paciente', 'veterinario', 'servicio'
    ).order_by('hora_inicio')
    
    # Generar vista horaria (8:00 - 20:00)
    horarios = []
    for hora in range(8, 21):
        hora_obj = time(hour=hora, minute=0)
        hora_siguiente = time(hour=hora + 1 if hora < 20 else 20, minute=0)
        
        citas_en_hora = citas_hoy.filter(
            hora_inicio__gte=hora_obj,
            hora_inicio__lt=hora_siguiente
        )
        
        horarios.append({
            'hora': f"{hora:02d}:00",
            'hora_obj': hora_obj,
            'citas': citas_en_hora,
            'tiene_citas': citas_en_hora.exists(),
            'libre': not citas_en_hora.exists(),
        })
    
    agenda_stats = {
        'total_citas': citas_hoy.count(),
        'pendientes': citas_hoy.filter(estado='pendiente').count(),
        'confirmadas': citas_hoy.filter(estado='confirmada').count(),
        'completadas': citas_hoy.filter(estado='completada').count(),
    }
    
    # 2. CAJA
    sesion_activa = SesionCaja.objects.filter(esta_cerrada=False).first()
    
    caja_stats = {
        'estado': 'abierta' if sesion_activa else 'cerrada',
        'sesion': sesion_activa,
        'puede_abrir': not sesion_activa,
        'total_acumulado': Decimal('0.00'),
    }
    
    if sesion_activa:
        caja_stats['total_acumulado'] = sesion_activa.calcular_total_vendido()
    
    cobros_pendientes = Venta.objects.filter(
        estado='pendiente'
    ).select_related('paciente')[:10]
    
    caja_stats['cobros_pendientes'] = cobros_pendientes
    caja_stats['cobros_pendientes_count'] = cobros_pendientes.count()
    
    # 3. PACIENTES RECIENTES (consultas últimas 24h o hospitalizados activamente)
    from clinica.models import Consulta, Hospitalizacion
    from datetime import timedelta
    
    # Fecha límite: hace 24 horas
    hace_24h = hoy - timedelta(days=1)
    
    # Obtener pacientes con consultas recientes (últimas 24 horas)
    consultas_recientes = Consulta.objects.filter(
        fecha__gte=hace_24h
    ).select_related('paciente', 'paciente__propietario').order_by('-fecha')
    
    # Obtener pacientes hospitalizados activamente
    hospitalizaciones_activas = Hospitalizacion.objects.filter(
        estado='activa'
    ).select_related('paciente', 'paciente__propietario').order_by('-fecha_ingreso')
    
    # Crear conjunto de pacientes únicos con su última actividad
    pacientes_dict = {}
    
    # Agregar pacientes con consultas recientes
    for consulta in consultas_recientes:
        if consulta.paciente.activo and consulta.paciente.id not in pacientes_dict:
            paciente = consulta.paciente
            paciente.ultima_consulta = consulta.fecha
            paciente.tipo_actividad = 'consulta'
            pacientes_dict[paciente.id] = paciente
    
    # Agregar pacientes hospitalizados
    for hosp in hospitalizaciones_activas:
        if hosp.paciente.activo:
            paciente = hosp.paciente
            if paciente.id not in pacientes_dict:
                paciente.ultima_consulta = hosp.fecha_ingreso
                paciente.tipo_actividad = 'hospitalizado'
                pacientes_dict[paciente.id] = paciente
            else:
                # Si ya existe, mantener el más reciente
                if hosp.fecha_ingreso > pacientes_dict[paciente.id].ultima_consulta:
                    paciente.ultima_consulta = hosp.fecha_ingreso
                    paciente.tipo_actividad = 'hospitalizado'
                    pacientes_dict[paciente.id] = paciente
    
    # Convertir a lista y ordenar por fecha más reciente
    pacientes_recientes = sorted(
        pacientes_dict.values(), 
        key=lambda p: p.ultima_consulta, 
        reverse=True
    )[:5]
    
    return {
        'horarios': horarios,
        'citas_hoy': citas_hoy,
        'agenda_stats': agenda_stats,
        'caja_stats': caja_stats,
        'pacientes_recientes': pacientes_recientes,
    }


def _datos_veterinario(hoy, usuario):
    """Carga datos para el dashboard de veterinario"""
    from agenda.models import Cita
    from clinica.models import Hospitalizacion, RegistroDiario
    from caja.models import Venta
    
    # 1. AGENDA PERSONAL
    citas_del_dia = Cita.objects.filter(
        veterinario=usuario,
        fecha=hoy
    ).select_related('paciente', 'servicio').order_by('hora_inicio')
    
    proximas_citas = citas_del_dia.filter(
        estado__in=['pendiente', 'confirmada']
    )[:5]
    
    cita_actual = citas_del_dia.filter(estado='en_curso').first()
    
    agenda_stats = {
        'total_del_dia': citas_del_dia.count(),
        'completadas': citas_del_dia.filter(estado='completada').count(),
        'pendientes': citas_del_dia.filter(estado__in=['pendiente', 'confirmada']).count(),
    }
    
    # 2. PACIENTES DEL DÍA
    pacientes_del_dia = []
    for cita in citas_del_dia:
        pacientes_del_dia.append({
            'paciente': cita.paciente,
            'cita': cita,
            'atendido': cita.estado == 'completada',
        })
    
    # 3. HOSPITALIZACIONES A CARGO
    hospitalizaciones_asignadas = Hospitalizacion.objects.filter(
        veterinario=usuario,
        estado='activa'
    ).select_related('paciente').order_by('fecha_ingreso')
    
    # Agregar cálculo de días de hospitalización y último registro
    for hosp in hospitalizaciones_asignadas:
        hosp.dias_hospitalizacion = (hoy - hosp.fecha_ingreso.date()).days
        hosp.ultimo_registro = RegistroDiario.objects.filter(
            hospitalizacion=hosp
        ).order_by('-fecha_registro').first()
        
        # Determinar si necesita actualización (más de 12 horas sin registro)
        if hosp.ultimo_registro:
            horas_desde_registro = (timezone.now() - hosp.ultimo_registro.fecha_registro).total_seconds() / 3600
            hosp.necesita_actualizacion = horas_desde_registro >= 12
        else:
            hosp.necesita_actualizacion = True
    
    # 4. ALERTAS CLÍNICAS
    alertas = []
    
    # Consultas con cobro pendiente
    try:
        consultas_sin_cobrar = Venta.objects.filter(
            tipo_origen='consulta',
            consulta__veterinario=usuario,
            estado='pendiente',
            fecha_creacion__date__lte=hoy - timedelta(days=1)
        ).count()
        
        if consultas_sin_cobrar > 0:
            alertas.append({
                'tipo': 'warning',
                'icono': 'fa-exclamation-triangle',
                'mensaje': f'{consultas_sin_cobrar} consulta(s) con cobro pendiente de días anteriores',
            })
    except:
        pass
    
    # Hospitalizaciones sin actualización reciente
    for hosp in hospitalizaciones_asignadas:
        if not hosp.ultimo_registro or (timezone.now() - hosp.ultimo_registro.fecha_registro).days >= 1:
            alertas.append({
                'tipo': 'info',
                'icono': 'fa-clipboard-check',
                'mensaje': f'Hospitalización de {hosp.paciente.nombre} sin registro reciente',
            })
    
    # Insumos sin confirmar - obtener lista completa
    insumos_sin_confirmar = []
    try:
        from clinica.models import ConsultaInsumo
        insumos_sin_confirmar = ConsultaInsumo.objects.filter(
            consulta__veterinario=usuario,
            requiere_confirmacion=True,
            confirmado_por__isnull=True
        ).select_related('consulta')[:10]
        
        if insumos_sin_confirmar:
            alertas.append({
                'tipo': 'warning',
                'icono': 'fa-pills',
                'mensaje': f'{len(insumos_sin_confirmar)} insumo(s) sin confirmar cantidad',
            })
    except:
        pass
    
    # Cobros pendientes del veterinario
    cobros_pendientes = []
    try:
        cobros_pendientes = Venta.objects.filter(
            tipo_origen='consulta',
            consulta__veterinario=usuario,
            estado='pendiente'
        ).select_related('paciente')[:10]
    except:
        pass
    
    # Hospitalizaciones sin actualizar
    hospitalizaciones_sin_actualizar = []
    for hosp in hospitalizaciones_asignadas:
        if hosp.ultimo_registro:
            horas_sin_registro = int((timezone.now() - hosp.ultimo_registro.fecha_registro).total_seconds() / 3600)
        else:
            horas_sin_registro = 24
        
        if horas_sin_registro >= 24:
            hosp.horas_sin_registro = horas_sin_registro
            hospitalizaciones_sin_actualizar.append(hosp)
    
    # Indicadores
    indicadores = {
        'citas_hoy': citas_del_dia.count(),
        'citas_pendientes': citas_del_dia.filter(estado__in=['pendiente', 'confirmada']).count(),
        'citas_completadas': citas_del_dia.filter(estado='completada').count(),
        'hospitalizados': hospitalizaciones_asignadas.count(),
    }
    
    # Alertas detalladas
    alertas_detalladas = {
        'cobros_pendientes': cobros_pendientes,
        'insumos_sin_confirmar': insumos_sin_confirmar,
        'hospitalizaciones_sin_actualizar': hospitalizaciones_sin_actualizar,
        'total_alertas': len(cobros_pendientes) + len(insumos_sin_confirmar) + len(hospitalizaciones_sin_actualizar),
    }
    
    return {
        'mis_citas': citas_del_dia,
        'proxima_cita': proximas_citas.first() if proximas_citas.exists() else None,
        'cita_actual': cita_actual,
        'indicadores': indicadores,
        'mis_hospitalizaciones': hospitalizaciones_asignadas,
        'alertas': alertas_detalladas,
    }

def sparkline(request):
    return render(request, 'kaiadmin/charts/sparkline.html')

# Maps views
def googlemaps(request):
    return render(request, 'kaiadmin/maps/googlemaps.html')

def jsvectormap(request):
    return render(request, 'kaiadmin/maps/jsvectormap.html')

# Widgets
def widgets(request):
    return render(request, 'kaiadmin/widgets.html')

# Layout
def icon_menu(request):
    return render(request, 'kaiadmin/icon-menu.html')

def sidebar_style_2(request):
    return render(request, 'kaiadmin/sidebar-style-2.html')