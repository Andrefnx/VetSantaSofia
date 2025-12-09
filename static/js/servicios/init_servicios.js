// static/js/inventario/init.js
import { initCustomSelects, filterTable } from '../base/filters_base.js';
import { initBaseTable, clearModalBackdrops } from '../base/tables_base.js';
import { initManageWheel } from '../base/wheel_base.js';

document.addEventListener('DOMContentLoaded', () => {
    initManageWheel(window.setCurrentRow);
    initBaseTable('inventoryTable', row => openBatchesModal(row.cells[0].textContent));
    clearModalBackdrops();

    const filters = {
        especie: document.getElementById('filterEspecie'),
        stock: document.getElementById('filterStock'),
        proveedor: document.getElementById('filterProveedor')
    };

    const getFilterValues = () => ({
        especie: filters.especie?.value || '',
        stock: filters.stock?.value || '',
        proveedor: filters.proveedor?.value || ''
    });

    const applyFilter = () => filterTable({
        tableId: 'inventoryTable',
        searchInputId: 'searchInput',
        filters: getFilterValues()
    });

    initCustomSelects(applyFilter);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', applyFilter);
});
