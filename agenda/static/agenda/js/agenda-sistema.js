/**
 * AGENDA VETERINARIA - JAVASCRIPT
 * Sistema de gestión de citas y disponibilidad integrado
 */

// ============================================
// UTILIDADES
// ============================================

// Función para obtener el CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ============================================
// VARIABLES GLOBALES
// ============================================

let currentDate = new Date();
let selectedDate = null;
let citasDelMes = {};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando agenda veterinaria...');
    inicializarEventos();
    renderizarCalendario();
});

function inicializarEventos() {
    // Navegación del calendario
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderizarCalendario();
    });
    
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderizarCalendario();
    });
    
    document.getElementById('todayBtn')?.addEventListener('click', () => {
        currentDate = new Date();
        renderizarCalendario();
        seleccionarDia(currentDate);
    });
    
    // Selectores
    document.getElementById('monthSelect')?.addEventListener('change', (e) => {
        currentDate.setMonth(parseInt(e.target.value));
        renderizarCalendario();
    });
    
    document.getElementById('yearSelect')?.addEventListener('change', (e) => {
        currentDate.setFullYear(parseInt(e.target.value));
        renderizarCalendario();
    });
    
    // Formularios
    document.getElementById('guardarCita')?.addEventListener('click', guardarCita);
    document.getElementById('guardarHorarioFijo')?.addEventListener('click', guardarHorarioFijo);
    document.getElementById('guardarExcepcion')?.addEventListener('click', guardarExcepcion);
    
    // Auto-calcular hora fin
    document.getElementById('citaServicio')?.addEventListener('change', calcularHoraFin);
    document.getElementById('citaHoraInicio')?.addEventListener('change', calcularHoraFin);
    
    // Buscador de pacientes
    document.getElementById('buscarPaciente')?.addEventListener('input', filtrarPacientes);
}

function filtrarPacientes() {
    const searchInput = document.getElementById('buscarPaciente');
    const selectPaciente = document.getElementById('citaPaciente');
    
    if (!searchInput || !selectPaciente) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const options = selectPaciente.options;
    
    for (let i = 1; i < options.length; i++) {
        const option = options[i];
        const nombre = option.dataset.nombre || '';
        const propietario = (option.dataset.propietario || '').toLowerCase();
        const text = option.textContent.toLowerCase();
        
        if (nombre.includes(searchTerm) || propietario.includes(searchTerm) || text.includes(searchTerm)) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    }
}

function calcularHoraFin() {
    const servicioSelect = document.getElementById('citaServicio');
    const horaInicioInput = document.getElementById('citaHoraInicio');
    const horaFinInput = document.getElementById('citaHoraFin');
    const tipoSelect = document.getElementById('citaTipo');
    const duracionSpan = document.getElementById('servicioDuracion');
    
    const selectedOption = servicioSelect?.options[servicioSelect.selectedIndex];
    const duracion = selectedOption?.dataset?.duracion;
    const categoria = selectedOption?.dataset?.categoria;
    const horaInicio = horaInicioInput?.value;
    
    // Auto-establecer tipo según categoría del servicio
    if (categoria && tipoSelect) {
        const categoriaToTipo = {
            'Consulta': 'consulta',
            'Vacunación': 'vacunacion',
            'Cirugía': 'cirugia',
            'Control': 'control',
            'Emergencia': 'emergencia',
            'Peluquería': 'peluqueria',
            'Otro': 'otro'
        };
        const tipoMap = categoriaToTipo[categoria] || 'consulta';
        tipoSelect.value = tipoMap;
    }
    
    // Calcular hora fin
    if (duracion && horaInicio) {
        const [horas, minutos] = horaInicio.split(':').map(Number);
        const fecha = new Date();
        fecha.setHours(horas, minutos + parseInt(duracion), 0);
        const horaFin = fecha.toTimeString().substring(0, 5);
        horaFinInput.value = horaFin;
        
        if (duracionSpan) {
            duracionSpan.textContent = `Duración: ${duracion} minutos (finaliza a las ${horaFin})`;
        }
    }
}

// ============================================
// RENDERIZADO DEL CALENDARIO
// ============================================

function renderizarCalendario() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    actualizarTituloMes(year, month);
    actualizarSelectores(year, month);
    renderizarDiasDelMes(year, month);
}

function actualizarTituloMes(year, month) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const title = document.getElementById('currentMonth');
    if (title) {
        title.textContent = `${meses[month]} ${year}`;
    }
}

function actualizarSelectores(year, month) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect && monthSelect.children.length === 0) {
        meses.forEach((mes, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = mes;
            monthSelect.appendChild(option);
        });
    }
    if (monthSelect) monthSelect.value = month;
    
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect && yearSelect.children.length === 0) {
        for (let y = year - 2; y <= year + 2; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearSelect.appendChild(option);
        }
    }
    if (yearSelect) yearSelect.value = year;
}

function renderizarDiasDelMes(year, month) {
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    let primerDiaSemana = primerDia.getDay();
    
    // Ajustar para que lunes sea el primer día (0=Dom, 1=Lun, etc.)
    // Convertir: Dom=6, Lun=0, Mar=1, Mié=2, Jue=3, Vie=4, Sáb=5
    primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
    
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    
    calendar.innerHTML = '';
    
    // Header - Lunes primero
    const header = document.createElement('div');
    header.className = 'calendar-header';
    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(dia => {
        const headerDay = document.createElement('div');
        headerDay.className = 'calendar-header-day';
        headerDay.textContent = dia;
        header.appendChild(headerDay);
    });
    calendar.appendChild(header);
    
    // Body
    const body = document.createElement('div');
    body.className = 'calendar-body';
    
    // Días mes anterior
    const mesAnterior = new Date(year, month, 0);
    const diasMesAnterior = mesAnterior.getDate();
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
        body.appendChild(crearCeldaDia(year, month - 1, diasMesAnterior - i, true));
    }
    
    // Días mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
        body.appendChild(crearCeldaDia(year, month, dia, false));
    }
    
    // Días mes siguiente
    const diasRestantes = 42 - body.children.length;
    for (let dia = 1; dia <= diasRestantes; dia++) {
        body.appendChild(crearCeldaDia(year, month + 1, dia, true));
    }
    
    calendar.appendChild(body);
}

function crearCeldaDia(year, month, dia, otroMes) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    const fecha = new Date(year, month, dia);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    
    // Verificar si es día pasado
    const esPasado = fecha < hoy;
    
    if (otroMes) dayCell.classList.add('other-month');
    if (esPasado) {
        dayCell.classList.add('disabled');
        dayCell.style.pointerEvents = 'none';
    }
    
    const fechaStr = formatearFecha(fecha);
    
    // Hoy
    if (fecha.getTime() === hoy.getTime()) {
        dayCell.classList.add('today');
    }
    
    // Seleccionado
    if (selectedDate && fecha.toDateString() === selectedDate.toDateString()) {
        dayCell.classList.add('selected');
    }
    
    // Número
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = dia;
    dayCell.appendChild(dayNumber);
    
    // Indicador de citas (solo si no es pasado)
    if (citasDelMes[fechaStr] && !esPasado) {
        dayCell.classList.add('has-citas');
        const indicator = document.createElement('div');
        indicator.className = 'day-indicator';
        const badge = document.createElement('span');
        badge.className = 'indicator-badge';
        badge.textContent = citasDelMes[fechaStr].length;
        indicator.appendChild(badge);
        dayCell.appendChild(indicator);
    }
    
    // Click solo si no es pasado
    if (!esPasado) {
        dayCell.addEventListener('click', () => seleccionarDia(fecha));
    }
    
    return dayCell;
}

// ============================================
// SELECCIÓN Y DETALLES DEL DÍA
// ============================================

function seleccionarDia(fecha) {
    selectedDate = fecha;
    renderizarCalendario();
    mostrarDetallesDia(fecha);
}

function mostrarDetallesDia(fecha) {
    const detailsSection = document.getElementById('dayDetails');
    const emptyMessage = document.getElementById('emptyDayMessage');
    const titleElement = document.getElementById('selectedDateTitle');
    
    if (!detailsSection || !titleElement) return;
    
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    titleElement.textContent = fecha.toLocaleDateString('es-ES', opciones);
    
    // Ocultar mensaje vacío y mostrar detalles
    if (emptyMessage) emptyMessage.style.display = 'none';
    detailsSection.style.display = 'block';
    
    cargarDetallesDia(fecha);
}

async function cargarDetallesDia(fecha) {
    const year = fecha.getFullYear();
    const month = fecha.getMonth() + 1;
    const day = fecha.getDate();
    
    try {
        const [responseCitas, responseDisp] = await Promise.all([
            fetch(`/agenda/citas/${year}/${month}/${day}/`),
            fetch(`/agenda/disponibilidad/dia/${year}/${month}/${day}/`)
        ]);
        
        const dataCitas = await responseCitas.json();
        const dataDisp = await responseDisp.json();
        
        renderizarTabsVeterinarios(dataCitas.citas || [], dataDisp.disponibilidades || [], fecha);
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar los detalles del día');
    }
}

function renderizarTabsVeterinarios(citas, disponibilidades, fecha) {
    const tabsContainer = document.getElementById('veterinariosTab');
    const contentContainer = document.getElementById('veterinariosTabContent');
    
    if (!tabsContainer || !contentContainer) return;
    
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    
    // Obtener veterinarios
    const veterinariosSelect = document.getElementById('citaVeterinario');
    if (!veterinariosSelect) return;
    
    const veterinariosLista = Array.from(veterinariosSelect.options)
        .filter(opt => opt.value)
        .map(opt => ({ id: opt.value, nombre: opt.textContent }));
    
    // Crear tabs
    veterinariosLista.forEach((vet, index) => {
        // Tab
        const tab = document.createElement('li');
        tab.className = 'nav-item';
        tab.innerHTML = `
            <button class="nav-link ${index === 0 ? 'active' : ''}" 
                    data-bs-toggle="tab" 
                    data-bs-target="#vet-${vet.id}">
                ${vet.nombre}
            </button>
        `;
        tabsContainer.appendChild(tab);
        
        // Contenido
        const content = document.createElement('div');
        content.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
        content.id = `vet-${vet.id}`;
        
        const citasVet = citas.filter(c => c.veterinario_id == vet.id);
        const dispVet = disponibilidades.filter(d => d.veterinario_id == vet.id);
        
        content.innerHTML = renderizarTimelineVeterinario(vet, citasVet, dispVet, fecha);
        contentContainer.appendChild(content);
    });
}

function renderizarTimelineVeterinario(veterinario, citas, disponibilidades, fecha) {
    let html = `
        <div class="timeline-container">
            <div class="timeline-header">
                <h5><i class="fas fa-clock"></i> Timeline del día</h5>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-success" 
                            onclick="abrirModalDisponibilidad('${veterinario.id}', '${formatearFecha(fecha)}')">
                        <i class="fas fa-plus"></i> Disponibilidad
                    </button>
                    <button class="btn btn-sm btn-primary"
                            onclick="abrirModalCita('${veterinario.id}', '${formatearFecha(fecha)}')">
                        <i class="fas fa-plus"></i> Nueva Cita
                    </button>
                </div>
            </div>
            <div class="timeline-body">
    `;
    
    if (disponibilidades.length === 0) {
        html += `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h5>Sin disponibilidad configurada</h5>
                <p>Configure la disponibilidad para este día</p>
            </div>
        `;
    } else {
        // Renderizar disponibilidad
        disponibilidades.forEach(disp => {
            if (disp.tipo === 'disponible') {
                const horaInicio = parseInt(disp.hora_inicio.split(':')[0]);
                const horaFin = parseInt(disp.hora_fin.split(':')[0]);
                
                for (let hora = horaInicio; hora <= horaFin; hora++) {
                    const horaStr = hora.toString().padStart(2, '0') + ':00';
                    const citaEnHora = citas.find(c => c.hora_inicio.startsWith(horaStr.slice(0, 2)));
                    
                    html += `
                        <div class="timeline-slot">
                            <div class="timeline-hour">${horaStr}</div>
                            <div class="timeline-content ${citaEnHora ? '' : 'disponible'}">
                                ${citaEnHora ? renderizarCitaCard(citaEnHora) : ''}
                            </div>
                        </div>
                    `;
                }
            } else {
                html += `
                    <div class="disponibilidad-card ${disp.tipo}">
                        <strong>${disp.hora_inicio} - ${disp.hora_fin}</strong>
                        <span class="badge bg-warning ms-2">${disp.tipo_display}</span>
                        ${disp.notas ? `<p class="mb-0 mt-1"><small>${disp.notas}</small></p>` : ''}
                    </div>
                `;
            }
        });
    }
    
    html += '</div></div>';
    return html;
}

function renderizarCitaCard(cita) {
    return `
        <div class="cita-card ${cita.estado}" onclick="abrirModalEditarCita(${cita.id})">
            <div class="cita-card-header">
                <span class="cita-time">${cita.hora_inicio} - ${cita.hora_fin || ''}</span>
                <span class="cita-badge">${cita.estado}</span>
            </div>
            <div class="cita-card-body">
                <div class="cita-info">
                    <i class="fas fa-paw"></i>
                    <span><strong>${cita.paciente}</strong></span>
                </div>
                <div class="cita-info">
                    <i class="fas fa-stethoscope"></i>
                    <span>${cita.tipo}</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// MODALES
// ============================================

function abrirModalCita(veterinarioId = '', fecha = '') {
    const modal = new bootstrap.Modal(document.getElementById('citaModal'));
    document.getElementById('citaModalTitle').textContent = 'Nueva Cita';
    document.getElementById('citaForm').reset();
    document.getElementById('citaId').value = '';
    
    if (veterinarioId) {
        document.getElementById('citaVeterinario').value = veterinarioId;
    }
    
    if (fecha) {
        document.getElementById('citaFecha').value = fecha;
    }
    
    modal.show();
}

function abrirModalEditarCita(citaId) {
    // Implementar carga de datos de la cita
    console.log('Editar cita:', citaId);
}

function abrirModalDisponibilidad(veterinarioId = '', fecha = '') {
    const modal = new bootstrap.Modal(document.getElementById('disponibilidadModal'));
    document.getElementById('disponibilidadForm').reset();
    document.getElementById('disponibilidadId').value = '';
    
    if (veterinarioId) {
        document.getElementById('dispVeterinario').value = veterinarioId;
    }
    
    if (fecha) {
        document.getElementById('dispFecha').value = fecha;
    }
    
    modal.show();
}

// ============================================
// GUARDAR DATOS
// ============================================

async function guardarCita() {
    const citaId = document.getElementById('citaId').value;
    const url = citaId ? `/agenda/citas/editar/${citaId}/` : '/agenda/citas/crear/';
    
    const data = {
        paciente_id: document.getElementById('citaPaciente').value,
        veterinario_id: document.getElementById('citaVeterinario').value,
        servicio_id: document.getElementById('citaServicio').value,
        fecha: document.getElementById('citaFecha').value || formatearFecha(selectedDate),
        hora_inicio: document.getElementById('citaHoraInicio').value,
        hora_fin: document.getElementById('citaHoraFin').value,
        tipo: document.getElementById('citaTipo').value,
        estado: document.getElementById('citaEstado').value,
        motivo: document.getElementById('citaMotivo').value,
        notas: document.getElementById('citaNotas').value
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('citaModal')).hide();
            mostrarExito(result.message);
            if (selectedDate) mostrarDetallesDia(selectedDate);
        } else {
            mostrarError(result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al guardar la cita');
    }
}

async function guardarHorarioFijo() {
    const horarioId = document.getElementById('horarioFijoId').value;
    const url = horarioId ? `/agenda/horarios-fijos/editar/${horarioId}/` : '/agenda/horarios-fijos/crear/';
    
    const data = {
        veterinario_id: document.getElementById('horarioVeterinario').value,
        dia_semana: document.getElementById('horarioDiaSemana').value,
        hora_inicio: document.getElementById('horarioHoraInicio').value,
        hora_fin: document.getElementById('horarioHoraFin').value,
        notas: document.getElementById('horarioNotas').value
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarExito(result.message);
            document.getElementById('horarioFijoForm').reset();
            renderizarCalendario();
        } else {
            mostrarError(result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al guardar el horario fijo');
    }
}

async function guardarExcepcion() {
    const excepcionId = document.getElementById('excepcionId').value;
    const url = excepcionId ? `/agenda/disponibilidad/editar/${excepcionId}/` : '/agenda/disponibilidad/crear/';
    
    const data = {
        veterinario_id: document.getElementById('excepcionVeterinario').value,
        fecha: document.getElementById('excepcionFecha').value,
        hora_inicio: '00:00',
        hora_fin: '23:59',
        tipo: document.getElementById('excepcionTipo').value,
        notas: document.getElementById('excepcionNotas').value
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarExito(result.message);
            document.getElementById('excepcionForm').reset();
            if (selectedDate) mostrarDetallesDia(selectedDate);
        } else {
            mostrarError(result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al guardar la excepción');
    }
}

// ============================================
// UTILIDADES
// ============================================

function formatearFecha(fecha) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function mostrarExito(mensaje) {
    // Usar sistema de mensajes de Django o una librería de notificaciones
    alert(mensaje);
}

function mostrarError(mensaje) {
    alert('Error: ' + mensaje);
}

// Exponer funciones globales
window.abrirModalCita = abrirModalCita;
window.abrirModalEditarCita = abrirModalEditarCita;
window.abrirModalDisponibilidad = abrirModalDisponibilidad;
