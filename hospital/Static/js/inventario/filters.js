function initCustomSelects() {
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        const customSelect = wrapper.querySelector('.custom-select');
        const dropdown = wrapper.querySelector('.custom-select-dropdown');
        const hiddenInput = wrapper.querySelector('input[type="hidden"]');
        const selectedValue = wrapper.querySelector('.selected-value');

        if (!customSelect || !dropdown) return;

        customSelect.addEventListener('click', e => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select').forEach(s => {
                if (s !== customSelect) {
                    s.classList.remove('active');
                    const d = s.nextElementSibling;
                    if (d) d.classList.remove('active');
                }
            });
            customSelect.classList.toggle('active');
            dropdown.classList.toggle('active');
        });

        dropdown.querySelectorAll('li').forEach(option => {
            option.addEventListener('click', e => {
                e.stopPropagation();
                dropdown.querySelectorAll('li').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                
                if (selectedValue) {
                    selectedValue.textContent = option.textContent;
                    selectedValue.classList.remove('placeholder');
                }
                if (hiddenInput) {
                    hiddenInput.value = option.dataset.value;
                }
                
                customSelect.classList.remove('active');
                dropdown.classList.remove('active');
                filterTable();
            });
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('active'));
    });
}

function filterTable() {
    const searchInput = document.getElementById('searchInput');
    const filterEspecie = document.getElementById('filterEspecie');
    const filterStock = document.getElementById('filterStock');
    const filterProveedor = document.getElementById('filterProveedor');
    
    if (!searchInput) return;
    
    const search = searchInput.value.toLowerCase();
    const especie = filterEspecie ? filterEspecie.value.toLowerCase() : '';
    const stock = filterStock ? filterStock.value.toLowerCase() : '';
    const proveedor = filterProveedor ? filterProveedor.value.toLowerCase() : '';

    document.querySelectorAll('#inventoryTable tbody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = 
            text.includes(search) &&
            (!especie || row.dataset.especie === especie) &&
            (!stock || row.dataset.stock === stock) &&
            (!proveedor || row.dataset.proveedor === proveedor);
        
        row.style.display = matches ? '' : 'none';
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initCustomSelects,
        filterTable
    };
}