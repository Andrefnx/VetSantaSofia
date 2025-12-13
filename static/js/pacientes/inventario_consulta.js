/* ============================================================
   GESTOR DE INVENTARIO EN CONSULTA
   Carga y filtra medicamentos según el paciente
============================================================ */

let medicamentosDisponibles = [];

// Usar window.medicamentosSeleccionados del window (global) si está disponible
// Si no, crear una local
if (!window.medicamentosSeleccionados) {
    window.medicamentosSeleccionados = [];
}

/**
 * Cargar inventario filtrado según el paciente
 */
async function cargarInventarioFiltrado() {
    try {
        if (!window.pacienteData) {
            console.error('❌ No hay datos del paciente disponibles');
            return;
        }

        const params = new URLSearchParams();
        
        if (window.pacienteData.especie) {
            params.append('especie', window.pacienteData.especie);
        }
        
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
            console.log(`✅ ${data.total} medicamentos disponibles`);
            mostrarInventario(medicamentosDisponibles);
        } else {
            console.error('❌ Error al cargar inventario:', data.error);
        }

    } catch (error) {
        console.error('❌ Error al cargar inventario:', error);
    }
}

/**
 * ⭐ Inicializar peso al abrir el modal
 */
function inicializarPesoConsulta() {
    const pesoInput = document.getElementById('pesoConsulta');
    if (!pesoInput) return;
    
    // Si ya tiene valor, no hacer nada
    if (pesoInput.value) return;
    
    // Buscar el último peso registrado del historial
    const ultimoPeso = obtenerUltimoPesoRegistrado();
    
    if (ultimoPeso && ultimoPeso > 0) {
        pesoInput.value = ultimoPeso;
        console.log(`✅ Peso prellenado desde historial: ${ultimoPeso} kg`);
    } else if (window.pacienteData && window.pacienteData.peso) {
        pesoInput.value = window.pacienteData.peso;
        console.log(`✅ Peso prellenado desde paciente: ${window.pacienteData.peso} kg`);
    }
}

/**
 * ⭐ Obtener el último peso registrado del historial médico
 */
function obtenerUltimoPesoRegistrado() {
    // Buscar en el DOM el último peso del historial
    const consultasItems = document.querySelectorAll('.consulta-item');
    
    for (let item of consultasItems) {
        const pesoElement = item.querySelector('[data-field="peso"]');
        if (pesoElement && pesoElement.textContent) {
            const peso = parseFloat(pesoElement.textContent.replace(' kg', '').trim());
            if (!isNaN(peso) && peso > 0) {
                return peso;
            }
        }
    }
    
    return null;
}

/**
 * Mostrar inventario en la lista
 */
function mostrarInventario(productos) {
    // ✅ CRITICAL: Update medicamentosDisponibles when showing inventory
    medicamentosDisponibles = productos;
    console.log(`✅ medicamentosDisponibles actualizado con ${productos.length} productos`);
    
    const lista = document.getElementById('inventarioList');
    if (!lista) return;

    if (productos.length === 0) {
        lista.innerHTML = `
            <div class="inventario-empty">
                <i class="bi bi-inbox"></i>
                <p>No hay medicamentos disponibles</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = productos.map(producto => {
        const estaAgregado = window.medicamentosSeleccionados.find(m => m.id === producto.id);
        
        return `
            <div class="inventario-item ${estaAgregado ? 'agregado' : ''}" data-id="${producto.id}">
                <div class="inventario-item-info">
                    <div class="producto-nombre-compact">${producto.nombre}</div>
                    <div class="producto-detalles">
                        <span class="badge-compact badge-especie">
                            <i class="bi bi-tag"></i> ${producto.especie}
                        </span>
                        <span class="badge-compact badge-stock ${producto.stock < 10 ? 'bajo' : ''}">
                            <i class="bi bi-box"></i> ${producto.stock}
                        </span>
                    </div>
                </div>
                <button type="button" class="btn-agregar-compact" onclick="agregarMedicamento(${producto.id})" title="Agregar">
                    <i class="bi bi-plus-lg"></i>
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Calcular dosis personalizada según el peso del paciente
 */
function calcularDosisPersonalizada(producto, pesoPaciente) {
    console.log('🧮 Calculando dosis para:', {
        nombre: producto.nombre,
        formato: producto.formato,
        peso_paciente: pesoPaciente,
        peso_ref: producto.peso_kg,
        dosis_ml: producto.dosis_ml,
        cantidad_pastillas: producto.cantidad_pastillas
    });

    if (!pesoPaciente || pesoPaciente <= 0) {
        console.warn('⚠️ Peso del paciente no válido');
        return null;
    }

    if (!producto.peso_kg || producto.peso_kg <= 0) {
        console.warn('⚠️ Producto sin peso de referencia');
        return null;
    }

    const formato = producto.formato ? producto.formato.toLowerCase() : '';
    let dosisTexto = '';
    
    switch(formato) {
        case 'liquido':
        case 'inyectable':
            if (producto.dosis_ml && producto.dosis_ml > 0) {
                const dosis = (producto.dosis_ml / producto.peso_kg) * pesoPaciente;
                const dosisRedondeada = Math.round(dosis * 100) / 100;
                dosisTexto = `${dosisRedondeada} ml`;
                console.log('💧 Dosis líquido calculada:', dosisTexto);
            }
            break;
            
        case 'pastilla':
        case 'comprimido':
        case 'tableta':
            if (producto.cantidad_pastillas && producto.cantidad_pastillas > 0) {
                const pastillas = (producto.cantidad_pastillas / producto.peso_kg) * pesoPaciente;
                
                if (pastillas < 1) {
                    const fraccion = obtenerFraccion(pastillas);
                    dosisTexto = `${fraccion} past`;
                } else if (pastillas % 1 !== 0) {
                    const entero = Math.floor(pastillas);
                    const decimal = pastillas - entero;
                    const fraccion = obtenerFraccion(decimal);
                    dosisTexto = fraccion !== '1' ? `${entero} ${fraccion} past` : `${Math.round(pastillas)} past`;
                } else {
                    dosisTexto = `${Math.round(pastillas)} past`;
                }
                console.log('💊 Dosis pastilla calculada:', dosisTexto);
            }
            break;
            
        case 'pipeta':
            if (producto.unidades_pipeta) {
                dosisTexto = `${producto.unidades_pipeta} pipeta`;
                console.log('💉 Dosis pipeta:', dosisTexto);
            }
            break;
            
        case 'polvo':
        case 'crema':
        case 'gel':
            if (producto.dosis_ml && producto.dosis_ml > 0) {
                const dosis = (producto.dosis_ml / producto.peso_kg) * pesoPaciente;
                const dosisRedondeada = Math.round(dosis * 100) / 100;
                dosisTexto = `${dosisRedondeada} gr`;
                console.log('🧪 Dosis polvo/crema calculada:', dosisTexto);
            }
            break;
            
        default:
            console.warn('⚠️ Formato no reconocido:', formato);
    }
    
    if (!dosisTexto) {
        console.warn('⚠️ No se pudo calcular dosis');
    }
    
    return dosisTexto || null;
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
        return (Math.round(decimal * 100) / 100).toString();
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
    
    mostrarInventario(productosFiltrados);
}

/**
 * Agregar medicamento a la consulta
 */
function agregarMedicamento(productoId) {
    const producto = medicamentosDisponibles.find(p => p.id === productoId);
    if (!producto) {
        console.error('❌ Producto no encontrado:', productoId);
        return;
    }

    if (window.medicamentosSeleccionados.find(m => m.id === productoId)) {
        mostrarAlertaModal('Este medicamento ya está agregado', 'warning');
        return;
    }

    const pesoInput = document.getElementById('pesoConsulta');
    const peso = pesoInput && pesoInput.value ? parseFloat(pesoInput.value) : window.pacienteData.peso;
    
    if (!peso || peso <= 0) {
        mostrarAlertaModal('Por favor ingrese el peso del paciente', 'warning');
        return;
    }

    const dosisCalculada = calcularDosisPersonalizada(producto, peso);
    
    console.log('➕ Agregando medicamento:', {
        id: producto.id,
        nombre: producto.nombre,
        peso: peso,
        dosis: dosisCalculada,
        formato: producto.formato
    });

    window.medicamentosSeleccionados.push({
        id: producto.id,
        nombre: producto.nombre,
        peso: peso,
        dosis: dosisCalculada
    });

    actualizarMedicamentosSeleccionados();
    
    const item = document.querySelector(`.inventario-item[data-id="${productoId}"]`);
    if (item) {
        item.classList.add('agregado');
    }
    
    mostrarAlertaModal('Medicamento agregado', 'success');
}

/**
 * Remover medicamento de la selección
 */
function removerMedicamento(productoId) {
    window.medicamentosSeleccionados = window.medicamentosSeleccionados.filter(m => m.id !== productoId);
    actualizarMedicamentosSeleccionados();
    
    const item = document.querySelector(`.inventario-item[data-id="${productoId}"]`);
    if (item) {
        item.classList.remove('agregado');
    }
    
    mostrarAlertaModal('Medicamento removido', 'info');
}

/**
 * ⭐ Actualizar vista de medicamentos seleccionados - CON DOSIS CALCULADA
 */
function actualizarMedicamentosSeleccionados() {
    const container = document.getElementById('insumosSeleccionados');
    if (!container) {
        console.error('❌ Contenedor insumosSeleccionados no encontrado');
        return;
    }

    if (window.medicamentosSeleccionados.length === 0) {
        container.innerHTML = '<p class="text-muted" style="font-size: 0.8rem; margin: 0;"><i class="bi bi-info-circle"></i> No hay medicamentos seleccionados</p>';
        return;
    }

    container.innerHTML = window.medicamentosSeleccionados.map(med => {
        console.log('📦 Renderizando medicamento:', med);
        
        return `
            <div class="medicamento-tag">
                <div class="medicamento-info">
                    <div class="medicamento-nombre">${med.nombre}</div>
                    ${med.dosis ? `
                        <div class="medicamento-dosis">
                            <i class="bi bi-prescription2"></i> 
                            <span>${med.dosis} por ${med.peso} kg</span>
                        </div>
                    ` : `
                        <div class="medicamento-dosis" style="opacity: 0.7;">
                            <i class="bi bi-exclamation-circle"></i> 
                            <span>Dosis no calculada</span>
                        </div>
                    `}
                </div>
                <button type="button" class="btn-remover vet-btn-grey error" onclick="removerMedicamento(${med.id})" title="Remover">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Mostrar alerta dentro del modal
 */
function mostrarAlertaModal(mensaje, tipo = 'info') {
    const modal = document.getElementById('nuevaConsultaModal');
    if (!modal || modal.classList.contains('hide')) {
        console.warn('Modal no está visible');
        return;
    }
    
    let alertContainer = modal.querySelector('#modalAlertContainer');
    
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'modalAlertContainer';
        alertContainer.className = 'modal-alert-container';
        
        const modalBody = modal.querySelector('.vet-modal-body');
        if (modalBody) {
            modalBody.insertBefore(alertContainer, modalBody.firstChild);
        } else {
            return;
        }
    }
    
    const iconos = {
        success: 'bi-check-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        error: 'bi-x-circle-fill',
        info: 'bi-info-circle-fill'
    };
    
    const alerta = document.createElement('div');
    alerta.className = `modal-alert modal-alert-${tipo}`;
    alerta.innerHTML = `
        <i class="bi ${iconos[tipo] || iconos.info}"></i>
        <span>${mensaje}</span>
        <button type="button" class="modal-alert-close" onclick="this.parentElement.remove()">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alerta);
    
    setTimeout(() => alerta.classList.add('show'), 10);
    
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
}

/**
 * Inicializar eventos
 */
document.addEventListener('DOMContentLoaded', function() {
    const btnNuevaConsulta = document.getElementById('btnNuevaConsulta');
    if (btnNuevaConsulta) {
        btnNuevaConsulta.addEventListener('click', function() {
            setTimeout(() => {
                // ⭐ Primero inicializar el peso
                inicializarPesoConsulta();
                // Luego cargar el inventario con el peso correcto
                setTimeout(() => {
                    cargarInventarioFiltrado();
                }, 150);
            }, 100);
        });
    }

    const searchInput = document.getElementById('searchInventario');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filtrarInventario(e.target.value);
        });
    }

    const pesoInput = document.getElementById('pesoConsulta');
    if (pesoInput) {
        let timeoutId;
        
        // ⭐ Usar 'input' en lugar de 'change' para detectar cambios inmediatos
        pesoInput.addEventListener('input', function() {
            clearTimeout(timeoutId);
            
            const nuevoPeso = parseFloat(this.value);
            
            if (!nuevoPeso || nuevoPeso <= 0) return;
            
            console.log('🔄 Peso actualizado a:', nuevoPeso);
            
            // ⭐ Debounce para no hacer muchas peticiones
            timeoutId = setTimeout(() => {
                // Recalcular dosis de medicamentos ya seleccionados
                window.medicamentosSeleccionados = window.medicamentosSeleccionados.map(med => {
                    const producto = medicamentosDisponibles.find(p => p.id === med.id);
                    if (producto) {
                        const nuevaDosis = calcularDosisPersonalizada(producto, nuevoPeso);
                        return {
                            ...med,
                            peso: nuevoPeso,
                            dosis: nuevaDosis
                        };
                    }
                    return med;
                });
                
                actualizarMedicamentosSeleccionados();
                cargarInventarioFiltrado();
            }, 500); // Esperar 500ms después de que el usuario deje de escribir
        });
    }
});
