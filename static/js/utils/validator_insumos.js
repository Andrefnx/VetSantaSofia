/**
 * Módulo de Validación de Insumos
 * 
 * Centraliza la lógica de validación para acciones sobre insumos médicos,
 * evitando dobles descuentos y errores de usuario.
 * 
 * Funcionalidades:
 * - Validación de estado insumos_descontados
 * - Protección contra múltiples clicks (debounce)
 * - Control de estado de botones submit
 * - Alertas visuales consistentes
 */

const ValidadorInsumos = (function() {
    'use strict';

    // Estado interno del validador
    const state = {
        processingButtons: new Map(), // Botones en proceso
        submittedForms: new Set()      // Formularios ya enviados
    };

    /**
     * Verifica si los insumos ya fueron descontados
     * @param {Object} data - Datos de la consulta/hospitalización con flag insumos_descontados
     * @returns {boolean} true si ya están descontados
     */
    function yaDescontados(data) {
        return data && data.insumos_descontados === true;
    }

    /**
     * Valida si se puede ejecutar una acción sobre insumos
     * @param {Object} options
     * @param {Object} options.data - Datos con insumos_descontados flag
     * @param {string} options.tipo - Tipo de acción: 'consulta', 'cirugia', 'alta'
     * @param {HTMLElement} options.button - Botón que dispara la acción (opcional)
     * @returns {Object} { valido: boolean, mensaje: string }
     */
    function validarAccion(options) {
        const { data, tipo, button } = options;

        // 1. Validar si los insumos ya fueron descontados
        if (yaDescontados(data)) {
            const mensajes = {
                'consulta': 'Los medicamentos e insumos de esta consulta ya fueron descontados del inventario.\n\nLa atención médica ya fue registrada completamente.',
                'cirugia': 'Los insumos quirúrgicos de esta cirugía ya fueron descontados del inventario.\n\nEl procedimiento ya fue registrado completamente.',
                'alta': 'Esta hospitalización ya fue cerrada y sus insumos fueron descontados.\n\nEl alta médica ya fue registrada.'
            };
            
            return {
                valido: false,
                mensaje: `🔒 ATENCIÓN\n\n${mensajes[tipo] || 'Los insumos de esta atención ya fueron descontados del inventario.'}`,
                tipo: 'insumos_ya_descontados'
            };
        }

        // 2. Validar si el botón ya está procesando
        if (button && state.processingButtons.has(button)) {
            return {
                valido: false,
                mensaje: '⏳ Un momento por favor...\n\nEl registro se está guardando en el sistema.\nEsto puede tomar unos segundos.',
                tipo: 'ya_procesando'
            };
        }

        // Acción válida
        return {
            valido: true,
            mensaje: 'OK'
        };
    }

    /**
     * Bloquea un botón durante el procesamiento
     * @param {HTMLElement} button - Botón a bloquear
     * @param {string} textoOriginal - Texto original del botón (opcional)
     */
    function bloquearBoton(button, textoOriginal = null) {
        if (!button) return;

        const texto = textoOriginal || button.textContent;
        
        // Guardar estado original
        state.processingButtons.set(button, {
            textoOriginal: texto,
            disabledOriginal: button.disabled,
            timestamp: Date.now()
        });

        // Bloquear botón
        button.disabled = true;
        button.style.cursor = 'not-allowed';
        button.style.opacity = '0.6';
        
        // Cambiar texto si tiene ícono o texto
        const spinner = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>';
        button.innerHTML = spinner + 'Procesando...';
    }

    /**
     * Desbloquea un botón después del procesamiento
     * @param {HTMLElement} button - Botón a desbloquear
     * @param {boolean} exito - Si la acción fue exitosa
     */
    function desbloquearBoton(button, exito = true) {
        if (!button || !state.processingButtons.has(button)) return;

        const estadoOriginal = state.processingButtons.get(button);
        
        // Si fue exitoso, mantener bloqueado 2 segundos más
        if (exito) {
            button.innerHTML = '<i class="bi bi-check-circle me-2"></i>Completado';
            button.style.opacity = '1';
            
            setTimeout(() => {
                restaurarBoton(button, estadoOriginal);
            }, 2000);
        } else {
            // Error: restaurar inmediatamente
            restaurarBoton(button, estadoOriginal);
        }
    }

    /**
     * Restaura el estado original de un botón
     * @param {HTMLElement} button
     * @param {Object} estadoOriginal
     */
    function restaurarBoton(button, estadoOriginal) {
        button.disabled = estadoOriginal.disabledOriginal;
        button.style.cursor = '';
        button.style.opacity = '';
        button.innerHTML = estadoOriginal.textoOriginal;
        
        state.processingButtons.delete(button);
    }

    /**
     * Marca un formulario como enviado (protección adicional)
     * @param {HTMLFormElement} form
     */
    function marcarFormularioEnviado(form) {
        if (!form || !form.id) return;
        state.submittedForms.add(form.id);
    }

    /**
     * Verifica si un formulario ya fue enviado
     * @param {HTMLFormElement} form
     * @returns {boolean}
     */
    function formularioYaEnviado(form) {
        if (!form || !form.id) return false;
        return state.submittedForms.has(form.id);
    }

    /**
     * Resetea el estado de un formulario (después de error o reset)
     * @param {HTMLFormElement} form
     */
    function resetearFormulario(form) {
        if (!form || !form.id) return;
        state.submittedForms.delete(form.id);
    }

    /**
     * Muestra alerta personalizada según el tipo de error
     * @param {string} mensaje
     * @param {string} tipo - 'insumos_ya_descontados', 'ya_procesando', 'error'
     */
    function mostrarAlerta(mensaje, tipo = 'error') {
        const iconos = {
            'insumos_ya_descontados': '🔒',
            'ya_procesando': '⏳',
            'error': '❌',
            'success': '✅'
        };

        const icono = iconos[tipo] || iconos.error;
        alert(`${icono} ${mensaje}`);
    }

    /**
     * Wrapper para ejecutar una acción con validación completa
     * @param {Object} options
     * @param {Object} options.data - Datos con insumos_descontados
     * @param {string} options.tipo - Tipo de acción
     * @param {HTMLElement} options.button - Botón submit
     * @param {HTMLFormElement} options.form - Formulario
     * @param {Function} options.accion - Función async a ejecutar
     * @returns {Promise<any>} Resultado de la acción
     */
    async function ejecutarConValidacion(options) {
        const { data, tipo, button, form, accion } = options;

        // 1. Validar formulario no fue enviado
        if (form && formularioYaEnviado(form)) {
            mostrarAlerta('⚠️ ATENCIÓN\n\nEste registro ya fue enviado al sistema.\nPor favor espere mientras se completa la operación.', 'ya_procesando');
            return null;
        }

        // 2. Validar acción
        const validacion = validarAccion({ data, tipo, button });
        if (!validacion.valido) {
            mostrarAlerta(validacion.mensaje, validacion.tipo);
            return null;
        }

        // 3. Bloquear UI
        if (button) bloquearBoton(button);
        if (form) marcarFormularioEnviado(form);

        try {
            // 4. Ejecutar acción
            const resultado = await accion();

            // 5. Éxito - desbloquear
            if (button) desbloquearBoton(button, true);
            
            return resultado;

        } catch (error) {
            // 6. Error - desbloquear y resetear
            console.error(`Error en ${tipo}:`, error);
            
            if (button) desbloquearBoton(button, false);
            if (form) resetearFormulario(form);
            
            mostrarAlerta(
                `Error al procesar ${tipo}. Por favor intente nuevamente.\n\nDetalle: ${error.message}`,
                'error'
            );
            
            throw error; // Re-throw para manejo adicional si es necesario
        }
    }

    /**
     * Crea un badge visual para mostrar estado de insumos
     * @param {boolean} descontados
     * @returns {string} HTML del badge
     */
    function crearBadgeEstado(descontados) {
        if (descontados) {
            return `
                <div class="alert alert-success d-flex align-items-center mb-0" role="alert">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    <small><strong>✓ Medicamentos e insumos ya descontados del inventario</strong></small>
                </div>
            `;
        } else {
            return `
                <div class="alert alert-warning d-flex align-items-center mb-0" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    <small><strong>⚠ Insumos pendientes de registro en inventario</strong></small>
                </div>
            `;
        }
    }

    /**
     * Deshabilita botones de acción en UI si insumos ya descontados
     * @param {Object} data - Datos con insumos_descontados
     * @param {Array<HTMLElement>} botones - Botones a deshabilitar
     */
    function actualizarUISegunEstado(data, botones = []) {
        if (!yaDescontados(data)) return;

        botones.forEach(boton => {
            if (boton) {
                boton.disabled = true;
                boton.style.cursor = 'not-allowed';
                boton.style.opacity = '0.5';
                boton.title = 'Los insumos ya fueron descontados';
            }
        });
    }

    // API pública
    return {
        validarAccion,
        ejecutarConValidacion,
        bloquearBoton,
        desbloquearBoton,
        marcarFormularioEnviado,
        formularioYaEnviado,
        resetearFormulario,
        mostrarAlerta,
        crearBadgeEstado,
        actualizarUISegunEstado,
        yaDescontados
    };
})();

// Exportar para uso global
window.ValidadorInsumos = ValidadorInsumos;
