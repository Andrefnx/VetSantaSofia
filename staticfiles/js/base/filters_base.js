// static/js/base/filters_base.js
export function initCustomSelects(callback) {
    document.querySelectorAll('.vet-custom-select-wrapper').forEach(wrapper => {
        const customSelect = wrapper.querySelector('.vet-custom-select');
        const dropdown = wrapper.querySelector('.vet-custom-select-dropdown');
        const valueSpan = wrapper.querySelector('.vet-selected-value');
        const input = wrapper.querySelector('input[type="hidden"]');

        if (!customSelect || !dropdown) return;

        customSelect.addEventListener('click', function(e) {
            e.stopPropagation();
            // Cierra otros
            document.querySelectorAll('.vet-custom-select-dropdown.active').forEach(d => {
                if (d !== dropdown) d.classList.remove('active');
            });
            document.querySelectorAll('.vet-custom-select.active').forEach(s => {
                if (s !== customSelect) s.classList.remove('active');
            });
            dropdown.classList.toggle('active');
            customSelect.classList.toggle('active');
        });

        dropdown.querySelectorAll('li').forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                valueSpan.textContent = option.textContent;
                valueSpan.classList.remove('placeholder');
                input.value = option.getAttribute('data-value');
                dropdown.classList.remove('active');
                customSelect.classList.remove('active');
                dropdown.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                option.classList.add('selected');
                if (typeof callback === 'function') callback();
            });
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.vet-custom-select-dropdown.active').forEach(d => d.classList.remove('active'));
        document.querySelectorAll('.vet-custom-select.active').forEach(s => s.classList.remove('active'));
    });
}

// Ejemplo de función de filtrado adaptable (opcional, si tienes una tabla)
export function filterTableByFilters(tableId, searchInputId) {
    const searchInput = document.getElementById(searchInputId);
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    // Obtén todos los filtros dinámicamente
    const filters = {};
    document.querySelectorAll('.vet-custom-select-wrapper input[type="hidden"]').forEach(input => {
        filters[input.id] = input.value;
    });

    document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
        let visible = row.textContent.toLowerCase().includes(query);
        for (const [key, val] of Object.entries(filters)) {
            if (val && row.dataset[key.replace('filter', '').toLowerCase()] !== val) visible = false;
        }
        row.style.display = visible ? '' : 'none';
    });
}

// Inicializa los selects al cargar
document.addEventListener('DOMContentLoaded', function() {
    initCustomSelects();
});
