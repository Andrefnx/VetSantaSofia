// static/js/base/modals_base.js
export function setupModalGuard(modalId, state) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.addEventListener('hide.bs.modal', e => {
        if (!state.allowClose && state.formChanged) {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Tienes cambios sin guardar. ¿Cerrar de todos modos?')) {
                state.allowClose = true;
                state.formChanged = false;
                bootstrap.Modal.getInstance(modal).hide();
            }
        }
    });

    modal.addEventListener('show.bs.modal', () => {
        state.formChanged = false;
        state.allowClose = false;
    });
}

function openBatchesModal(productName) {
    const batches = productBatches[productName] || [];
    document.getElementById('batchProductName').textContent = productName;
    // ...cargar los lotes en #batchList...

    // Mostrar el modal usando Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('batchesModal'));
    modal.show();
}
