/* ============================================================
   GESTOR DE INVENTARIO EN CONSULTA
   Carga y filtra medicamentos según el paciente
============================================================ */

let medicamentosDisponibles = [];
let medicamentosSeleccionados = [];

/**
 * Cargar inventario filtrado según el paciente
 */
async function cargarInventarioFiltrado() {
    try {
        if (!window.pacienteData) {
            console.error('❌ No hay datos del paciente disponibles');
            return;
        }

        // Construir URL con filtros
        const params = new URLSearchParams();
        
        if (window.pacienteData.especie) {
            params.append('especie', window.pacienteData.especie);
        }
        
        // Obtener peso actual del input o usar el último peso registrado
        const pesoInput = document.getElementById('pesoConsulta');
        const peso = pesoInput && pesoInput.value 
            ? parseFloat(pesoInput.value) 
            : window.pacienteData.peso;
        
        if (peso) {
            params.append('peso', peso);
        }

        console.log('🔍 Cargando inventario con filtros:', {
            especie: window.pacienteData.especie,
            peso: peso
        });

        const response = await fetch(`/inventario/api/productos/?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            medicamentosDisponibles = data.productos;
            console.log(`✅ ${data.total} medicamentos disponibles para ${window.pacienteData.especie} de ${peso} kg`);
            mostrarInventario(medicamentosDisponibles, peso);
        } else {
            console.error('❌ Error al cargar inventario:', data.error);
        }

    } catch (error) {
        console.error('❌ Error al cargar inventario:', error);
    }
}

/**
 * Mostrar inventario en la lista
 */
function mostrarInventario(productos, peso) {
    const lista = document.getElementById('inventarioList');
    if (!lista) return;

    if (productos.length === 0) {
        lista.innerHTML = `
            <div class="inventario-empty">
                <i class="bi bi-inbox"></i>
                <p>No hay medicamentos disponibles para este paciente</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = productos.map(producto => {
        // Calcular dosis personalizada
        const dosisInfo = calcularDosisPersonalizada(producto, peso);
        
        // Verificar si está en el rango de peso
        let alertaRango = '';
        if (peso && producto.tiene_rango_peso) {
            if (producto.peso_min_kg && peso < producto.peso_min_kg) {
                alertaRango = `<div class="alerta-peso"><i class="bi bi-exclamation-triangle"></i> Peso menor al mínimo (${producto.peso_min_kg} kg)</div>`;
            } else if (producto.peso_max_kg && peso > producto.peso_max_kg) {
                alertaRango = `<div class="alerta-peso"><i class="bi bi-exclamation-triangle"></i> Peso mayor al máximo (${producto.peso_max_kg} kg)</div>`;
            }
        }

        return `
            <div class="inventario-item" data-id="${producto.id}">
                <div class="inventario-item-header">
                    <div class="producto-nombre">
                        <strong>${producto.nombre}</strong>
                        ${producto.marca ? `<span class="marca">${producto.marca}</span>` : ''}
                    </div>
                    <span class="stock-badge ${producto.stock < 10 ? 'stock-bajo' : ''}">${producto.stock} en stock</span>
                </div>
                
                <div class="inventario-item-details">
                    <span class="badge-info especie-badge">${producto.especie}</span>
                    ${producto.formato ? `<span class="badge-info formato-badge">${producto.formato}</span>` : ''}
                    ${producto.tiene_rango_peso ? 
                        `<span class="badge-info rango-badge">${producto.peso_min_kg}-${producto.peso_max_kg} kg</span>` 
                        : ''}
                </div>
                
                <div class="inventario-item-dosis">
                    <div class="dosis-estandar">
                        <i class="bi bi-info-circle"></i> Dosis estándar: ${producto.dosis_display}
                    </div>
                    ${dosisInfo.html}
                </div>
                
                ${alertaRango}
                
                <button type="button" class="btn-agregar-medicamento" onclick="agregarMedicamento(${producto.id})" ${alertaRango ? 'data-alerta="true"' : ''}>
                    <i class="bi bi-plus-circle"></i> Agregar
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Calcular dosis personalizada según el peso del paciente
 */
function calcularDosisPersonalizada(producto, pesoPaciente) {
    if (!pesoPaciente || !producto.peso_kg) {
        return { texto: null, html: '' };
    }

    const formato = producto.formato ? producto.formato.toLowerCase() : '';
    let dosisTexto = '';
    let dosisHTML = '';
    
    switch(formato) {
        case 'liquido':
        case 'inyectable':
            if (producto.dosis_ml) {
                const dosis = (producto.dosis_ml / producto.peso_kg) * pesoPaciente;
                const dosisRedondeada = Math.round(dosis * 100) / 100;
                dosisTexto = `${dosisRedondeada} ml`;
                dosisHTML = `
                    <div class="dosis-personalizada">
                        <i class="bi bi-calculator"></i> 
                        <strong>Para ${pesoPaciente} kg:</strong> 
                        <span class="dosis-valor">${dosisRedondeada} ml</span>
                    </div>
                `;
            }
            break;
            
        case 'pastilla':
            if (producto.cantidad_pastillas) {
                const pastillas = (producto.cantidad_pastillas / producto.peso_kg) * pesoPaciente;
                let dosisTexto = '';
                
                if (pastillas < 1) {
                    const fraccion = obtenerFraccion(pastillas);
                    dosisTexto = fraccion;
                } else if (pastillas % 1 !== 0) {
                    const entero = Math.floor(pastillas);
                    const decimal = pastillas - entero;
                    const fraccion = obtenerFraccion(decimal);
                    dosisTexto = fraccion !== '1' ? `${entero} ${fraccion}` : entero.toString();
                } else {
                    dosisTexto = pastillas.toString();
                }
                
                const texto = pastillas === 1 ? 'pastilla' : 'pastillas';
                dosisHTML = `
                    <div class="dosis-personalizada">
                        <i class="bi bi-capsule"></i> 
                        <strong>Para ${pesoPaciente} kg:</strong> 
                        <span class="dosis-valor">${dosisTexto} ${texto}</span>
                    </div>
                `;
            }
            break;
            
        case 'pipeta':
            if (producto.unidades_pipeta) {
                const texto = producto.unidades_pipeta === 1 ? 'unidad' : 'unidades';
                dosisTexto = `${producto.unidades_pipeta} ${texto}`;
                dosisHTML = `
                    <div class="dosis-personalizada">
                        <i class="bi bi-droplet"></i> 
                        <strong>Para ${pesoPaciente} kg:</strong> 
                        <span class="dosis-valor">${producto.unidades_pipeta} ${texto}</span>
                    </div>
                `;
            }
            break;
            
        case 'polvo':
        case 'crema':
            if (producto.dosis_ml) {
                const dosis = (producto.dosis_ml / producto.peso_kg) * pesoPaciente;
                const dosisRedondeada = Math.round(dosis * 100) / 100;
                dosisTexto = `${dosisRedondeada} gr`;
                dosisHTML = `
                    <div class="dosis-personalizada">
                        <i class="bi bi-calculator"></i> 
                        <strong>Para ${pesoPaciente} kg:</strong> 
                        <span class="dosis-valor">${dosisRedondeada} gr</span>
                    </div>
                `;
            }
            break;
    }
    
    return { texto: dosisTexto, html: dosisHTML };
}

/**
 * Convertir decimal a fracción común
 */
function obtenerFraccion(decimal) {
    const fracciones = [
        { valor: 0.25, texto: '1/4' },
        { valor: 0.33, texto: '1/3' },
        { valor: 0.5, texto: '1/2' },
        { valor: 0.66, texto: '2/3' },
        { valor: 0.75, texto: '3/4' }
    ];
    
    let mejorMatch = fracciones[0];
    let menorDiferencia = Math.abs(decimal - fracciones[0].valor);
    
    for (let i = 1; i < fracciones.length; i++) {
        const diferencia = Math.abs(decimal - fracciones[i].valor);
        if (diferencia < menorDiferencia) {
            menorDiferencia = diferencia;
            mejorMatch = fracciones[i];
        }
    }
    
    if (menorDiferencia > 0.1) {
        return Math.round(decimal * 100) / 100;
    }
    
    return mejorMatch.texto;
}

/**
 * Filtrar inventario por búsqueda
 */
function filtrarInventario(termino) {
    const terminoLower = termino.toLowerCase();
    const productosFiltrados = medicamentosDisponibles.filter(p => 
        p.nombre.toLowerCase().includes(terminoLower) ||
        (p.marca && p.marca.toLowerCase().includes(terminoLower))
    );
    
    const pesoInput = document.getElementById('pesoConsulta');
    const peso = pesoInput && pesoInput.value ? parseFloat(pesoInput.value) : window.pacienteData.peso;
    
    mostrarInventario(productosFiltrados, peso);
}

/**
 * Agregar medicamento a la consulta
 */
function agregarMedicamento(productoId) {
    const producto = medicamentosDisponibles.find(p => p.id === productoId);
    if (!producto) return;

    // Verificar si ya está agregado
    if (medicamentosSeleccionados.find(m => m.id === productoId)) {
        mostrarAlertaModal('Este medicamento ya está agregado', 'warning');
        return;
    }

    const pesoInput = document.getElementById('pesoConsulta');
    const peso = pesoInput && pesoInput.value ? parseFloat(pesoInput.value) : window.pacienteData.peso;
    
    const dosisInfo = calcularDosisPersonalizada(producto, peso);

    // Agregar a la lista
    medicamentosSeleccionados.push({
        id: producto.id,
        nombre: producto.nombre,
        marca: producto.marca,
        formato: producto.formato,
        dosis: producto.dosis_display,
        dosisPersonalizada: dosisInfo.texto,
        peso: peso
    });

    actualizarMedicamentosSeleccionados();
    mostrarAlertaModal('Medicamento agregado correctamente', 'success');
}

/**
 * Remover medicamento de la selección
 */
function removerMedicamento(productoId) {
    medicamentosSeleccionados = medicamentosSeleccionados.filter(m => m.id !== productoId);
    actualizarMedicamentosSeleccionados();
    mostrarAlertaModal('Medicamento removido', 'info');
}

/**
 * Actualizar vista de medicamentos seleccionados
 */
function actualizarMedicamentosSeleccionados() {
    const container = document.getElementById('insumosSeleccionados');
    if (!container) return;

    if (medicamentosSeleccionados.length === 0) {
        container.innerHTML = '<p class="text-muted"><i class="bi bi-info-circle"></i> No hay medicamentos seleccionados</p>';
        return;
    }

    container.innerHTML = medicamentosSeleccionados.map(med => `
        <div class="medicamento-tag">
            <div class="medicamento-info">
                <div class="medicamento-nombre">
                    <strong>${med.nombre}</strong>
                    ${med.marca ? `<span class="marca-small">${med.marca}</span>` : ''}
                </div>
                ${med.dosisPersonalizada ? `
                    <div class="dosis-info">
                        <i class="bi bi-calculator"></i> Dosis calculada: <strong>${med.dosisPersonalizada}</strong>
                        ${med.peso ? `<span class="peso-ref">(${med.peso} kg)</span>` : ''}
                    </div>
                ` : `
                    <div class="dosis-info">
                        <i class="bi bi-info-circle"></i> ${med.dosis}
                    </div>
                `}
            </div>
            <button type="button" class="btn-remover" onclick="removerMedicamento(${med.id})" title="Remover">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `).join('');
}

/**
 * ⭐ CORREGIDA: Mostrar alerta dentro del modal
 */
function mostrarAlertaModal(mensaje, tipo = 'info') {
    // Buscar el modal de Nueva Consulta específicamente
    const modal = document.getElementById('nuevaConsultaModal');
    if (!modal || modal.classList.contains('hide')) {
        console.warn('Modal no está visible');
        return;
    }
    
    // Buscar el contenedor de alertas
    let alertContainer = modal.querySelector('#modalAlertContainer');
    
    // Si no existe, crearlo
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'modalAlertContainer';
        alertContainer.className = 'modal-alert-container';
        
        // Insertar al inicio del modal-body
        const modalBody = modal.querySelector('.vet-modal-body');
        if (modalBody) {
            modalBody.insertBefore(alertContainer, modalBody.firstChild);
        } else {
            console.error('No se encontró .vet-modal-body');
            return;
        }
    }
    
    // Iconos según tipo
    const iconos = {
        success: 'bi-check-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        error: 'bi-x-circle-fill',
        info: 'bi-info-circle-fill'
    };
    
    // Crear alerta
    const alerta = document.createElement('div');
    alerta.className = `modal-alert modal-alert-${tipo}`;
    alerta.innerHTML = `
        <i class="bi ${iconos[tipo] || iconos.info}"></i>
        <span>${mensaje}</span>
        <button type="button" class="modal-alert-close" onclick="this.parentElement.remove()">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    // Limpiar alertas anteriores
    alertContainer.innerHTML = '';
    
    // Agregar nueva alerta
    alertContainer.appendChild(alerta);
    
    // Animar entrada
    setTimeout(() => alerta.classList.add('show'), 10);
    
    // Auto-remover después de 4 segundos
    setTimeout(() => {
        if (alerta.parentElement) {
            alerta.classList.remove('show');
            setTimeout(() => {
                if (alerta.parentElement) {
                    alerta.remove();
                }
            }, 300);
        }
    }, 4000);
    
    console.log(`✅ Alerta mostrada: ${tipo} - ${mensaje}`);
}

/**
 * Obtener medicamentos seleccionados para enviar al backend
 */
function obtenerMedicamentosParaGuardar() {
    return medicamentosSeleccionados.map(med => ({
        producto_id: med.id,
        nombre: med.nombre,
        dosis: med.dosisPersonalizada || med.dosis,
        peso_aplicado: med.peso
    }));
}

/**
 * Preparar datos de la consulta antes de enviar
 */
function prepararDatosConsulta(formData) {
    // Agregar medicamentos seleccionados como JSON
    const medicamentos = obtenerMedicamentosParaGuardar();
    formData.append('medicamentos_json', JSON.stringify(medicamentos));
    
    console.log('📦 Medicamentos a guardar:', medicamentos);
    
    return formData;
}

/**
 * Limpiar selección al cerrar/cancelar el modal
 */
function limpiarSeleccionMedicamentos() {
    medicamentosSeleccionados = [];
    actualizarMedicamentosSeleccionados();
}

/**
 * Inicializar cuando se abre el modal de nueva consulta
 */
document.addEventListener('DOMContentLoaded', function() {
    // Evento cuando se abre el modal
    const btnNuevaConsulta = document.getElementById('btnNuevaConsulta');
    if (btnNuevaConsulta) {
        btnNuevaConsulta.addEventListener('click', function() {
            setTimeout(() => {
                cargarInventarioFiltrado();
            }, 100);
        });
    }

    // Buscador de medicamentos
    const searchInput = document.getElementById('searchInventario');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filtrarInventario(e.target.value);
        });
    }

    // Actualizar inventario cuando cambia el peso en la consulta
    const pesoInput = document.getElementById('pesoConsulta');
    if (pesoInput) {
        pesoInput.addEventListener('change', function() {
            console.log('🔄 Peso actualizado, recargando inventario...');
            cargarInventarioFiltrado();
        });
        
        // También actualizar al escribir (con debounce)
        let timeoutId;
        pesoInput.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if (this.value) {
                    console.log('🔄 Peso actualizado, recargando inventario...');
                    cargarInventarioFiltrado();
                }
            }, 500);
        });
    }

    // Interceptar el envío del formulario de nueva consulta
    const formNuevaConsulta = document.querySelector('#nuevaConsultaModal form');
    if (formNuevaConsulta) {
        formNuevaConsulta.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            // Agregar medicamentos seleccionados
            prepararDatosConsulta(formData);
            
            // Enviar con fetch
            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('✅ Consulta guardada correctamente');
                    mostrarAlertaModal('Consulta registrada correctamente', 'success');
                    
                    // Limpiar selección
                    limpiarSeleccionMedicamentos();
                    
                    // Cerrar modal y recargar
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    console.error('❌ Error al guardar:', data.error);
                    mostrarAlertaModal(data.error || 'Error al guardar la consulta', 'error');
                }
            })
            .catch(error => {
                console.error('❌ Error:', error);
                mostrarAlertaModal('Error de conexión al guardar la consulta', 'error');
            });
        });
    }

    // Limpiar al cerrar el modal
    const modalOverlay = document.getElementById('nuevaConsultaModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                limpiarSeleccionMedicamentos();
            }
        });
    }

    // Botón de cancelar
    const btnCancelar = document.querySelector('#nuevaConsultaModal .vet-btn-secondary');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            limpiarSeleccionMedicamentos();
        });
    }
});

// Exportar funciones para uso externo
window.inventarioConsulta = {
    obtenerMedicamentosSeleccionados: obtenerMedicamentosParaGuardar,
    limpiarSeleccion: limpiarSeleccionMedicamentos,
    prepararDatos: prepararDatosConsulta
};