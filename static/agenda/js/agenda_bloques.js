/* =============================
   AGENDA POR BLOQUES - 15 MIN
============================= */

let agendaState = {
    veterinarioId: null,
    fecha: null,
    servicioId: null,
    pacienteId: null,
    bloques: [],
    bloquesRequeridos: 1,
    bloqueSeleccionado: null
};

function toggleModal(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove(show ? 'hide' : 'show');
    modal.classList.add(show ? 'show' : 'hide');

    if (show) {
        document.body.classList.add('modal-open');
    } else {
        const anyOpen = document.querySelector('.vet-modal-overlay.show');
        if (!anyOpen) {
            document.body.classList.remove('modal-open');
        }
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    inicializarControles();
    inicializarBuscadorPacientes();
    inicializarBuscadorServicios();
    inicializarTabs();
    
    // Setear fecha actual
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaAgenda').value = hoy;
    
    // Cargar automáticamente la agenda del día con el primer veterinario disponible
    const veterinarioSelect = document.getElementById('veterinarioSelect');
    if (veterinarioSelect.options.length > 1) {
        // Seleccionar el primer veterinario disponible
        veterinarioSelect.selectedIndex = 1;
        agendaState.veterinarioId = veterinarioSelect.value;
        agendaState.fecha = hoy;
        
        // Cargar automáticamente la agenda
        setTimeout(() => cargarAgendaBloques(), 300);
    }
});

function inicializarControles() {
    // Veterinario
    document.getElementById('veterinarioSelect').addEventListener('change', function() {
        agendaState.veterinarioId = this.value;
        validarYHabilitarCargar();
        // Cargar automáticamente cuando cambia el veterinario
        if (agendaState.veterinarioId && agendaState.fecha) {
            cargarAgendaBloques();
        }
    });
    
    // Fecha
    document.getElementById('fechaAgenda').addEventListener('change', function() {
        agendaState.fecha = this.value;
        validarYHabilitarCargar();
        // Cargar automáticamente cuando cambia la fecha
        if (agendaState.veterinarioId && agendaState.fecha) {
            cargarAgendaBloques();
        }
    });
    
    // Servicio
    document.getElementById('servicioSelect').addEventListener('change', function() {
        agendaState.servicioId = this.value;
        const option = this.options[this.selectedIndex];
        const duracion = parseInt(option.dataset.duracion) || 15;
        agendaState.bloquesRequeridos = Math.ceil(duracion / 15);
        
        document.getElementById('bloques-requeridos').textContent = 
            `Requiere ${agendaState.bloquesRequeridos} bloques de 15 min`;
    });
    
    // Paciente
    document.getElementById('pacienteSelect').addEventListener('change', function() {
        agendaState.pacienteId = this.value;
    });
    
    // Botón cargar
    document.getElementById('btnCargarBloques').addEventListener('click', cargarAgendaBloques);
}

function validarYHabilitarCargar() {
    const btn = document.getElementById('btnCargarBloques');
    // El botón siempre debe estar habilitado para recargar
    btn.disabled = false;
}

function inicializarBuscadorPacientes() {
    const input = document.getElementById('buscarPaciente');
    const select = document.getElementById('pacienteSelect');
    
    input.addEventListener('input', function() {
        const busqueda = this.value.toLowerCase();
        const opciones = select.querySelectorAll('option');
        
        opciones.forEach(opt => {
            if (opt.value === '') return;
            const nombre = opt.dataset.nombre || '';
            const propietario = opt.dataset.propietario || '';
            
            if (nombre.includes(busqueda) || propietario.includes(busqueda)) {
                opt.style.display = '';
            } else {
                opt.style.display = 'none';
            }
        });
    });
}

function inicializarBuscadorServicios() {
    const input = document.getElementById('buscarServicio');
    const select = document.getElementById('servicioSelect');
    
    if (!input || !select) return;
    
    input.addEventListener('input', function() {
        const busqueda = this.value.toLowerCase();
        const opciones = select.querySelectorAll('option');
        const optgroups = select.querySelectorAll('optgroup');
        
        let gruposVisibles = {};
        
        opciones.forEach(opt => {
            if (opt.value === '') return;
            const nombre = opt.dataset.nombre || '';
            const categoria = opt.dataset.categoria || '';
            
            if (nombre.includes(busqueda) || categoria.includes(busqueda)) {
                opt.style.display = '';
                gruposVisibles[categoria] = true;
            } else {
                opt.style.display = 'none';
            }
        });
        
        // Mostrar/ocultar optgroups según si tienen opciones visibles
        optgroups.forEach(group => {
            const label = group.getAttribute('label').toLowerCase();
            const tieneVisibles = group.querySelectorAll('option:not([style*="display: none"])').length > 0;
            group.style.display = tieneVisibles ? '' : 'none';
        });
    });
}

function inicializarTabs() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remover active
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
            });
            
            // Activar seleccionado
            this.classList.add('active');
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.style.display = 'block';
                tabContent.classList.add('active');
            }
        });
    });
    
    // Mostrar el primer tab por defecto
    const primerTab = document.querySelector('.tab-button.active');
    if (primerTab) {
        const tabId = primerTab.getAttribute('data-tab');
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            tabContent.style.display = 'block';
            tabContent.classList.add('active');
        }
    }
}

async function cargarAgendaBloques() {
    if (!agendaState.veterinarioId || !agendaState.fecha) {
        mostrarMensaje('Seleccione veterinario y fecha', 'warning');
        return;
    }
    
    const [year, month, day] = agendaState.fecha.split('-');
    const url = `/agenda/bloques/${agendaState.veterinarioId}/${year}/${month}/${day}/`;
    
    mostrarEstadoCarga('Cargando agenda...');
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            agendaState.bloques = data.blocks;
            renderizarBloques(data);
        } else {
            mostrarMensajeError(data.error || 'Error al cargar agenda');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensajeError('Error de conexión al cargar agenda');
    }
}

function renderizarBloques(data) {
    const container = document.getElementById('agendaBloques');
    const titulo = document.getElementById('agendaTitulo');
    const estado = document.getElementById('agendaEstado');
    
    titulo.innerHTML = `<i class="fas fa-calendar-alt"></i> ${data.veterinario} - ${formatearFecha(agendaState.fecha)}`;
    
    if (!data.trabaja) {
        estado.innerHTML = `
            <i class="fas fa-calendar-times fa-3x mb-3 text-danger"></i>
            <p class="text-danger"><strong>El veterinario no trabaja este día</strong></p>
        `;
        estado.style.display = 'block';
        container.style.display = 'none';
        return;
    }
    
    estado.style.display = 'none';
    container.style.display = 'grid';
    container.innerHTML = '';
    
    // Determinar el rango de bloques a mostrar (solo dentro del horario de trabajo)
    let minBlock = 0;
    let maxBlock = 96;
    
    if (data.blocks && data.blocks.length > 0 && data.trabaja && data.rangos && data.rangos.length > 0) {
        minBlock = Math.min(...data.rangos.map(r => r.start_block));
        maxBlock = Math.max(...data.rangos.map(r => r.end_block));
    }
    
    // Procesar cada rango laboral por separado
    if (data.trabaja && data.rangos && data.rangos.length > 0) {
        data.rangos.forEach((rango, rangoIndex) => {
            // Agregar separador visual entre rangos
            if (rangoIndex > 0) {
                const separador = document.createElement('div');
                separador.style.gridColumn = '1 / -1';
                separador.style.height = '8px';
                separador.style.background = 'transparent';
                container.appendChild(separador);
            }
            
            const startHour = Math.floor(rango.start_block / 4);
            const endHour = Math.ceil(rango.end_block / 4);
            
            for (let hora = startHour; hora < endHour; hora++) {
                // Label de hora
                const hourLabel = document.createElement('div');
                hourLabel.className = 'agenda-hour-label';
                hourLabel.textContent = `${String(hora).padStart(2, '0')}:00`;
                container.appendChild(hourLabel);
                
                // Procesar bloques de esta hora
                let cuarto = 0;
                while (cuarto < 4) {
                    const blockIndex = hora * 4 + cuarto;
                    
                    // Solo mostrar bloques dentro de ESTE rango
                    if (blockIndex < rango.start_block || blockIndex >= rango.end_block) {
                        cuarto++;
                        continue;
                    }
                    
                    const bloque = data.blocks[blockIndex];
                    
                    // Si es una cita ocupada, agrupar bloques consecutivos EN ESTA HORA
                    if (bloque.status === 'occupied' && bloque.cita_id) {
                        let endQuarto = cuarto + 1;
                        while (endQuarto < 4 && 
                               hora * 4 + endQuarto < rango.end_block &&
                               data.blocks[hora * 4 + endQuarto].status === 'occupied' && 
                               data.blocks[hora * 4 + endQuarto].cita_id === bloque.cita_id) {
                            endQuarto++;
                        }
                        
                        // Crear bloque unificado
                        const blockEl = document.createElement('div');
                        blockEl.className = `agenda-block is-occupied`;
                        blockEl.dataset.blockIndex = blockIndex;
                        blockEl.dataset.citaId = bloque.cita_id;
                        blockEl.dataset.startTime = bloque.start_time;
                        blockEl.style.gridColumn = `span ${endQuarto - cuarto}`;
                        blockEl.innerHTML = `
                            <span class="agenda-block-time">${bloque.start_time}</span>
                            ${bloque.label ? `<span class="agenda-block-label">${bloque.label}</span>` : ''}
                        `;
                        blockEl.style.cursor = 'pointer';
                        blockEl.addEventListener('click', () => mostrarDetalleCita(bloque));
                        blockEl.addEventListener('mouseenter', () => destacarCitaCompleta(bloque.cita_id));
                        blockEl.addEventListener('mouseleave', () => limpiarDestacadoCita());
                        
                        container.appendChild(blockEl);
                        cuarto = endQuarto;
                    } else {
                        // Bloque individual
                        const blockEl = document.createElement('div');
                        blockEl.className = `agenda-block is-${bloque.status}`;
                        blockEl.dataset.blockIndex = blockIndex;
                        if (bloque.cita_id) {
                            blockEl.dataset.citaId = bloque.cita_id;
                        }
                        blockEl.dataset.startTime = bloque.start_time;
                        
                        blockEl.innerHTML = `
                            <span class="agenda-block-time">${bloque.start_time}</span>
                            ${bloque.label ? `<span class="agenda-block-label">${bloque.label}</span>` : ''}
                        `;
                        
                        if (bloque.status === 'available') {
                            blockEl.addEventListener('click', () => seleccionarBloque(blockIndex));
                            blockEl.addEventListener('mouseenter', () => previsualizarBloques(blockIndex));
                            blockEl.addEventListener('mouseleave', limpiarPrevisualizacion);
                        }
                        
                        container.appendChild(blockEl);
                        cuarto++;
                    }
                }
            }
        });
    }
}

function previsualizarBloques(startIndex) {
    if (!agendaState.servicioId) return;
    
    limpiarPrevisualizacion();
    
    const endIndex = startIndex + agendaState.bloquesRequeridos;
    let todosDisponibles = true;
    
    for (let i = startIndex; i < endIndex && i < 96; i++) {
        const bloque = agendaState.bloques[i];
        if (bloque.status !== 'available') {
            todosDisponibles = false;
            break;
        }
    }
    
    if (todosDisponibles) {
        for (let i = startIndex; i < endIndex && i < 96; i++) {
            const blockEl = document.querySelector(`[data-block-index="${i}"]`);
            if (blockEl) {
                blockEl.classList.add('is-hover-fit');
            }
        }
    }
}

function limpiarPrevisualizacion() {
    document.querySelectorAll('.is-hover-fit').forEach(el => {
        el.classList.remove('is-hover-fit');
    });
}

function seleccionarBloque(startIndex) {
    if (!agendaState.servicioId) {
        mostrarMensaje('Seleccione un servicio primero', 'warning');
        return;
    }
    
    if (!agendaState.pacienteId) {
        mostrarMensaje('Seleccione un paciente primero', 'warning');
        return;
    }
    
    const endIndex = startIndex + agendaState.bloquesRequeridos;
    
    // Validar que todos los bloques estén disponibles
    for (let i = startIndex; i < endIndex && i < 96; i++) {
        const bloque = agendaState.bloques[i];
        if (bloque.status !== 'available') {
            mostrarMensaje('No hay suficientes bloques disponibles consecutivos', 'danger');
            return;
        }
    }
    
    agendaState.bloqueSeleccionado = startIndex;
    
    // Marcar seleccionados
    document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
    for (let i = startIndex; i < endIndex && i < 96; i++) {
        const blockEl = document.querySelector(`[data-block-index="${i}"]`);
        if (blockEl) {
            blockEl.classList.add('is-selected');
        }
    }
    
    // Abrir modal de confirmación
    abrirModalConfirmarCita(startIndex, endIndex);
}

function abrirModalConfirmarCita(startBlock, endBlock) {
    const startBloque = agendaState.bloques[startBlock];
    const endBloque = agendaState.bloques[endBlock - 1];
    
    const pacienteSelect = document.getElementById('pacienteSelect');
    const pacienteNombre = pacienteSelect.options[pacienteSelect.selectedIndex].text;
    
    const veterinarioSelect = document.getElementById('veterinarioSelect');
    const veterinarioNombre = veterinarioSelect.options[veterinarioSelect.selectedIndex].text;
    
    const servicioSelect = document.getElementById('servicioSelect');
    const servicioNombre = servicioSelect.options[servicioSelect.selectedIndex].text;
    
    document.getElementById('confirmPaciente').textContent = pacienteNombre;
    document.getElementById('confirmVeterinario').textContent = veterinarioNombre;
    document.getElementById('confirmServicio').textContent = servicioNombre;
    document.getElementById('confirmFecha').textContent = formatearFecha(agendaState.fecha);
    document.getElementById('confirmHorario').textContent = `${startBloque.start_time} - ${endBloque.end_time}`;
    
    toggleModal('confirmarCitaModal', true);
}

function cerrarModalConfirmarCita() {
    toggleModal('confirmarCitaModal', false);
    
    // Limpiar selección
    document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
    agendaState.bloqueSeleccionado = null;
}

async function confirmarAgendarCita() {
    const motivo = document.getElementById('confirmMotivo').value.trim();
    if (!motivo) {
        mostrarMensaje('El motivo de la consulta es obligatorio', 'warning');
        return;
    }
    
    const startBloque = agendaState.bloques[agendaState.bloqueSeleccionado];
    
    const payload = {
        paciente_id: parseInt(agendaState.pacienteId),
        servicio_id: parseInt(agendaState.servicioId),
        veterinario_id: parseInt(agendaState.veterinarioId),
        fecha: agendaState.fecha,
        hora_inicio: startBloque.start_time,
        motivo: motivo,
        notas: document.getElementById('confirmNotas').value.trim(),
        tipo: 'consulta',
        estado: 'pendiente'
    };
    
    try {
        const response = await fetch('/agenda/citas/agendar-por-bloques/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarMensaje('Cita agendada exitosamente', 'success');
            cerrarModalConfirmarCita();
            cargarAgendaBloques(); // Recargar
        } else {
            mostrarMensaje(data.error || 'Error al agendar cita', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error de conexión al agendar cita', 'danger');
    }
}

// Modal de disponibilidad
function abrirModalDisponibilidad() {
    const rangosList = document.getElementById('rangosList');
    if (rangosList) {
        rangosList.innerHTML = '';
    }
    toggleModal('disponibilidadModal', true);
}

function cerrarModalDisponibilidad() {
    toggleModal('disponibilidadModal', false);
}

let rangoCounter = 0;

function agregarRango() {
    const container = document.getElementById('rangosList');
    const rangoDiv = document.createElement('div');
    rangoDiv.className = 'rango-item';
    rangoDiv.dataset.rangoId = rangoCounter++;
    
    rangoDiv.innerHTML = `
        <input type="time" class="form-control rango-inicio" step="900" required>
        <span>→</span>
        <input type="time" class="form-control rango-fin" step="900" required>
        <button type="button" class="btn btn-danger btn-sm" onclick="eliminarRango(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(rangoDiv);
}

function eliminarRango(btn) {
    btn.closest('.rango-item').remove();
}

async function guardarDisponibilidadDia() {
    const veterinarioSelect = document.getElementById('dispVeterinario');
    const fechaInput = document.getElementById('dispFecha');
    const trabajaInput = document.getElementById('dispTrabaja');
    
    const veterinarioId = veterinarioSelect ? veterinarioSelect.value : '';
    const fecha = fechaInput ? fechaInput.value : '';
    const trabaja = trabajaInput ? trabajaInput.checked : true;
    
    if (!veterinarioId || !fecha) {
        mostrarMensaje('Complete veterinario y fecha', 'warning');
        return;
    }
    
    const rangos = [];
    const rangoItems = document.querySelectorAll('.rango-item');
    if (trabaja && rangoItems.length) {
        for (const item of rangoItems) {
            const inicio = item.querySelector('.rango-inicio').value;
            const fin = item.querySelector('.rango-fin').value;
            
            if (!inicio || !fin) {
                mostrarMensaje('Complete todos los rangos horarios', 'warning');
                return;
            }
            
            const startBlock = timeToBlock(inicio);
            const endBlock = timeToBlock(fin);
            
            rangos.push({ start_block: startBlock, end_block: endBlock });
        }
    }
    
    const payload = {
        veterinario_id: parseInt(veterinarioId),
        fecha: fecha,
        trabaja: trabaja,
        rangos: rangos
    };
    
    try {
        // Aquí falta crear el endpoint para guardar DisponibilidadBloquesDia
        // Por ahora mostramos mensaje
        console.log('Guardar disponibilidad:', payload);
        mostrarMensaje('Funcionalidad en desarrollo: guardar disponibilidad por bloques', 'info');
        cerrarModalDisponibilidad();
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al guardar disponibilidad', 'danger');
    }
}

function timeToBlock(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return Math.floor((hours * 60 + minutes) / 15);
}

// Utilidades
function formatearFecha(fechaStr) {
    const [year, month, day] = fechaStr.split('-');
    const fecha = new Date(year, month - 1, day);
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return fecha.toLocaleDateString('es-ES', opciones);
}

function mostrarEstadoCarga(mensaje) {
    const estado = document.getElementById('agendaEstado');
    estado.innerHTML = `
        <i class="fas fa-spinner fa-spin fa-3x mb-3 text-primary"></i>
        <p class="text-muted">${mensaje}</p>
    `;
    estado.style.display = 'block';
    document.getElementById('agendaBloques').style.display = 'none';
}

function mostrarMensajeError(mensaje) {
    const estado = document.getElementById('agendaEstado');
    estado.innerHTML = `
        <i class="fas fa-exclamation-triangle fa-3x mb-3 text-danger"></i>
        <p class="text-danger"><strong>${mensaje}</strong></p>
    `;
    estado.style.display = 'block';
    document.getElementById('agendaBloques').style.display = 'none';
}

function mostrarMensaje(mensaje, tipo) {
    // Usar sistema de alertas del proyecto si existe, o alert simple
    alert(mensaje);
}

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

function mostrarDetalleCita(bloque) {
    if (!bloque.cita_id || !bloque.paciente_id) {
        return;
    }
    
    // Actualizar título con servicio y horario
    const titulo = `${bloque.servicio_nombre} | ${bloque.hora_inicio} - ${bloque.hora_fin}`;
    document.getElementById('detalleCitaTitulo').innerHTML = `<i class="fas fa-stethoscope"></i> ${titulo}`;
    
    // Llenar los datos del modal
    document.getElementById('detallePaciente').textContent = bloque.paciente_nombre || '-';
    document.getElementById('detallePropietario').textContent = bloque.propietario_nombre || '-';
    
    // Teléfono como enlace WhatsApp
    const btnTelefono = document.getElementById('detalleTelefonoPropietario');
    if (bloque.propietario_telefono) {
        btnTelefono.href = `https://wa.me/${bloque.propietario_telefono.replace(/\D/g, '')}`;
        btnTelefono.textContent = `📞 ${bloque.propietario_telefono}`;
        btnTelefono.target = '_blank';
    } else {
        btnTelefono.textContent = '-';
        btnTelefono.href = '#';
    }
    
    // Email como enlace mailto
    const btnEmail = document.getElementById('detalleEmailPropietario');
    if (bloque.propietario_email) {
        btnEmail.href = `mailto:${bloque.propietario_email}`;
        btnEmail.textContent = `📧 ${bloque.propietario_email}`;
    } else {
        btnEmail.textContent = '-';
        btnEmail.href = '#';
    }
    
    // Configurar el enlace a la ficha
    const enlaceFixa = document.getElementById('enlaceFixa');
    if (bloque.paciente_id) {
        // Enlace a la ficha de mascota (paciente)
        enlaceFixa.href = `/pacientes/${bloque.paciente_id}/`;
    }
    
    // Mostrar modal
    toggleModal('detalleCitaModal', true);
}

function cerrarModalDetalleCita() {
    toggleModal('detalleCitaModal', false);
}

function destacarCitaCompleta(citaId) {
    // Destacar todos los bloques con esta cita_id
    document.querySelectorAll(`[data-cita-id="${citaId}"]`).forEach(el => {
        el.style.opacity = '0.7';
        el.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.3)';
    });
}

function limpiarDestacadoCita() {
    // Remover destacado de todos los bloques
    document.querySelectorAll('[data-cita-id]').forEach(el => {
        el.style.opacity = '1';
        el.style.boxShadow = '';
    });
}
