/* =============================
   HORARIO SEMANAL - GESTIÓN
============================= */

const DIAS_SEMANA = [
    { id: 0, nombre: 'Lunes' },
    { id: 1, nombre: 'Martes' },
    { id: 2, nombre: 'Miércoles' },
    { id: 3, nombre: 'Jueves' },
    { id: 4, nombre: 'Viernes' },
    { id: 5, nombre: 'Sábado' }
];

let horarioState = {
    veterinarioId: null,
    horarios: {}, // { 0: [{start: '08:00', end: '12:00'}, ...], 1: [...], ... }
    clipboard: null // Guardará los rangos copiados para pegar
};

function crearSelectHora(valorInicial, esInicio = true) {
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm';
    select.style.cssText = 'flex: 1;';
    
    // Agregar opción placeholder
    if (!valorInicial) {
        const placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.textContent = esInicio ? '-- Hora inicio --' : '-- Hora término --';
        placeholderOpt.disabled = true;
        placeholderOpt.selected = true;
        select.appendChild(placeholderOpt);
    }
    
    const inicioMin = 6 * 60; // 06:00
    const finMin = 22 * 60; // 22:00
    for (let m = inicioMin; m <= finMin; m += 15) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        const opt = document.createElement('option');
        opt.value = `${hh}:${mm}`;
        opt.textContent = `${hh}:${mm}`;
        select.appendChild(opt);
    }
    if (valorInicial) select.value = valorInicial;
    return select;
}

document.addEventListener('DOMContentLoaded', function() {
    inicializarHorarioSemanal();
    document.getElementById('dispVeterinario').addEventListener('change', cargarHorarioSemanal);
});

function inicializarHorarioSemanal() {
    const container = document.getElementById('diasSemana');
    container.innerHTML = '';
    
    DIAS_SEMANA.forEach(dia => {
        const diaDiv = crearDiaWidget(dia);
        container.appendChild(diaDiv);
    });
}

function crearDiaWidget(dia) {
    const diaDiv = document.createElement('div');
    diaDiv.className = 'dia-semana-widget';
    diaDiv.dataset.dia = dia.id;
    diaDiv.style.cssText = 'padding: 1rem; background: var(--bg-light); border-radius: 8px; border-left: 4px solid var(--primary-color);';
    
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;';
    
    const titulo = document.createElement('h5');
    titulo.style.cssText = 'margin: 0; font-weight: 600;';
    titulo.textContent = dia.nombre;
    
    // Contenedor para botones
    const botonesDiv = document.createElement('div');
    botonesDiv.style.cssText = 'display: flex; gap: 0.5rem;';
    
    const btnCopiar = document.createElement('button');
    btnCopiar.type = 'button';
    btnCopiar.className = 'btn btn-secondary btn-sm';
    btnCopiar.style.cssText = 'padding: 6px 10px !important; font-size: 0.8rem !important;';
    btnCopiar.innerHTML = '<i class="fas fa-copy"></i> Copiar';
    btnCopiar.onclick = function(e) { 
        e.preventDefault();
        copiarRangosAlPortapapeles(dia.id);
    };
    
    const btnPegar = document.createElement('button');
    btnPegar.type = 'button';
    btnPegar.className = 'btn btn-secondary btn-sm btn-pegar';
    btnPegar.style.cssText = 'padding: 6px 10px !important; font-size: 0.8rem !important; display: none;';
    btnPegar.innerHTML = '<i class="fas fa-paste"></i> Pegar';
    btnPegar.dataset.dia = dia.id;
    btnPegar.onclick = function(e) { 
        e.preventDefault();
        pegarRangosDesdePortapapeles(dia.id);
    };
    
    botonesDiv.appendChild(btnCopiar);
    botonesDiv.appendChild(btnPegar);
    
    header.appendChild(titulo);
    header.appendChild(botonesDiv);
    diaDiv.appendChild(header);
    
    // Contenedor de rangos
    const rangosDiv = document.createElement('div');
    rangosDiv.className = 'rangos-dia';
    rangosDiv.dataset.dia = dia.id;
    rangosDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.8rem;';
    
    // Panel copiar inline (oculto por defecto)
    const panelCopiar = document.createElement('div');
    panelCopiar.className = 'panel-copiar';
    panelCopiar.style.cssText = 'display: none; width: 100%; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0.75rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 0.75rem;';

    const tituloCopiar = document.createElement('h6');
    tituloCopiar.textContent = `Copiar rangos de ${dia.nombre} a:`;
    tituloCopiar.style.cssText = 'margin: 0 0 0.5rem 0; font-weight: 600;';
    panelCopiar.appendChild(tituloCopiar);

    const checkboxesDiv = document.createElement('div');
    checkboxesDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;';

    DIAS_SEMANA.forEach(d => {
        if (d.id === dia.id) return;
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer;';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'destino-checkbox';
        checkbox.dataset.dia = d.id;
        const labelText = document.createElement('span');
        labelText.textContent = d.nombre;
        label.appendChild(checkbox);
        label.appendChild(labelText);
        checkboxesDiv.appendChild(label);
    });

    panelCopiar.appendChild(checkboxesDiv);

    const acciones = document.createElement('div');
    acciones.style.cssText = 'display: flex; gap: 0.5rem; justify-content: flex-end;';
    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'btn btn-secondary btn-sm';
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.onclick = function() { panelCopiar.style.display = 'none'; };

    const btnAplicar = document.createElement('button');
    btnAplicar.type = 'button';
    btnAplicar.className = 'btn btn-primary btn-sm';
    btnAplicar.innerHTML = '<i class="fas fa-copy"></i> Copiar';
    btnAplicar.onclick = function() { copiarRangos(dia.id, panelCopiar); panelCopiar.style.display = 'none'; };

    acciones.appendChild(btnCancelar);
    acciones.appendChild(btnAplicar);
    panelCopiar.appendChild(acciones);

    // Estructura en columna: encabezado (ya creado) -> panel copiar -> rangos
    const contenidoCol = document.createElement('div');
    contenidoCol.style.cssText = 'display: flex; flex-direction: column;';
    contenidoCol.appendChild(panelCopiar);
    contenidoCol.appendChild(rangosDiv);

    diaDiv.appendChild(contenidoCol);
    
    // Botón para agregar rango
    const btnAgregar = document.createElement('button');
    btnAgregar.type = 'button';
    btnAgregar.className = 'btn btn-secondary btn-sm';
    btnAgregar.style.cssText = 'align-self: flex-start; margin-top: 0.5rem;';
    btnAgregar.innerHTML = '<i class="fas fa-plus"></i> Agregar rango';
    btnAgregar.onclick = function() { agregarRangoDia(dia.id); };
    
    diaDiv.appendChild(btnAgregar);
    
    return diaDiv;
}

function copiarRangosAlPortapapeles(diaOrigen) {
    const rangosDiv = document.querySelector(`.rangos-dia[data-dia="${diaOrigen}"]`);
    const rangos = rangosDiv.querySelectorAll('.rango-horario');
    
    if (rangos.length === 0) {
        alert('El día no tiene rangos para copiar');
        return;
    }
    
    // Guardar rangos en el portapapeles
    horarioState.clipboard = [];
    rangos.forEach(rangoEl => {
        const inicio = rangoEl.querySelector('.rango-inicio').value;
        const fin = rangoEl.querySelector('.rango-fin').value;
        if (inicio && fin) {
            horarioState.clipboard.push({ start: inicio, end: fin });
        }
    });
    
    // Mostrar botones de pegar en todos los días
    document.querySelectorAll('.btn-pegar').forEach(btn => {
        btn.style.display = 'inline-block';
    });
    
    const diaInfo = DIAS_SEMANA.find(d => d.id === diaOrigen);
    mostrarMensaje(`Rangos de ${diaInfo.nombre} copiados. Haz clic en "Pegar" en el día donde quieras pegarlos.`, 'info');
}

function pegarRangosDesdePortapapeles(diaDestino) {
    if (!horarioState.clipboard || horarioState.clipboard.length === 0) {
        alert('No hay rangos copiados');
        return;
    }
    
    const rangosDest = document.querySelector(`.rangos-dia[data-dia="${diaDestino}"]`);
    
    // Preguntar si desea reemplazar o agregar
    const confirmacion = confirm('¿Desea reemplazar los rangos existentes?\n\nOK = Reemplazar todo\nCancelar = Agregar a los existentes');
    
    if (confirmacion) {
        // Limpiar rangos existentes
        rangosDest.querySelectorAll('.rango-horario').forEach(el => el.remove());
    }
    
    // Pegar rangos
    horarioState.clipboard.forEach(rango => {
        const rangoDiv = document.createElement('div');
        rangoDiv.className = 'rango-horario';
        rangoDiv.style.cssText = 'display: flex; gap: 0.75rem; align-items: center;';
        
        const inputInicio = crearSelectHora(rango.start, true);
        inputInicio.classList.add('rango-inicio');
        
        const inputFin = crearSelectHora(rango.end, false);
        inputFin.classList.add('rango-fin');
        
        const btnEliminar = document.createElement('button');
        btnEliminar.type = 'button';
        btnEliminar.className = 'btn btn-danger btn-sm';
        btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
        btnEliminar.onclick = function() { rangoDiv.remove(); };
        
        rangoDiv.appendChild(inputInicio);
        rangoDiv.appendChild(inputFin);
        rangoDiv.appendChild(btnEliminar);
        
        rangosDest.appendChild(rangoDiv);
    });
    
    const diaInfo = DIAS_SEMANA.find(d => d.id === diaDestino);
    mostrarMensaje(`Rangos pegados en ${diaInfo.nombre}`, 'success');
}

function aplicarHorariosATodo() {
    // Copia los rangos configurados en Lunes (0) al resto de días
    const origen = 0;
    const rangosDivOrigen = document.querySelector(`.rangos-dia[data-dia="${origen}"]`);
    if (!rangosDivOrigen) return;
    const rangosOrigen = rangosDivOrigen.querySelectorAll('.rango-horario');
    if (rangosOrigen.length === 0) {
        alert('Configure rangos en Lunes para aplicar a todos');
        return;
    }
    DIAS_SEMANA.forEach(d => {
        if (d.id === origen) return;
        const rangosDest = document.querySelector(`.rangos-dia[data-dia="${d.id}"]`);
        if (!rangosDest) return;
        rangosDest.querySelectorAll('.rango-horario').forEach(el => el.remove());
        rangosOrigen.forEach(rangoEl => {
            const inicio = rangoEl.querySelector('.rango-inicio').value;
            const fin = rangoEl.querySelector('.rango-fin').value;
            const rangoDiv = document.createElement('div');
            rangoDiv.className = 'rango-horario';
            rangoDiv.style.cssText = 'display: flex; gap: 0.75rem; align-items: center;';
            const inputInicio = crearSelectHora(inicio, true);
            inputInicio.classList.add('rango-inicio');
            const inputFin = crearSelectHora(fin, false);
            inputFin.classList.add('rango-fin');
            const btnEliminar = document.createElement('button');
            btnEliminar.type = 'button';
            btnEliminar.className = 'btn btn-danger btn-sm';
            btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
            btnEliminar.onclick = function() { rangoDiv.remove(); };
            rangoDiv.appendChild(inputInicio);
            rangoDiv.appendChild(inputFin);
            rangoDiv.appendChild(btnEliminar);
            // Agregar al final en lugar de al principio
            rangosDest.appendChild(rangoDiv);
        });
    });
    alert('Horarios de Lunes aplicados a todos los días');
}

function agregarRangoDia(diaId) {
    const rangosDiv = document.querySelector(`.rangos-dia[data-dia="${diaId}"]`);
    const rangoDiv = document.createElement('div');
    rangoDiv.className = 'rango-horario';
    rangoDiv.style.cssText = 'display: flex; gap: 0.75rem; align-items: center;';
    
    // Crear selects sin valor inicial para mostrar placeholders
    const inputInicio = crearSelectHora(null, true);
    inputInicio.classList.add('rango-inicio');
    
    const inputFin = crearSelectHora(null, false);
    inputFin.classList.add('rango-fin');
    
    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.className = 'btn btn-danger btn-sm';
    btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
    btnEliminar.onclick = function() { rangoDiv.remove(); };
    
    rangoDiv.appendChild(inputInicio);
    rangoDiv.appendChild(inputFin);
    rangoDiv.appendChild(btnEliminar);
    
    // Agregar al final (appendChild en lugar de insertBefore)
    rangosDiv.appendChild(rangoDiv);
}

function cargarHorarioSemanal() {
    const veterinarioId = document.getElementById('dispVeterinario').value;
    if (!veterinarioId) return;
    
    horarioState.veterinarioId = veterinarioId;
    
    fetch(`/agenda/horario-semanal/${veterinarioId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Cargar horarios existentes
                data.horarios.forEach(h => {
                    const rangosDiv = document.querySelector(`.rangos-dia[data-dia="${h.dia_semana}"]`);
                    
                    if (!rangosDiv) return;
                    
                    // Limpiar rangos previos
                    rangosDiv.querySelectorAll('.rango-horario').forEach(el => el.remove());
                    
                    // Agregar los rangos desde BD
                    h.rangos.forEach(rango => {
                        const rangoDiv = document.createElement('div');
                        rangoDiv.className = 'rango-horario';
                        rangoDiv.style.cssText = 'display: flex; gap: 0.75rem; align-items: center;';
                        
                        const inputInicio = crearSelectHora(rango.start, true);
                        inputInicio.classList.add('rango-inicio');
                        
                        const inputFin = crearSelectHora(rango.end, false);
                        inputFin.classList.add('rango-fin');
                        
                        const btnEliminar = document.createElement('button');
                        btnEliminar.type = 'button';
                        btnEliminar.className = 'btn btn-danger btn-sm';
                        btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
                        btnEliminar.onclick = function() { rangoDiv.remove(); };
                        
                        rangoDiv.appendChild(inputInicio);
                        rangoDiv.appendChild(inputFin);
                        rangoDiv.appendChild(btnEliminar);
                        
                        // Agregar al final
                        rangosDiv.appendChild(rangoDiv);
                    });
                });
            }
        })
        .catch(error => console.error('Error cargando horario:', error));
}

function guardarHorarioSemanal() {
    const veterinarioId = document.getElementById('dispVeterinario').value;
    if (!veterinarioId) {
        mostrarMensaje('Seleccione un veterinario', 'warning');
        return;
    }
    
    const horarios = [];
    
    // Recopilar datos de todos los días
    DIAS_SEMANA.forEach(dia => {
        const rangosDiv = document.querySelector(`.rangos-dia[data-dia="${dia.id}"]`);
        const rangos = [];
        
        rangosDiv.querySelectorAll('.rango-horario').forEach(rangoEl => {
            const inicio = rangoEl.querySelector('.rango-inicio').value;
            const fin = rangoEl.querySelector('.rango-fin').value;
            
            if (!inicio || !fin) {
                mostrarMensaje(`Rellene los horarios para ${dia.nombre}`, 'warning');
                return;
            }
            
            if (inicio >= fin) {
                mostrarMensaje(`Horario inválido para ${dia.nombre}: inicio debe ser antes que fin`, 'danger');
                return;
            }
            
            rangos.push({ start: inicio, end: fin });
        });
        
        // Solo agregar el día si tiene rangos
        if (rangos.length > 0) {
            horarios.push({
                dia_semana: dia.id,
                rangos: rangos
            });
        }
    });
    
    if (horarios.length === 0) {
        mostrarMensaje('Configure al menos un día con horarios', 'warning');
        return;
    }
    
    fetch('/agenda/horario-semanal/guardar/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            veterinario_id: parseInt(veterinarioId),
            horarios: horarios
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarMensaje('Horario guardado correctamente', 'success');
            cerrarModalDisponibilidad();
        } else {
            mostrarMensaje(data.error || 'Error al guardar horario', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarMensaje('Error de conexión', 'danger');
    });
}

function mostrarMensaje(texto, tipo) {
    alert(texto); // Implementar con un sistema de notificaciones mejor
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
