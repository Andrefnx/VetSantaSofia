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
        // ⭐ IMPORTANTE: Remover onclick inline para evitar doble ejecución
        btn.removeAttribute('onclick');
        
        btn.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault(); // Prevenir cualquier comportamiento por defecto
            
            // Establecer la fila actual
            if (typeof setCurrentRow === 'function') {
                setCurrentRow(row);
            }
            
            // Guardar referencia a la fila en el botón clonado antes de ejecutar la acción
            btn.dataset.originalRow = row.getAttribute('data-id');
            btn.__originalRow = row; // Guardar referencia directa al TR
            
            // Ejecutar la acción original con el botón original para mantener el contexto correcto
            originalButtons[i].click();
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