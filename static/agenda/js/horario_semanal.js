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
    horarios: {} // { 0: [{start: '08:00', end: '12:00'}, ...], 1: [...], ... }
};

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
    
    const btnCopiar = document.createElement('button');
    btnCopiar.type = 'button';
    btnCopiar.className = 'btn btn-primary btn-sm';
    btnCopiar.style.cssText = 'padding: 6px 10px !important; font-size: 0.8rem !important;';
    btnCopiar.innerHTML = '<i class="fas fa-copy"></i> Copiar';
    btnCopiar.onclick = function(e) { 
        e.preventDefault();
        abrirSelectorCopiar(dia.id); 
    };
    
    header.appendChild(titulo);
    header.appendChild(btnCopiar);
    diaDiv.appendChild(header);
    
    // Contenedor de rangos
    const rangosDiv = document.createElement('div');
    rangosDiv.className = 'rangos-dia';
    rangosDiv.dataset.dia = dia.id;
    rangosDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';
    
    diaDiv.appendChild(rangosDiv);
    
    // Botón para agregar rango
    const btnAgregar = document.createElement('button');
    btnAgregar.type = 'button';
    btnAgregar.className = 'btn btn-primary btn-sm';
    btnAgregar.style.cssText = 'align-self: flex-start; margin-top: 0.5rem;';
    btnAgregar.innerHTML = '<i class="fas fa-plus"></i> Agregar rango';
    btnAgregar.onclick = function() { agregarRangoDia(dia.id); };
    
    diaDiv.appendChild(btnAgregar);
    
    return diaDiv;
}

function abrirSelectorCopiar(diaOrigen) {
    // Verificar que el día origen tenga rangos
    const rangosDiv = document.querySelector(`.rangos-dia[data-dia="${diaOrigen}"]`);
    const rangos = rangosDiv.querySelectorAll('.rango-horario');
    
    if (rangos.length === 0) {
        alert('El día no tiene rangos para copiar');
        return;
    }
    
    // Crear overlay con selector
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const selectorDiv = document.createElement('div');
    selectorDiv.style.cssText = 'background: white; padding: 1.5rem; border-radius: 8px; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
    
    const titulo = document.createElement('h4');
    titulo.textContent = `Copiar rangos de ${DIAS_SEMANA[diaOrigen].nombre} a:`;
    titulo.style.cssText = 'margin: 0 0 1rem 0;';
    selectorDiv.appendChild(titulo);
    
    const checkboxesDiv = document.createElement('div');
    checkboxesDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;';
    
    DIAS_SEMANA.forEach(dia => {
        if (dia.id === diaOrigen) return; // No copiar a sí mismo
        
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer;';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'destino-checkbox';
        checkbox.dataset.dia = dia.id;
        
        const labelText = document.createElement('span');
        labelText.textContent = dia.nombre;
        
        label.appendChild(checkbox);
        label.appendChild(labelText);
        checkboxesDiv.appendChild(label);
    });
    
    selectorDiv.appendChild(checkboxesDiv);
    
    // Botones de acción
    const botonesDiv = document.createElement('div');
    botonesDiv.style.cssText = 'display: flex; gap: 0.75rem; justify-content: flex-end;';
    
    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'btn btn-secondary btn-sm';
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.onclick = function() { overlay.remove(); };
    
    const btnCopiar = document.createElement('button');
    btnCopiar.type = 'button';
    btnCopiar.className = 'btn btn-primary btn-sm';
    btnCopiar.innerHTML = '<i class="fas fa-copy"></i> Copiar';
    btnCopiar.onclick = function() { 
        copiarRangos(diaOrigen, selectorDiv);
        overlay.remove();
    };
    
    botonesDiv.appendChild(btnCancelar);
    botonesDiv.appendChild(btnCopiar);
    selectorDiv.appendChild(botonesDiv);
    
    overlay.appendChild(selectorDiv);
    document.body.appendChild(overlay);
}

function copiarRangos(diaOrigen, selectorDiv) {
    const rangosDiv = document.querySelector(`.rangos-dia[data-dia="${diaOrigen}"]`);
    const rangos = rangosDiv.querySelectorAll('.rango-horario');
    
    if (rangos.length === 0) return;
    
    // Obtener días destino seleccionados
    const checkboxes = selectorDiv.querySelectorAll('.destino-checkbox:checked');
    
    checkboxes.forEach(checkbox => {
        const diaDestino = checkbox.dataset.dia;
        const rangosDest = document.querySelector(`.rangos-dia[data-dia="${diaDestino}"]`);
        
        // Limpiar rangos existentes
        rangosDest.querySelectorAll('.rango-horario').forEach(el => el.remove());
        
        // Copiar rangos
        rangos.forEach(rangoEl => {
            const inicio = rangoEl.querySelector('.rango-inicio').value;
            const fin = rangoEl.querySelector('.rango-fin').value;
            
            const rangoDiv = document.createElement('div');
            rangoDiv.className = 'rango-horario';
            rangoDiv.style.cssText = 'display: flex; gap: 0.75rem; align-items: center;';
            
            const inputInicio = document.createElement('input');
            inputInicio.type = 'time';
            inputInicio.className = 'form-control rango-inicio';
            inputInicio.value = inicio;
            inputInicio.style.cssText = 'flex: 1;';
            
            const inputFin = document.createElement('input');
            inputFin.type = 'time';
            inputFin.className = 'form-control rango-fin';
            inputFin.value = fin;
            inputFin.style.cssText = 'flex: 1;';
            
            const btnEliminar = document.createElement('button');
            btnEliminar.type = 'button';
            btnEliminar.className = 'btn btn-danger btn-sm';
            btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
            btnEliminar.onclick = function() { rangoDiv.remove(); };
            
            rangoDiv.appendChild(inputInicio);
            rangoDiv.appendChild(inputFin);
            rangoDiv.appendChild(btnEliminar);
            
            rangosDest.insertBefore(rangoDiv, rangosDest.lastElementChild);
        });
    });
}

function agregarRangoDia(diaId) {
    const rangosDiv = document.querySelector(`.rangos-dia[data-dia="${diaId}"]`);
    const rangoDiv = document.createElement('div');
    rangoDiv.className = 'rango-horario';
    rangoDiv.style.cssText = 'display: flex; gap: 0.75rem; align-items: center;';
    
    const inputInicio = document.createElement('input');
    inputInicio.type = 'time';
    inputInicio.className = 'form-control rango-inicio';
    inputInicio.style.cssText = 'flex: 1;';
    
    const inputFin = document.createElement('input');
    inputFin.type = 'time';
    inputFin.className = 'form-control rango-fin';
    inputFin.style.cssText = 'flex: 1;';
    
    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.className = 'btn btn-danger btn-sm';
    btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
    btnEliminar.onclick = function() { rangoDiv.remove(); };
    
    rangoDiv.appendChild(inputInicio);
    rangoDiv.appendChild(inputFin);
    rangoDiv.appendChild(btnEliminar);
    
    rangosDiv.insertBefore(rangoDiv, rangosDiv.lastElementChild);
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
                        
                        const inputInicio = document.createElement('input');
                        inputInicio.type = 'time';
                        inputInicio.className = 'form-control rango-inicio';
                        inputInicio.value = rango.start;
                        inputInicio.style.cssText = 'flex: 1;';
                        
                        const inputFin = document.createElement('input');
                        inputFin.type = 'time';
                        inputFin.className = 'form-control rango-fin';
                        inputFin.value = rango.end;
                        inputFin.style.cssText = 'flex: 1;';
                        
                        const btnEliminar = document.createElement('button');
                        btnEliminar.type = 'button';
                        btnEliminar.className = 'btn btn-danger btn-sm';
                        btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
                        btnEliminar.onclick = function() { rangoDiv.remove(); };
                        
                        rangoDiv.appendChild(inputInicio);
                        rangoDiv.appendChild(inputFin);
                        rangoDiv.appendChild(btnEliminar);
                        
                        rangosDiv.insertBefore(rangoDiv, rangosDiv.lastElementChild);
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
