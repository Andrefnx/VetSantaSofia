let activeClone = null;

function toggleWheel(button) {
    if (activeClone) {
        closeActiveMenu();
        return;
    }

    const options = button.nextElementSibling;
    const wheel = button.closest('.manage-wheel');
    const clone = options.cloneNode(true);
    const rect = button.getBoundingClientRect();
    
    clone.classList.add('show');
    
    // Calcular posición: a la izquierda del botón, centrado verticalmente
    const leftPosition = rect.left - 180 - 8; // 180px ancho menu + 8px margin
    const topPosition = rect.top + (rect.height / 2);
    
    // Aplicar posición inline (el CSS con position fixed ya está definido)
    clone.style.left = leftPosition + 'px';
    clone.style.top = topPosition + 'px';
    clone.style.transform = 'translateY(-50%)';
    
    // Insertar en body para que no sea cortado por overflow
    document.body.appendChild(clone);
    
    // Verificar si se sale del viewport
    const menuRect = clone.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Si se sale por abajo
    if (menuRect.bottom > viewportHeight - 20) {
        clone.style.top = 'auto';
        clone.style.bottom = '20px';
        clone.style.transform = 'none';
    }
    
    // Si se sale por arriba
    if (menuRect.top < 20) {
        clone.style.top = '20px';
        clone.style.bottom = 'auto';
        clone.style.transform = 'none';
    }
    
    activeClone = clone;
    wheel.classList.add('active');

    const originalButtons = options.querySelectorAll('button');
    const row = button.closest('tr');
    
    clone.querySelectorAll('button').forEach((btn, i) => {
        // Guardar referencia a la fila ANTES de cualquier cosa
        btn.__originalRow = row;
        btn.dataset.originalRow = row.getAttribute('data-id');
        
        // Establecer la fila actual
        if (typeof setCurrentRow === 'function') {
            setCurrentRow(row);
        }
        
        // Obtener atributos del botón ORIGINAL (no del clonado)
        const originalBtn = originalButtons[i];
        const onclickAttr = originalBtn.getAttribute('onclick');
        const dataAction = originalBtn.getAttribute('data-action');
        
        // Remover el onclick para manejarlo manualmente
        btn.removeAttribute('onclick');
        
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Si tiene onclick, ejecutar la función original con el botón que tiene __originalRow
            if (onclickAttr) {
                // Extraer nombre de función: "functionName(this)" -> "functionName"
                const match = onclickAttr.match(/^(\w+)\(/);
                if (match && typeof window[match[1]] === 'function') {
                    window[match[1]](btn); // Pasar el botón clonado con __originalRow
                }
            }
            
            closeActiveMenu();
        });
    });

    setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
}

function handleClickOutside(e) {
    if (activeClone && !e.target.closest('.manage-options, .manage-wheel button')) {
        closeActiveMenu();
    }
}

function closeActiveMenu() {
    if (activeClone) {
        activeClone.remove();
        activeClone = null;
    }
    document.querySelectorAll('.manage-wheel').forEach(w => w.classList.remove('active'));
    document.removeEventListener('click', handleClickOutside);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toggleWheel,
        closeActiveMenu
    };
}