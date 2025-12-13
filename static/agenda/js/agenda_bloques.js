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

let citaActualEnDetalle = null; // Rastrear cita en modal de detalle

let paginacionVets = {
    offset: 0,
    limite: 2,
    todosLosVets: []
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

// Estado del calendario
let calendarioState = {
    fechaSeleccionada: null,
    mesActual: new Date().getMonth(),
    anioActual: new Date().getFullYear(),
    feriados: [] // [{date: 'YYYY-MM-DD', title: '', irrenunciable: bool}]
};

// Helper para calcular hora final de un bloque (start_time + 15 min)
function calcularHoraFinalBloque(horaInicio) {
    const [hora, minuto] = horaInicio.split(':').map(Number);
    let minutoFinal = minuto + 15;
    let horaFinal = hora;
    if (minutoFinal >= 60) {
        minutoFinal -= 60;
        horaFinal += 1;
    }
    return `${String(horaFinal).padStart(2, '0')}:${String(minutoFinal).padStart(2, '0')}`;
}

// Helper para verificar si un bloque está en el pasado
function esBloqueEnPasado(fechaAgenda, horaBloque) {
    const ahora = new Date();
    const [year, month, day] = fechaAgenda.split('-');
    const [hora, minuto] = horaBloque.split(':').map(Number);
    const fechaBloque = new Date(year, month - 1, day, hora, minuto);
    return fechaBloque < ahora;
}

// Helper para obtener el índice del bloque más cercano a la hora actual
function obtenerIndiceBloqueActual(bloques, fechaAgenda) {
    const ahora = new Date();
    const [year, month, day] = fechaAgenda.split('-');
    
    for (let i = 0; i < bloques.length; i++) {
        const [hora, minuto] = bloques[i].start_time.split(':').map(Number);
        const fechaBloque = new Date(year, month - 1, day, hora, minuto);
        if (fechaBloque >= ahora) {
            return i;
        }
    }
    return -1; // Todos los bloques están en el pasado
}

// Calcular fecha de Pascua (algoritmo de Meeus/Jones/Butcher)
function calcularPascua(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

function generarFeriadosChile(year) {
    const feriados = [];
    
    // Función auxiliar para formatear fecha
    const formatFecha = (date) => date.toISOString().split('T')[0];
    
    // Función para mover al lunes más cercano
    const moverALunes = (date) => {
        const dia = date.getDay();
        if (dia === 0) { // Domingo
            date.setDate(date.getDate() + 1);
        } else if (dia === 6) { // Sábado
            date.setDate(date.getDate() + 2);
        }
        return date;
    };
    
    // Feriados fijos
    feriados.push({ date: formatFecha(new Date(year, 0, 1)), title: 'Año Nuevo', irrenunciable: true });
    feriados.push({ date: formatFecha(new Date(year, 4, 1)), title: 'Día del Trabajo', irrenunciable: true });
    feriados.push({ date: formatFecha(new Date(year, 4, 21)), title: 'Glorias Navales', irrenunciable: false });
    feriados.push({ date: formatFecha(new Date(year, 6, 16)), title: 'Virgen del Carmen', irrenunciable: false });
    feriados.push({ date: formatFecha(new Date(year, 7, 15)), title: 'Asunción de la Virgen', irrenunciable: false });
    feriados.push({ date: formatFecha(new Date(year, 8, 18)), title: 'Independencia Nacional', irrenunciable: true });
    feriados.push({ date: formatFecha(new Date(year, 8, 19)), title: 'Glorias del Ejército', irrenunciable: true });
    feriados.push({ date: formatFecha(new Date(year, 10, 1)), title: 'Día de Todos los Santos', irrenunciable: false });
    feriados.push({ date: formatFecha(new Date(year, 11, 8)), title: 'Inmaculada Concepción', irrenunciable: false });
    feriados.push({ date: formatFecha(new Date(year, 11, 25)), title: 'Navidad', irrenunciable: true });
    
    // San Pedro y San Pablo (29 junio, se mueve al lunes)
    const sanPedro = moverALunes(new Date(year, 5, 29));
    feriados.push({ date: formatFecha(sanPedro), title: 'San Pedro y San Pablo', irrenunciable: false });
    
    // Día de la Raza (12 octubre, se mueve al lunes)
    const diaRaza = moverALunes(new Date(year, 9, 12));
    feriados.push({ date: formatFecha(diaRaza), title: 'Encuentro de Dos Mundos', irrenunciable: false });
    
    // Día de las Iglesias Evangélicas (31 octubre, si cae viernes se anticipa, si domingo/sábado se mueve)
    const evangelical = new Date(year, 9, 31);
    const diaEv = evangelical.getDay();
    if (diaEv === 2 || diaEv === 3) { // Martes o miércoles
        evangelical.setDate(evangelical.getDate() - (diaEv - 1)); // Mover al lunes anterior
    } else if (diaEv === 0) { // Domingo
        evangelical.setDate(evangelical.getDate() + 1); // Mover al lunes siguiente
    } else if (diaEv === 6) { // Sábado
        evangelical.setDate(evangelical.getDate() - 5); // Mover al lunes anterior
    }
    feriados.push({ date: formatFecha(evangelical), title: 'Día de las Iglesias Evangélicas', irrenunciable: false });
    
    // Semana Santa (Viernes Santo y Sábado Santo)
    const pascua = calcularPascua(year);
    const viernesSanto = new Date(pascua);
    viernesSanto.setDate(pascua.getDate() - 2);
    const sabadoSanto = new Date(pascua);
    sabadoSanto.setDate(pascua.getDate() - 1);
    
    feriados.push({ date: formatFecha(viernesSanto), title: 'Viernes Santo', irrenunciable: false });
    feriados.push({ date: formatFecha(sabadoSanto), title: 'Sábado Santo', irrenunciable: false });
    
    return feriados;
}

function cargarFeriados() {
    // Generar feriados para el año actual y el siguiente
    const anioActual = new Date().getFullYear();
    calendarioState.feriados = [
        ...generarFeriadosChile(anioActual),
        ...generarFeriadosChile(anioActual + 1)
    ];
}

function esFeriado(fechaStr) {
    return calendarioState.feriados.find(f => f.date === fechaStr);
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const hoy = new Date().toISOString().split('T')[0];
    const fechaParam = params.get('fecha');
    const initialDate = fechaParam || hoy;
    const initialDateObj = new Date(initialDate);

    // Ajustar estado del calendario a la fecha solicitada (deep-link)
    if (!Number.isNaN(initialDateObj.getTime())) {
        calendarioState.mesActual = initialDateObj.getMonth();
        calendarioState.anioActual = initialDateObj.getFullYear();
    }

    inicializarCalendario();
    inicializarControles();
    inicializarBuscadorPacientes();
    inicializarBuscadorServicios();
    inicializarBuscadoresModalDirecto();
    inicializarTabs();
    
    // Setear fecha inicial (hoy o la recibida por querystring)
    document.getElementById('fechaAgenda').value = initialDate;
    calendarioState.fechaSeleccionada = initialDate;
    
    // Event listener para filtro de veterinario
    document.getElementById('filtroVeterinario').addEventListener('change', function() {
        agendaState.veterinarioId = this.value || null;
        cargarTodasLasAgendas();
    });
    
    // Si viene un veterinario preseleccionado en la URL, aplicarlo antes de cargar
    const vetParam = params.get('veterinario');
    if (vetParam) {
        const filtroVet = document.getElementById('filtroVeterinario');
        if (filtroVet) filtroVet.value = vetParam;
        agendaState.veterinarioId = vetParam;
    }

    // Cargar automáticamente las agendas
    agendaState.fecha = initialDate;
    setTimeout(() => cargarTodasLasAgendas(), 300);

    // Deep-link: abrir detalle de cita desde dashboard
    try {
        const detalleId = params.get('detalle_cita');
        if (detalleId) {
            if (window.showConsultaLoader) window.showConsultaLoader();
            // Dar tiempo adicional para que las agendas se rendericen
            setTimeout(() => {
                let attempts = 0;
                const timer = setInterval(() => {
                    // Buscar en todo el documento cualquier elemento con data-cita-id
                    const blockEl = document.querySelector(`[data-cita-id="${detalleId}"]`);
                    const contenedor = document.getElementById('contenedorAgendas');
                    const rendered = contenedor && contenedor.style.display !== 'none' && contenedor.children.length > 0;

                    if (blockEl && blockEl.dataset) {
                        const bloque = {
                            cita_id: blockEl.dataset.citaId || detalleId,
                            paciente_id: blockEl.dataset.pacienteId || null,
                            paciente_nombre: blockEl.querySelector('.bloque-paciente')?.textContent || (blockEl.dataset.pacienteNombre || ''),
                            propietario_nombre: blockEl.dataset.propietarioNombre || '',
                            propietario_telefono: blockEl.dataset.propietarioTelefono || '',
                            propietario_email: blockEl.dataset.propietarioEmail || '',
                            servicio_nombre: blockEl.dataset.servicioNombre || '',
                            fecha: blockEl.dataset.fecha || calendarioState.fechaSeleccionada,
                            hora_inicio: blockEl.dataset.horaInicio || '',
                            hora_fin: blockEl.dataset.horaFin || '',
                            veterinario_id: blockEl.dataset.veterinarioId || null,
                            status: 'occupied'
                        };
                        try { mostrarDetalleCita(bloque); } catch (e) { console.warn('Deep-link detalle_cita error:', e); if (window.hideConsultaLoader) window.hideConsultaLoader(); }
                        clearInterval(timer);
                    } else if (attempts++ > 100 || rendered) {
                        // Si ya se renderizó y no encontramos el bloque, dejar de intentar
                        clearInterval(timer);
                        if (window.hideConsultaLoader) window.hideConsultaLoader();
                    }
                }, 200);
            }, 800);
        }
    } catch (e) {
        console.warn('Deep-link detalle_cita falló:', e);
        if (window.hideConsultaLoader) window.hideConsultaLoader();
    }
});

function inicializarCalendario() {
    // Generar feriados chilenos
    cargarFeriados();
    
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    
    // Poblar select de meses
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const selectMes = document.getElementById('calMes');
    meses.forEach((mes, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = mes;
        selectMes.appendChild(opt);
    });
    selectMes.value = calendarioState.mesActual;
    
    // Poblar select de años (actual y siguiente)
    const selectAnio = document.getElementById('calAnio');
    [anioActual, anioActual + 1].forEach(anio => {
        const opt = document.createElement('option');
        opt.value = anio;
        opt.textContent = anio;
        selectAnio.appendChild(opt);
    });
    selectAnio.value = calendarioState.anioActual;
    
    // Event listeners
    document.getElementById('calPrevMes').addEventListener('click', () => cambiarMes(-1));
    document.getElementById('calNextMes').addEventListener('click', () => cambiarMes(1));
    document.getElementById('calHoy').addEventListener('click', () => irAHoy());
    selectMes.addEventListener('change', (e) => {
        calendarioState.mesActual = parseInt(e.target.value);
        renderizarCalendario();
    });
    selectAnio.addEventListener('change', (e) => {
        calendarioState.anioActual = parseInt(e.target.value);
        renderizarCalendario();
    });
    
    renderizarCalendario();
}

function cambiarMes(delta) {
    calendarioState.mesActual += delta;
    if (calendarioState.mesActual < 0) {
        calendarioState.mesActual = 11;
        calendarioState.anioActual--;
    } else if (calendarioState.mesActual > 11) {
        calendarioState.mesActual = 0;
        calendarioState.anioActual++;
    }
    
    // Limitar a año actual y siguiente
    const anioActual = new Date().getFullYear();
    if (calendarioState.anioActual > anioActual + 1) {
        calendarioState.anioActual = anioActual + 1;
        calendarioState.mesActual = 11;
    } else if (calendarioState.anioActual < anioActual) {
        calendarioState.anioActual = anioActual;
        calendarioState.mesActual = 0;
    }
    
    document.getElementById('calMes').value = calendarioState.mesActual;
    document.getElementById('calAnio').value = calendarioState.anioActual;
    renderizarCalendario();
}

function renderizarCalendario() {
    const container = document.getElementById('calendarioDias');
    container.innerHTML = '';
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const primerDia = new Date(calendarioState.anioActual, calendarioState.mesActual, 1);
    const ultimoDia = new Date(calendarioState.anioActual, calendarioState.mesActual + 1, 0);
    
    // Ajustar para que Lunes sea el primer día (0=Lun, 6=Dom)
    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio < 0) diaSemanaInicio = 6;
    
    // Días vacíos al inicio
    for (let i = 0; i < diaSemanaInicio; i++) {
        const div = document.createElement('div');
        div.className = 'dia-cal vacio';
        container.appendChild(div);
    }
    
    // Días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const fecha = new Date(calendarioState.anioActual, calendarioState.mesActual, dia);
        const fechaStr = fecha.toISOString().split('T')[0];
        const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes...
        
        const div = document.createElement('div');
        div.className = 'dia-cal';
        div.textContent = dia;
        div.dataset.fecha = fechaStr;
        
        // Verificar feriado
        const feriado = esFeriado(fechaStr);
        
        // Verificar si es pasado o irrenunciable
        if (fecha < hoy) {
            div.classList.add('disabled');
        } else if (feriado && feriado.irrenunciable) {
            div.classList.add('irrenunciable');
            div.title = `Feriado irrenunciable: ${feriado.title}`;
        } else {
            div.addEventListener('click', () => seleccionarFecha(fechaStr));
            if (feriado) {
                div.classList.add('feriado');
                div.title = `Feriado: ${feriado.title}`;
            }
        }
        
        // Domingo en rojo
        if (diaSemana === 0) {
            div.classList.add('domingo');
        }
        
        // Marcar hoy
        if (fechaStr === hoy.toISOString().split('T')[0]) {
            div.classList.add('hoy');
        }
        
        // Marcar seleccionado
        if (fechaStr === calendarioState.fechaSeleccionada) {
            div.classList.add('seleccionado');
        }
        
        container.appendChild(div);
    }
}

function seleccionarFecha(fechaStr) {
    calendarioState.fechaSeleccionada = fechaStr;
    document.getElementById('fechaAgenda').value = fechaStr;
    agendaState.fecha = fechaStr;
    renderizarCalendario();
    cargarTodasLasAgendas();
}

function irAHoy() {
    const hoy = new Date();
    calendarioState.mesActual = hoy.getMonth();
    calendarioState.anioActual = hoy.getFullYear();
    document.getElementById('calMes').value = calendarioState.mesActual;
    document.getElementById('calAnio').value = calendarioState.anioActual;
    
    const fechaHoy = hoy.toISOString().split('T')[0];
    seleccionarFecha(fechaHoy);
}

function inicializarControles() {
    // Botón cargar
    document.getElementById('btnCargarBloques').addEventListener('click', cargarTodasLasAgendas);
    
    // Botones de navegación entre veterinarios
    document.getElementById('btnNavIzq').addEventListener('click', () => navegarVets(-1));
    document.getElementById('btnNavDer').addEventListener('click', () => navegarVets(1));
}

function inicializarBuscadorPacientes() {
    const input = document.getElementById('buscarPaciente');
    const select = document.getElementById('pacienteSelect');
    
    if (!input || !select) return;
    
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
    
    // Busca directa en modal
    const inputDirecto = document.getElementById('buscarPacienteDirecto');
    const selectDirecto = document.getElementById('pacienteSelectDirecto');
    
    if (inputDirecto && selectDirecto) {
        inputDirecto.addEventListener('input', function() {
            const busqueda = this.value.toLowerCase();
            const opciones = selectDirecto.querySelectorAll('option');
            
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
    
    // Búsqueda directa en modal
    const inputDirecto = document.getElementById('buscarServicioDirecto');
    const selectDirecto = document.getElementById('servicioSelectDirecto');
    
    if (inputDirecto && selectDirecto) {
        inputDirecto.addEventListener('input', function() {
            const busqueda = this.value.toLowerCase();
            const opciones = selectDirecto.querySelectorAll('option');
            const optgroups = selectDirecto.querySelectorAll('optgroup');
            
            opciones.forEach(opt => {
                if (opt.value === '') return;
                const nombre = opt.dataset.nombre || '';
                const categoria = opt.dataset.categoria || '';
                
                if (nombre.includes(busqueda) || categoria.includes(busqueda)) {
                    opt.style.display = '';
                } else {
                    opt.style.display = 'none';
                }
            });
            
            // Mostrar/ocultar optgroups
            optgroups.forEach(group => {
                const tieneVisibles = group.querySelectorAll('option:not([style*="display: none"])').length > 0;
                group.style.display = tieneVisibles ? '' : 'none';
            });
        });
    }
}

function inicializarBuscadoresModalDirecto() {
    // Buscador de servicio en modal directo
    const inputServicioDirecto = document.getElementById('buscarServicioDirecto');
    const selectServicioDirecto = document.getElementById('servicioSelectDirecto');
    
    if (inputServicioDirecto && selectServicioDirecto) {
        inputServicioDirecto.addEventListener('input', function() {
            const busqueda = this.value.toLowerCase();
            const opciones = selectServicioDirecto.querySelectorAll('option');
            const optgroups = selectServicioDirecto.querySelectorAll('optgroup');
            
            opciones.forEach(opt => {
                if (opt.value === '') return;
                const nombre = opt.dataset.nombre || '';
                const categoria = opt.dataset.categoria || '';
                
                if (nombre.includes(busqueda) || categoria.includes(busqueda)) {
                    opt.style.display = '';
                } else {
                    opt.style.display = 'none';
                }
            });
            
            // Mostrar/ocultar optgroups
            optgroups.forEach(group => {
                const tieneVisibles = group.querySelectorAll('option:not([style*="display: none"])').length > 0;
                group.style.display = tieneVisibles ? '' : 'none';
            });
        });
    }
    
    // Buscador de paciente en modal directo
    const inputPacienteDirecto = document.getElementById('buscarPacienteDirecto');
    const selectPacienteDirecto = document.getElementById('pacienteSelectDirecto');
    
    if (inputPacienteDirecto && selectPacienteDirecto) {
        inputPacienteDirecto.addEventListener('input', function() {
            const busqueda = this.value.toLowerCase();
            const opciones = selectPacienteDirecto.querySelectorAll('option');
            
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

async function cargarTodasLasAgendas() {
    if (!agendaState.fecha) {
        mostrarMensaje('Seleccione una fecha', 'warning');
        return;
    }
    
    // Actualizar título de fecha
    document.getElementById('fechaTitulo').textContent = formatearFecha(agendaState.fecha);
    
    // Mostrar estado de carga
    document.getElementById('agendaEstado').style.display = 'block';
    document.getElementById('contenedorAgendas').style.display = 'none';
    
    const [year, month, day] = agendaState.fecha.split('-');
    
    // Obtener todos los veterinarios de los contenedores
    const contenedorAgendas = document.getElementById('contenedorAgendas');
    const gridsVeterinarios = contenedorAgendas.querySelectorAll('[id^="agendaBloques"]');
    
    // Extraer IDs de veterinarios de los atributos id
    const todosVets = Array.from(gridsVeterinarios).map(grid => {
        const match = grid.id.match(/agendaBloques(\d+)/);
        return match ? match[1] : null;
    }).filter(id => id !== null);
    
    // Aplicar filtro de veterinario si está seleccionado
    const filtroVet = document.getElementById('filtroVeterinario').value;
    const vetsACargar = filtroVet ? [filtroVet] : todosVets;
    
    // Ocultar todos los vets primero
    todosVets.forEach(vetId => {
        const seccion = document.getElementById(`agendaBloques${vetId}`).closest('.agenda-vet-col');
        if (seccion) seccion.style.display = 'none';
    });
    
    try {
        // Cargar TODAS las agendas primero para saber quién trabaja
        const promesasTodos = vetsACargar.map(vetId => 
            fetch(`/agenda/bloques/${vetId}/${year}/${month}/${day}/`)
                .then(response => response.json())
                .then(data => ({ vetId, data }))
        );
        
        const todosDatos = await Promise.all(promesasTodos);
        
        // Filtrar solo los que trabajan
        const vetsTrabajando = todosDatos.filter(({ data }) => data.trabaja);
        
        // Si nadie trabaja, mostrar mensaje
        if (vetsTrabajando.length === 0) {
            document.getElementById('agendaEstado').style.display = 'none';
            document.getElementById('agendaSinVets').style.display = 'block';
            document.getElementById('contenedorAgendas').style.display = 'none';
            document.getElementById('agendaLeyenda').style.display = 'none';
            document.getElementById('btnNavIzq').style.display = 'none';
            document.getElementById('btnNavDer').style.display = 'none';
            return;
        }
        
        // Guardar los vets que trabajan e inicializar paginación
        paginacionVets.todosLosVets = vetsTrabajando.map(v => v.vetId);
        if (paginacionVets.offset >= paginacionVets.todosLosVets.length) {
            paginacionVets.offset = Math.max(0, paginacionVets.todosLosVets.length - paginacionVets.limite);
        }
        
        // Si hay 2 o menos veterinarios, mostrar todos y ocultar navegación
        const btnNavIzq = document.getElementById('btnNavIzq');
        const btnNavDer = document.getElementById('btnNavDer');
        console.log('Total vets trabajando:', paginacionVets.todosLosVets.length, 'Limite:', paginacionVets.limite);
        if (paginacionVets.todosLosVets.length <= paginacionVets.limite) {
            console.log('Ocultando botones de navegación');
            if (btnNavIzq) {
                btnNavIzq.style.display = 'none';
                btnNavIzq.style.setProperty('display', 'none', 'important');
            }
            if (btnNavDer) {
                btnNavDer.style.display = 'none';
                btnNavDer.style.setProperty('display', 'none', 'important');
            }
        }
        
        // Determinar qué veterinarios mostrar (ventana deslizante de los que trabajan)
        const vetsAMostrar = paginacionVets.todosLosVets.slice(
            paginacionVets.offset, 
            paginacionVets.offset + paginacionVets.limite
        );
        
        // Renderizar solo los vets a mostrar
        vetsTrabajando.forEach(({ vetId, data }) => {
            if (vetsAMostrar.includes(vetId)) {
                renderizarBloquesVeterinario(vetId, data);
            }
        });
        
        // Ocultar estado de carga y mostrar agendas
        document.getElementById('agendaEstado').style.display = 'none';
        document.getElementById('agendaSinVets').style.display = 'none';
        document.getElementById('contenedorAgendas').style.display = 'grid';
        document.getElementById('agendaLeyenda').style.display = 'block';
        
        // Actualizar controles de navegación
        actualizarControlesNavegacion();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensajeError('Error de conexión al cargar agendas');
    }
}

async function cargarAgendaBloques() {
    // Mantener por compatibilidad, ahora redirige a cargar todas
    cargarTodasLasAgendas();
}

async function cargarBloquesParaFecha(vetId, fecha) {
    try {
        const [year, month, day] = fecha.split('-');
        const response = await fetch(`/agenda/bloques/${vetId}/${year}/${month}/${day}/`);
        const data = await response.json();
        if (data && data.blocks) {
            agendarState.bloques = data.blocks;
        }
    } catch (err) {
        console.error('Error cargando bloques para fecha:', err);
    }
}

function renderizarBloquesVeterinario(vetId, data) {
    const container = document.getElementById(`agendaBloques${vetId}`);
    const estadoVet = document.getElementById(`estadoVet${vetId}`);
    const seccionVeterinario = container.closest('.agenda-vet-col');
    
    if (!data.trabaja) {
        // Ocultar toda la sección del veterinario que no trabaja
        if (seccionVeterinario) {
            seccionVeterinario.style.display = 'none';
        }
        return;
    }
    
    // Mostrar la sección del veterinario que sí trabaja
    if (seccionVeterinario) {
        seccionVeterinario.style.display = 'block';
    }
    estadoVet.style.display = 'none';
    container.style.display = 'grid';
    container.innerHTML = '';
    
    // Guardar datos en el contenedor para referencia
    container.dataset.veterinarioId = vetId;
    container.dataset.veterinario = data.veterinario;
    
    // Obtener fecha de la agenda
    const fechaAgenda = agendaState.fecha || calendarioState.fechaSeleccionada;
    let primerBloqueActual = null;
    
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
                    
                    // Saltar bloques no disponibles (no se renderizan)
                    if (bloque.status === 'unavailable') {
                        cuarto++;
                        continue;
                    }
                    
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
                        blockEl.dataset.pacienteId = bloque.paciente_id || '';
                        blockEl.dataset.pacienteNombre = bloque.paciente_nombre || '';
                        blockEl.dataset.propietarioNombre = bloque.propietario_nombre || '';
                        blockEl.dataset.propietarioTelefono = bloque.propietario_telefono || '';
                        blockEl.dataset.propietarioEmail = bloque.propietario_email || '';
                        blockEl.dataset.servicioNombre = bloque.servicio_nombre || '';
                        blockEl.dataset.fecha = bloque.fecha || calendarioState.fechaSeleccionada || '';
                        blockEl.dataset.horaInicio = bloque.hora_inicio || bloque.start_time || '';
                        blockEl.dataset.horaFin = bloque.hora_fin || bloque.end_time || '';
                        blockEl.dataset.startTime = bloque.start_time;
                        blockEl.style.gridColumn = `span ${endQuarto - cuarto}`;
                        const duracionBloques = endQuarto - cuarto;
                        if (duracionBloques === 1) {
                            // Bloque individual: verificar si es el primer bloque de esta cita
                            const esPrimerBloque = !bloque.hora_inicio || bloque.hora_inicio === bloque.start_time;
                            const horaAMostrar = esPrimerBloque ? bloque.start_time : `- ${calcularHoraFinalBloque(bloque.start_time)}`;
                            blockEl.innerHTML = `
                                <div class="agenda-block-time">${horaAMostrar}</div>
                                <div class="agenda-block-label">${bloque.paciente_nombre || 'Sin paciente'}</div>
                                <div class="agenda-block-info">...</div>
                            `;
                        } else {
                            // Bloque múltiple: mostrar información completa
                            blockEl.innerHTML = `
                                <div class="agenda-block-time">${bloque.hora_inicio || bloque.start_time} - ${bloque.hora_fin || bloque.end_time}</div>
                                <div class="agenda-block-label">${bloque.paciente_nombre || 'Sin paciente'} | ${bloque.propietario_nombre || 'Sin dueño'}</div>
                                <div class="agenda-block-info">${bloque.servicio_nombre || 'Sin servicio'}</div>
                            `;
                        }
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
                            blockEl.dataset.pacienteId = bloque.paciente_id || '';
                            blockEl.dataset.pacienteNombre = bloque.paciente_nombre || '';
                            blockEl.dataset.propietarioNombre = bloque.propietario_nombre || '';
                            blockEl.dataset.propietarioTelefono = bloque.propietario_telefono || '';
                            blockEl.dataset.propietarioEmail = bloque.propietario_email || '';
                            blockEl.dataset.servicioNombre = bloque.servicio_nombre || '';
                            blockEl.dataset.fecha = bloque.fecha || calendarioState.fechaSeleccionada || '';
                            blockEl.dataset.horaInicio = bloque.hora_inicio || bloque.start_time || '';
                            blockEl.dataset.horaFin = bloque.hora_fin || bloque.end_time || '';
                        }
                        blockEl.dataset.startTime = bloque.start_time;
                        
                        // Verificar si el bloque está en el pasado
                        const esPasado = fechaAgenda && esBloqueEnPasado(fechaAgenda, bloque.start_time);
                        if (esPasado && bloque.status === 'available') {
                            blockEl.classList.remove('is-available');
                            blockEl.classList.add('is-past');
                        }
                        
                        blockEl.innerHTML = `
                            <span class="agenda-block-time">${bloque.start_time}</span>
                            ${bloque.label ? `<span class="agenda-block-label">${bloque.label}</span>` : ''}
                        `;
                        
                        if (bloque.status === 'available' && !esPasado) {
                            blockEl.addEventListener('click', () => abrirModalAgendarDirecta(blockIndex, vetId, bloque.start_time, data.veterinario, data.blocks));
                            blockEl.addEventListener('mouseenter', () => previsualizarBloques(blockIndex, vetId, data.blocks));
                            blockEl.addEventListener('mouseleave', limpiarPrevisualizacion);
                        }
                        
                        // Guardar referencia al primer bloque disponible actual/futuro
                        if (!primerBloqueActual && !esPasado) {
                            primerBloqueActual = blockEl;
                        }
                        
                        container.appendChild(blockEl);
                        cuarto++;
                    }
                }
            }
        });
    }
    
    // Hacer scroll automático al primer bloque actual/futuro
    if (primerBloqueActual) {
        setTimeout(() => {
            const bloqueTop = primerBloqueActual.offsetTop;
            const containerHeight = container.clientHeight;
            const bloqueHeight = primerBloqueActual.clientHeight;
            const scrollPosition = bloqueTop - (containerHeight / 2) + (bloqueHeight / 2);
            container.scrollTo({ top: scrollPosition, behavior: 'smooth' });
        }, 100);
    }
}

function previsualizarBloques(startIndex, vetId, bloques) {
    if (!agendaState.servicioId) return;
    
    limpiarPrevisualizacion();
    
    const endIndex = startIndex + agendaState.bloquesRequeridos;
    let todosDisponibles = true;
    
    for (let i = startIndex; i < endIndex && i < 96; i++) {
        const bloque = bloques[i];
        if (bloque.status !== 'available') {
            todosDisponibles = false;
            break;
        }
    }
    
    if (todosDisponibles) {
        const container = document.getElementById(`agendaBloques${vetId}`);
        for (let i = startIndex; i < endIndex && i < 96; i++) {
            const blockEl = container.querySelector(`[data-block-index="${i}"]`);
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

async function iniciarCita(citaId, blockElement) {
    try {
        const response = await fetch(`/agenda/citas/iniciar/${citaId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': obtenerCsrfToken(),
            },
            body: JSON.stringify({}),
        });
        const data = await response.json();
        if (data.success) {
            // Marcar visualmente como en curso
            blockElement.classList.remove('cita-agendada');
            blockElement.classList.add('is-selected');
            const btn = blockElement.querySelector('.btn-iniciar-cita');
            if (btn) btn.remove();
            mostrarMensaje('Consulta iniciada', 'success');
        } else {
            mostrarMensaje(data.error || 'No se pudo iniciar la cita', 'danger');
        }
    } catch (e) {
        console.error(e);
        mostrarMensaje('Error de conexión al iniciar cita', 'danger');
    }
}

function obtenerCsrfToken() {
    const name = 'csrftoken=';
    const parts = document.cookie.split(';');
    for (let i = 0; i < parts.length; i++) {
        let c = parts[i].trim();
        if (c.startsWith(name)) return c.substring(name.length, c.length);
    }
    return '';
}

function seleccionarBloque(startIndex, vetId, bloques) {
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
        const bloque = bloques[i];
        if (bloque.status !== 'available') {
            mostrarMensaje('No hay suficientes bloques disponibles consecutivos', 'danger');
            return;
        }
    }
    
    // Guardar selección con contexto de veterinario
    agendaState.bloqueSeleccionado = startIndex;
    agendaState.veterinarioId = vetId;
    agendaState.bloques = bloques;
    
    // Marcar seleccionados (solo en el grid del veterinario)
    document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
    const container = document.getElementById(`agendaBloques${vetId}`);
    for (let i = startIndex; i < endIndex && i < 96; i++) {
        const blockEl = container.querySelector(`[data-block-index="${i}"]`);
        if (blockEl) {
            blockEl.classList.add('is-selected');
        }
    }
    
    // Abrir modal de confirmación
    abrirModalConfirmarCita(startIndex, endIndex, vetId);
}

function abrirModalConfirmarCita(startBlock, endBlock, vetId) {
    const startBloque = agendaState.bloques[startBlock];
    const endBloque = agendaState.bloques[endBlock - 1];
    
    const pacienteSelect = document.getElementById('pacienteSelect');
    const pacienteNombre = pacienteSelect.options[pacienteSelect.selectedIndex].text;
    
    const container = document.getElementById(`agendaBloques${vetId}`);
    const veterinarioNombre = container.dataset.veterinario;
    
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
            cargarTodasLasAgendas(); // Recargar todas las agendas
        } else {
            mostrarMensaje(data.error || 'Error al agendar cita', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error de conexión al agendar cita', 'danger');
    }
}

// Modal de disponibilidad
function abrirModalDisponibilidad(veterinarioId = null) {
    const rangosList = document.getElementById('rangosList');
    if (rangosList) {
        rangosList.innerHTML = '';
    }
    
    // Si se proporciona un veterinarioId, pre-seleccionarlo y cargar su disponibilidad
    if (veterinarioId) {
        const selectVet = document.getElementById('dispVeterinario');
        if (selectVet) {
            selectVet.value = veterinarioId;
            // Disparar el evento change para cargar la disponibilidad del veterinario
            const event = new Event('change', { bubbles: true });
            selectVet.dispatchEvent(event);
        }
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

// ===== MODAL DE AGENDAMIENTO DIRECTO =====

let agendarState = {
    blockIndex: null,
    vetId: null,
    startTime: null,
    veterinario: null,
    bloques: [],
    servicioId: null,
    pacienteId: null
};

function abrirModalAgendarDirecta(blockIndex, vetId, startTime, veterinario, bloques) {
    agendarState.blockIndex = blockIndex;
    agendarState.vetId = vetId;
    agendarState.startTime = startTime;  // Guardar la hora del bloque clickeado
    agendarState.veterinario = veterinario;
    agendarState.bloques = bloques;
    agendarState.servicioId = null;
    agendarState.pacienteId = null;
    
    // Llenar datos automáticos
    document.getElementById('agendarVeterinario').textContent = veterinario;
    const fechaInput = document.getElementById('agendarFechaInput');
    fechaInput.value = agendaState.fecha;
    fechaInput.onchange = async (e) => {
        const nuevaFecha = e.target.value;
        if (!nuevaFecha) return;
        agendaState.fecha = nuevaFecha;
        await cargarBloquesParaFecha(agendarState.vetId, nuevaFecha);
        inicializarHorasDisponibles();
        // Si hay servicio seleccionado, aplicar filtro
        const servicioSelect = document.getElementById('servicioSelectDirecto');
        if (servicioSelect.value) {
            actualizarHorasDisponibles();
        }
    };
    
    // Limpiar selectores
    document.getElementById('servicioSelectDirecto').value = '';
    document.getElementById('pacienteSelectDirecto').value = '';
    document.getElementById('buscarServicioDirecto').value = '';
    document.getElementById('buscarPacienteDirecto').value = '';
    
    // Restablecer visibilidad de opciones
    document.querySelectorAll('#servicioSelectDirecto option').forEach(opt => opt.style.display = '');
    document.querySelectorAll('#pacienteSelectDirecto option').forEach(opt => opt.style.display = '');
    document.querySelectorAll('#servicioSelectDirecto optgroup').forEach(group => group.style.display = '');
    
    // Inicializar horas disponibles
    inicializarHorasDisponibles();
    
    toggleModal('agendarCitaDirectaModal', true);
}

function cerrarModalAgendarDirecta() {
    toggleModal('agendarCitaDirectaModal', false);
    agendarState = {
        blockIndex: null,
        vetId: null,
        startTime: null,
        veterinario: null,
        bloques: [],
        servicioId: null,
        pacienteId: null
    };
}

function inicializarHorasDisponibles() {
    const horaSelect = document.getElementById('agendarHora');
    const bloques = agendarState.bloques;
    
    // Encontrar todas las horas disponibles (sin filtro de servicio)
    const horasDisponibles = new Set();
    
    bloques.forEach((bloque, index) => {
        if (bloque.status === 'available') {
            horasDisponibles.add(bloque.start_time);
        }
    });
    
    // Llenar el select
    horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';
    
    if (horasDisponibles.size === 0) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'No hay horas disponibles';
        horaSelect.appendChild(option);
    } else {
        const horasOrdenadas = Array.from(horasDisponibles).sort();
        horasOrdenadas.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = hora;
            horaSelect.appendChild(option);
        });
        
        // Seleccionar la hora del bloque clickeado por defecto
        if (horasDisponibles.has(agendarState.startTime)) {
            horaSelect.value = agendarState.startTime;
        }
    }
}

function actualizarHorasDisponibles() {
    const servicioSelect = document.getElementById('servicioSelectDirecto');
    const horaSelect = document.getElementById('agendarHora');
    const mensajeBloquesEl = document.getElementById('bloquesRequeridosDirecto');
    const servicioId = servicioSelect.value;
    
    // Limpiar select de horas
    horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';
    
    if (!servicioId) {
        mensajeBloquesEl.textContent = '';
        mensajeBloquesEl.className = 'text-muted';
        return;
    }
    
    const option = servicioSelect.options[servicioSelect.selectedIndex];
    const duracion = parseInt(option.dataset.duracion) || 15;
    const bloquesRequeridos = Math.ceil(duracion / 15);
    
    // Encontrar todas las horas disponibles que tengan espacio para este servicio
    const horasDisponibles = new Set();
    const bloques = agendarState.bloques;
    
    for (let i = 0; i < bloques.length - bloquesRequeridos + 1; i++) {
        let todosDisponibles = true;
        for (let j = i; j < i + bloquesRequeridos; j++) {
            if (bloques[j].status !== 'available') {
                todosDisponibles = false;
                break;
            }
        }
        if (todosDisponibles) {
            horasDisponibles.add(bloques[i].start_time);
        }
    }
    
    // Verificar si la hora del bloque clickeado tiene suficiente espacio
    const horaInicialDisponible = horasDisponibles.has(agendarState.startTime);
    
    // Llenar el select con horas disponibles
    if (horasDisponibles.size === 0) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'No hay horas disponibles para este servicio';
        horaSelect.appendChild(option);
        
        mensajeBloquesEl.textContent = `⚠️ Este servicio requiere ${duracion} minutos (${bloquesRequeridos} bloques consecutivos). No hay horarios disponibles.`;
        mensajeBloquesEl.className = 'text-danger fw-bold';
    } else {
        const horasOrdenadas = Array.from(horasDisponibles).sort();
        horasOrdenadas.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = hora;
            horaSelect.appendChild(option);
        });
        
        // Mostrar mensaje según disponibilidad en el bloque original
        if (!horaInicialDisponible) {
            mensajeBloquesEl.textContent = `⚠️ La hora seleccionada (${agendarState.startTime}) no tiene ${duracion} minutos disponibles. Por favor, elige otra hora de las disponibles.`;
            mensajeBloquesEl.className = 'text-warning fw-bold';
            // NO seleccionar automáticamente ninguna hora, el usuario debe elegir
        } else {
            // La hora original sí tiene espacio, seleccionarla
            horaSelect.value = agendarState.startTime;
            mensajeBloquesEl.textContent = `✓ Requiere ${duracion} minutos (${bloquesRequeridos} bloques). Hora confirmada.`;
            mensajeBloquesEl.className = 'text-success';
        }
    }
    
    agendarState.servicioId = servicioId;
}

function confirmarAgendarCitaDirecta() {
    const servicioSelect = document.getElementById('servicioSelectDirecto');
    const pacienteSelect = document.getElementById('pacienteSelectDirecto');
    const horaSelect = document.getElementById('agendarHora');
    
    if (!servicioSelect.value) {
        mostrarMensaje('Selecciona un servicio', 'warning');
        return;
    }
    
    if (!pacienteSelect.value) {
        mostrarMensaje('Selecciona un paciente', 'warning');
        return;
    }
    
    if (!horaSelect.value) {
        mostrarMensaje('Selecciona una hora válida', 'warning');
        return;
    }
    
    const servicioId = servicioSelect.value;
    const pacienteId = pacienteSelect.value;
    const hora = horaSelect.value;
    
    agendarCita(servicioId, pacienteId, hora);
}

async function agendarCita(servicioId, pacienteId, hora) {
    const payload = {
        paciente_id: parseInt(pacienteId),
        servicio_id: parseInt(servicioId),
        veterinario_id: parseInt(agendarState.vetId),
        fecha: agendaState.fecha,
        hora_inicio: hora,
        motivo: 'Cita agendada',
        notas: '',
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
            cerrarModalAgendarDirecta();
            cargarTodasLasAgendas();
        } else {
            mostrarMensaje(data.error || 'Error al agendar cita', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error de conexión al agendar cita', 'danger');
    }
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
    if (window.hideConsultaLoader) window.hideConsultaLoader();
    if (!bloque.cita_id || !bloque.paciente_id) {
        return;
    }
    
    // Guardar la cita actual en detalle
    citaActualEnDetalle = {
        citaId: bloque.cita_id,
        pacienteNombre: bloque.paciente_nombre,
        servicioNombre: bloque.servicio_nombre,
        horaInicio: bloque.hora_inicio,
        horaFin: bloque.hora_fin,
        fecha: bloque.fecha || agendaState.fecha || null,
    };
    
    // Actualizar título con servicio y horario
    const titulo = `${bloque.servicio_nombre} | ${bloque.hora_inicio} - ${bloque.hora_fin}`;
    document.getElementById('detalleCitaTitulo').innerHTML = `<i class="fas fa-stethoscope"></i> ${titulo}`;
    
    // Llenar los datos del modal
    document.getElementById('detallePaciente').textContent = bloque.paciente_nombre || '-';
    document.getElementById('detallePropietario').textContent = bloque.propietario_nombre || '-';

    const fechaDetalle = bloque.fecha || agendaState.fecha || null;
    const fechaLabel = fechaDetalle ? formatearFecha(fechaDetalle) : '-';
    document.getElementById('detalleFecha').textContent = fechaLabel;
    
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
    citaActualEnDetalle = null;
}

function abrirModalConfirmarCancelacion() {
    if (!citaActualEnDetalle) {
        alert('Error: No se pudo identificar la cita a cancelar.');
        return;
    }
    
    const mensaje = `¿Estás seguro que deseas cancelar la cita de <strong>${citaActualEnDetalle.pacienteNombre}</strong> (${citaActualEnDetalle.servicioNombre}) a las ${citaActualEnDetalle.horaInicio}?`;
    document.getElementById('confirmarCancelacionMensaje').innerHTML = mensaje;
    toggleModal('modalConfirmarCancelacionCita', true);
}

function cerrarModalConfirmarCancelacion() {
    toggleModal('modalConfirmarCancelacionCita', false);
}

function confirmarCancelacionCita() {
    if (!citaActualEnDetalle) {
        alert('Error: No se pudo identificar la cita a cancelar.');
        return;
    }
    
    cancelarCita(citaActualEnDetalle.citaId);
}

function cancelarCita(citaId) {
    const csrfToken = getCookie('csrftoken');
    
    fetch(`/agenda/citas/eliminar/${citaId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Error al cancelar la cita');
    })
    .then(data => {
        // Cerrar modales
        cerrarModalConfirmarCancelacion();
        cerrarModalDetalleCita();
        
        // Mostrar mensaje de éxito
        alert('Cita cancelada exitosamente');
        
        // Recargar la agenda
        cargarTodasLasAgendas();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al cancelar la cita. Por favor, intenta nuevamente.');
    });
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

function navegarVets(direccion) {
    const nuevoOffset = paginacionVets.offset + direccion;
    const maxOffset = Math.max(0, paginacionVets.todosLosVets.length - paginacionVets.limite);
    
    if (nuevoOffset < 0 || nuevoOffset > maxOffset) return;
    
    paginacionVets.offset = nuevoOffset;
    cargarTodasLasAgendas();
}

function actualizarControlesNavegacion() {
    const btnIzq = document.getElementById('btnNavIzq');
    const btnDer = document.getElementById('btnNavDer');
    
    if (!btnIzq || !btnDer) return;
    
    const totalVets = paginacionVets.todosLosVets.length;
    
    // Mostrar botones solo si hay más de 2 vets
    if (totalVets <= paginacionVets.limite) {
        btnIzq.style.display = 'none';
        btnIzq.style.setProperty('display', 'none', 'important');
        btnDer.style.display = 'none';
        btnDer.style.setProperty('display', 'none', 'important');
        return;
    }
    
    btnIzq.style.display = 'inline-block';
    btnDer.style.display = 'inline-block';
    
    // Deshabilitar botón izquierdo si estamos en el inicio
    btnIzq.disabled = paginacionVets.offset === 0;
    
    // Deshabilitar botón derecho si estamos en el final
    const maxOffset = Math.max(0, totalVets - paginacionVets.limite);
    btnDer.disabled = paginacionVets.offset >= maxOffset;
}
