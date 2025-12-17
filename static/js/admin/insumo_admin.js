/**
 * Admin de Inventario - Control dinámico de campos de dosis
 * Muestra campos según el formato del producto
 */

(function() {
    'use strict';

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const formatoSelect = document.getElementById('id_formato');
        if (!formatoSelect) return;

        // Aplicar visibilidad inicial
        setTimeout(() => toggleDosisFields(formatoSelect.value), 100);

        // Escuchar cambios en el formato
        formatoSelect.addEventListener('change', function() {
            toggleDosisFields(this.value);
        });

        // También manejar el checkbox de rango de peso
        const rangoCheckbox = document.getElementById('id_tiene_rango_peso');
        if (rangoCheckbox) {
            toggleRangoPeso(rangoCheckbox.checked);
            rangoCheckbox.addEventListener('change', function() {
                toggleRangoPeso(this.checked);
            });
        }
    }

    function toggleDosisFields(formato) {
        console.log('Formato seleccionado:', formato);
        
        // Ocultar todos los fieldsets de dosis por clase CSS
        hideAllDosisFieldsets();

        // Mostrar solo los relevantes según el formato
        if (formato === 'liquido' || formato === 'inyectable') {
            showFieldsetsByClass('formato-liquido');
            showFieldsetsByClass('formato-inyectable');
        } else if (formato === 'pastilla') {
            showFieldsetsByClass('formato-pastilla');
        } else if (formato === 'pipeta') {
            showFieldsetsByClass('formato-pipeta');
        }
    }

    function hideAllDosisFieldsets() {
        const classes = ['formato-liquido', 'formato-inyectable', 'formato-pastilla', 'formato-pipeta'];
        
        classes.forEach(className => {
            const fieldsets = document.querySelectorAll(`.${className}`);
            fieldsets.forEach(fieldset => {
                fieldset.style.display = 'none';
            });
        });
    }

    function showFieldsetsByClass(className) {
        const fieldsets = document.querySelectorAll(`.${className}`);
        console.log(`Mostrando fieldsets con clase ${className}:`, fieldsets.length);
        
        fieldsets.forEach(fieldset => {
            fieldset.style.display = '';
            // También expandir si está colapsado
            const link = fieldset.querySelector('.collapse-toggle');
            if (link && link.classList.contains('collapsed')) {
                link.click();
            }
        });
    }

    function toggleRangoPeso(mostrar) {
        const pesoMinRow = document.querySelector('.field-peso_min_kg');
        const pesoMaxRow = document.querySelector('.field-peso_max_kg');
        
        if (pesoMinRow) {
            pesoMinRow.style.display = mostrar ? '' : 'none';
        }
        if (pesoMaxRow) {
            pesoMaxRow.style.display = mostrar ? '' : 'none';
        }
    }
})();
