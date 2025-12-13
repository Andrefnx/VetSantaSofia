/* ============================================================
   CALCULADORA Y GESTOR DE DOSIS
   Maneja toda la lógica relacionada con dosis, pesos y formatos
============================================================ */

/**
 * Formatea la visualización de dosis según el formato del producto
 * @param {Object} data - Datos del producto
 * @returns {string} - Dosis formateada
 */
function formatearDosisVista(data) {
    if (!data.formato) return "-";
    
    const formato = data.formato.toLowerCase();
    const rangoTexto = obtenerTextoRangoPeso(data);
    
    switch(formato) {
        case 'liquido':
        case 'inyectable':
            if (data.dosis_ml) {
                return `${data.dosis_ml} ml${rangoTexto}`;
            }
            break;
            
        case 'pastilla':
            if (data.cantidad_pastillas) {
                const pastillaTexto = data.cantidad_pastillas == 1 ? "pastilla" : "pastillas";
                return `${data.cantidad_pastillas} ${pastillaTexto}${rangoTexto}`;
            }
            break;
            
        case 'pipeta':
            if (data.unidades_pipeta) {
                const unidadTexto = data.unidades_pipeta == 1 ? "unidad" : "unidades";
                return `${data.unidades_pipeta} ${unidadTexto}${rangoTexto}`;
            }
            break;
            
        case 'polvo':
        case 'crema':
            if (data.dosis_ml) {
                return `${data.dosis_ml} gr${rangoTexto}`;
            }
            break;
    }
    
    return "-";
}

/**
 * Obtiene el texto del rango de peso
 * @param {Object} data - Datos del producto
 * @returns {string} - Texto del rango
 */
function obtenerTextoRangoPeso(data) {
    if (data.tiene_rango_peso && data.peso_min_kg && data.peso_max_kg) {
        return ` (${data.peso_min_kg}-${data.peso_max_kg} kg)`;
    } else if (data.peso_kg) {
        return ` por ${data.peso_kg} kg`;
    }
    return "";
}

/**
 * Actualiza los campos de dosis según el formato seleccionado
 * @param {string} formato - Formato del producto
 * @param {HTMLElement} modal - Elemento del modal
 */
function actualizarCamposDosis(formato, modal) {
    if (!modal) return;
    
    console.log('🔧 Actualizando campos de dosis para formato:', formato);
    
    // Ocultar todos los campos de dosis
    const camposDosis = modal.querySelectorAll('.campo-dosis');
    camposDosis.forEach(campo => campo.classList.add('d-none'));
    
    // Mostrar campos según formato
    switch(formato) {
        case 'liquido':
        case 'inyectable':
            mostrarCampo(modal, '.campo-dosis-liquido');
            mostrarCampo(modal, '.campo-ml-contenedor');
            mostrarCampo(modal, '.campo-peso-kg');
            console.log('✅ Mostrando campos para líquido/inyectable');
            break;
            
        case 'pastilla':
            mostrarCampo(modal, '.campo-dosis-pastilla');
            mostrarCampo(modal, '.campo-peso-kg');
            console.log('✅ Mostrando campos para pastilla');
            break;
            
        case 'pipeta':
            mostrarCampo(modal, '.campo-dosis-pipeta');
            mostrarCampo(modal, '.campo-peso-kg');
            console.log('✅ Mostrando campos para pipeta');
            break;
            
        case 'polvo':
        case 'crema':
            mostrarCampo(modal, '.campo-dosis-liquido');
            mostrarCampo(modal, '.campo-peso-kg');
            console.log('✅ Mostrando campos para polvo/crema');
            break;
    }
    
    // Siempre mostrar rango de peso
    mostrarCampo(modal, '.campo-rango-peso');
}

/**
 * Muestra un campo específico
 * @param {HTMLElement} modal - Elemento del modal
 * @param {string} selector - Selector del campo
 */
function mostrarCampo(modal, selector) {
    const campo = modal.querySelector(selector);
    if (campo) {
        campo.classList.remove('d-none');
    }
}

/**
 * Calcula la dosis recomendada para un peso específico
 * @param {Object} producto - Datos del producto
 * @param {number} pesoMascota - Peso de la mascota en kg
 * @returns {Object} - Resultado del cálculo
 */
function calcularDosisParaPeso(producto, pesoMascota) {
    if (!producto.formato || !pesoMascota) {
        return { error: "Datos insuficientes" };
    }
    
    const formato = producto.formato.toLowerCase();
    
    // Verificar si está en el rango de peso
    if (producto.tiene_rango_peso) {
        if (producto.peso_min_kg && pesoMascota < producto.peso_min_kg) {
            return { 
                error: `Peso menor al mínimo recomendado (${producto.peso_min_kg} kg)`,
                advertencia: true
            };
        }
        if (producto.peso_max_kg && pesoMascota > producto.peso_max_kg) {
            return { 
                error: `Peso mayor al máximo recomendado (${producto.peso_max_kg} kg)`,
                advertencia: true
            };
        }
    }
    
    let resultado = {};
    
    switch(formato) {
        case 'liquido':
        case 'inyectable':
            if (producto.dosis_ml && producto.peso_kg) {
                const dosis = (producto.dosis_ml / producto.peso_kg) * pesoMascota;
                resultado.dosis = dosis.toFixed(2);
                resultado.unidad = "ml";
                resultado.texto = `${resultado.dosis} ml`;
            }
            break;
            
        case 'pastilla':
            if (producto.cantidad_pastillas && producto.peso_kg) {
                const pastillas = Math.ceil((producto.cantidad_pastillas / producto.peso_kg) * pesoMascota);
                resultado.dosis = pastillas;
                resultado.unidad = pastillas == 1 ? "pastilla" : "pastillas";
                resultado.texto = `${pastillas} ${resultado.unidad}`;
            }
            break;
            
        case 'pipeta':
            if (producto.unidades_pipeta) {
                resultado.dosis = producto.unidades_pipeta;
                resultado.unidad = producto.unidades_pipeta == 1 ? "unidad" : "unidades";
                resultado.texto = `${resultado.dosis} ${resultado.unidad}`;
            }
            break;
    }
    
    return resultado;
}

/**
 * Valida los campos de dosis según el formato
 * @param {string} formato - Formato del producto
 * @param {Object} data - Datos del formulario
 * @returns {Object} - Resultado de la validación
 */
function validarDatosDosis(formato, data) {
    const errores = [];
    
    if (!formato) {
        errores.push("Debe seleccionar un formato");
        return { valido: false, errores };
    }
    
    switch(formato) {
        case 'liquido':
        case 'inyectable':
            if (!data.dosis_ml || data.dosis_ml <= 0) {
                errores.push("La dosis en ml debe ser mayor a 0");
            }
            if (!data.peso_kg || data.peso_kg <= 0) {
                errores.push("El peso de referencia debe ser mayor a 0");
            }
            break;
            
        case 'pastilla':
            if (!data.cantidad_pastillas || data.cantidad_pastillas <= 0) {
                errores.push("La cantidad de pastillas debe ser mayor a 0");
            }
            if (!data.peso_kg || data.peso_kg <= 0) {
                errores.push("El peso de referencia debe ser mayor a 0");
            }
            break;
            
        case 'pipeta':
            if (!data.unidades_pipeta || data.unidades_pipeta <= 0) {
                errores.push("Las unidades de pipeta deben ser mayor a 0");
            }
            break;
    }
    
    // Validar rango de peso
    if (data.tiene_rango_peso) {
        if (!data.peso_min_kg || !data.peso_max_kg) {
            errores.push("Debe especificar peso mínimo y máximo");
        } else if (parseFloat(data.peso_min_kg) >= parseFloat(data.peso_max_kg)) {
            errores.push("El peso mínimo debe ser menor al peso máximo");
        }
    }
    
    return {
        valido: errores.length === 0,
        errores
    };
}

/**
 * Inicializa los event listeners para formato
 * @param {HTMLElement} modal - Elemento del modal
 */
function inicializarEventosFormato(modal) {
    const formatoSelect = modal.querySelector('select[data-field="formato"]');
    
    if (formatoSelect) {
        formatoSelect.addEventListener('change', function() {
            actualizarCamposDosis(this.value, modal);
        });
    }
    
    // Toggle rango de peso
    const toggleRango = modal.querySelector('input[data-field="tiene_rango_peso"]');
    if (toggleRango) {
        toggleRango.addEventListener('change', function() {
            const camposRango = modal.querySelectorAll('.campo-rango-valores');
            camposRango.forEach(campo => {
                campo.classList.toggle('d-none', !this.checked);
            });
        });
    }
}