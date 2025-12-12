document.addEventListener('DOMContentLoaded', function() {
    // Obtener todos los selectores personalizados
    const customSelects = document.querySelectorAll('.custom-select-wrapper');

    customSelects.forEach(wrapper => {
        const customSelect = wrapper.querySelector('.custom-select');
        const dropdown = wrapper.querySelector('.custom-select-dropdown');
        const hiddenInput = wrapper.querySelector('input[type="hidden"]');
        const selectedValue = wrapper.querySelector('.selected-value');
        const options = wrapper.querySelectorAll('.custom-select-dropdown li');

        // Toggle dropdown
        customSelect.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Cerrar otros dropdowns abiertos
            customSelects.forEach(otherWrapper => {
                if (otherWrapper !== wrapper) {
                    otherWrapper.querySelector('.custom-select').classList.remove('active');
                    otherWrapper.querySelector('.custom-select-dropdown').classList.remove('active');
                }
            });

            customSelect.classList.toggle('active');
            dropdown.classList.toggle('active');
        });

        // Select option
        options.forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Remove selected class from all options
                options.forEach(opt => opt.classList.remove('selected'));
                
                // Add selected class to clicked option
                this.classList.add('selected');
                
                // Update display and hidden input
                selectedValue.textContent = this.textContent;
                selectedValue.classList.remove('placeholder');
                hiddenInput.value = this.dataset.value;
                
                // Close dropdown
                customSelect.classList.remove('active');
                dropdown.classList.remove('active');
            });
        });
    });

    // Close all dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        customSelects.forEach(wrapper => {
            const customSelect = wrapper.querySelector('.custom-select');
            const dropdown = wrapper.querySelector('.custom-select-dropdown');
            
            if (!wrapper.contains(e.target)) {
                customSelect.classList.remove('active');
                dropdown.classList.remove('active');
            }
        });
    });
});