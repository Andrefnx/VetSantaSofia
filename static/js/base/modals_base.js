function openVetModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) {
        console.warn('No se encontró el modal con id:', id);
        return;
    }
    overlay.classList.remove("hide");
    overlay.classList.add("show");
}

function closeVetModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) {
        console.warn('No se encontró el modal con id:', id);
        return;
    }
    overlay.classList.remove("show");
    overlay.classList.add("hide");
}
