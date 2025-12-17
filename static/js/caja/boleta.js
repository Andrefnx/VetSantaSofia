/**
 * SCRIPT DE AUTO-IMPRESIÓN PARA BOLETA
 * Veterinaria Santa Sofia
 * 
 * Funcionalidad:
 * - Abre automáticamente el diálogo de impresión al cargar la página
 * - Maneja eventos de impresión (inicio y finalización)
 * - Opcional: cierra la ventana después de imprimir
 */

(function() {
    'use strict';

    // Configuración
    const CONFIG = {
        autoImprimirDelay: 500,      // Delay antes de abrir diálogo (ms)
        cerrarVentanaAlImprimir: false, // Cambiar a true si se quiere cerrar automáticamente
        mostrarMensajes: true         // Mostrar mensajes en consola
    };

    /**
     * Función principal de impresión
     */
    function imprimirBoleta() {
        if (CONFIG.mostrarMensajes) {
            console.log('Iniciando impresión de boleta...');
        }

        try {
            // Abrir diálogo de impresión
            window.print();
        } catch (error) {
            console.error('Error al intentar imprimir:', error);
            alert('Hubo un error al intentar imprimir la boleta. Por favor, use Ctrl+P manualmente.');
        }
    }

    /**
     * Detectar cuando se inicia la impresión
     */
    function onBeforePrint() {
        if (CONFIG.mostrarMensajes) {
            console.log('Diálogo de impresión abierto');
        }
    }

    /**
     * Detectar cuando termina la impresión
     */
    function onAfterPrint() {
        if (CONFIG.mostrarMensajes) {
            console.log('Diálogo de impresión cerrado');
        }

        // Opcionalmente cerrar la ventana después de imprimir
        if (CONFIG.cerrarVentanaAlImprimir) {
            setTimeout(function() {
                if (CONFIG.mostrarMensajes) {
                    console.log('Cerrando ventana...');
                }
                window.close();
            }, 100);
        }
    }

    /**
     * Inicialización
     */
    function init() {
        // Registrar eventos de impresión
        if (window.matchMedia) {
            // Método moderno
            const mediaQueryList = window.matchMedia('print');
            mediaQueryList.addListener(function(mql) {
                if (mql.matches) {
                    onBeforePrint();
                } else {
                    onAfterPrint();
                }
            });
        }

        // Fallback para navegadores más antiguos
        window.addEventListener('beforeprint', onBeforePrint);
        window.addEventListener('afterprint', onAfterPrint);

        // Auto-imprimir al cargar la página
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            // DOM ya está listo
            setTimeout(imprimirBoleta, CONFIG.autoImprimirDelay);
        } else {
            // Esperar a que el DOM esté listo
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(imprimirBoleta, CONFIG.autoImprimirDelay);
            });
        }

        if (CONFIG.mostrarMensajes) {
            console.log('Sistema de impresión de boleta inicializado');
        }
    }

    /**
     * Función para re-imprimir (por si acaso se necesita)
     * Puede ser llamada desde la consola: Boleta.reimprimir()
     */
    window.Boleta = {
        reimprimir: function() {
            imprimirBoleta();
        },
        config: CONFIG
    };

    // Inicializar cuando el script se carga
    init();

})();
