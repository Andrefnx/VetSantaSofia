function openAddProductModal() {
    const modal = document.getElementById('testCustomModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'block';
        modal.removeAttribute('aria-hidden');
        modal.setAttribute('aria-modal', 'true');
        // Opcional: agregar backdrop manualmente si lo necesitas
        document.body.classList.add('modal-open');
    }
}

function closeAddProductModal() {
    const modal = document.getElementById('testCustomModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-modal');
        document.body.classList.remove('modal-open');
    }
}
