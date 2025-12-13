let sidebarWidthTimer;

const updateSidebarWidthVar = () => {
    const sidebar = document.getElementById('vetSidebar');
    if (!sidebar) return;
    const width = sidebar.getBoundingClientRect().width;
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
};

const scheduleSidebarWidthUpdate = () => {
    clearTimeout(sidebarWidthTimer);
    sidebarWidthTimer = setTimeout(updateSidebarWidthVar, 50);
};

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

    // Ajustar ancho del modal al borde real del sidebar
    updateSidebarWidthVar();
    window.addEventListener('resize', scheduleSidebarWidthUpdate);

    const sidebar = document.getElementById('vetSidebar');
    if (sidebar) {
        const observer = new MutationObserver(scheduleSidebarWidthUpdate);
        observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            requestAnimationFrame(scheduleSidebarWidthUpdate);
        });
    }
});

import { initManageWheel } from './wheel_base.js';
import { initCustomSelects } from './filters_base.js';

document.addEventListener('DOMContentLoaded', function() {
    initManageWheel();
    initCustomSelects();
});