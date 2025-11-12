document.addEventListener('DOMContentLoaded', () => {
    // Inicializar búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput && typeof filterTable === 'function') {
        searchInput.addEventListener('input', filterTable);
    }
    
    // Inicializar selectores personalizados
    if (typeof initCustomSelects === 'function') {
        initCustomSelects();
    }
    
    // Click en fila abre lotes
    document.querySelectorAll('#inventoryTable tbody tr').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', e => {
            if (!e.target.closest('.manage-wheel')) {
                if (typeof openBatchesModal === 'function') {
                    openBatchesModal(row.cells[0].textContent);
                }
            }
        });
    });
    
    // Limpiar modales al cerrar
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('hidden.bs.modal', () => {
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.remove('modal-open');
            document.body.style.cssText = '';
        });
    });

    
});

import { initManageWheel } from './wheel_base.js';
import { initCustomSelects } from './filters_base.js';

document.addEventListener('DOMContentLoaded', function() {
    initManageWheel();
    initCustomSelects();
});