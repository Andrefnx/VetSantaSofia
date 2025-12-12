let activeClone = null;

function toggleWheel(button) {
    if (activeClone) {
        closeActiveMenu();
        return;
    }

    const options = button.nextElementSibling;
    const rect = button.getBoundingClientRect();
    const clone = options.cloneNode(true);
    
    clone.classList.add('show');
    clone.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 8}px;
        right: ${window.innerWidth - rect.right}px;
        z-index: 9999;
        min-width: 180px;
    `;

    document.body.appendChild(clone);
    activeClone = clone;
    button.closest('.manage-wheel').classList.add('active');

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