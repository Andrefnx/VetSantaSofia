// static/js/base/tables_base.js
export function initBaseTable(tableId, onRowClick = null) {
    const table = document.getElementById(tableId);
    if (!table) return;

    table.querySelectorAll('tbody tr').forEach(row => {
        row.style.cursor = onRowClick ? 'pointer' : 'default';
        row.addEventListener('click', e => {
            if (onRowClick && !e.target.closest('.manage-wheel')) {
                onRowClick(row);
            }
        });
    });
}

export function clearModalBackdrops() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('hidden.bs.modal', () => {
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.remove('modal-open');
            document.body.style.cssText = '';
        });
    });
}
