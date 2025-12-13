const rutInput = document.getElementById('rut_input');
const errorMsg = document.getElementById('rut_error');

rutInput.addEventListener('input', function (e) {
    let value = e.target.value.replace(/[^0-9kK]/g, ''); // solo números y k/K
    value = value.toUpperCase(); // convierte k -> K

    // Limitar a 9 caracteres (8 dígitos + 1 dígito verificador)
    if (value.length > 9) {
        value = value.slice(0, 9);
    }

    // separa cuerpo y dígito verificador
    let cuerpo = value.slice(0, -1);
    let dv = value.slice(-1);

    // aplica formato 12.345.678
    let formatted = '';
    while (cuerpo.length > 3) {
        formatted = '.' + cuerpo.slice(-3) + formatted;
        cuerpo = cuerpo.slice(0, -3);
    }
    formatted = cuerpo + formatted;

    if (dv) {
        formatted += '-' + dv;
    }

    e.target.value = formatted;

    // validación del RUT
    if (formatted.length >= 8) {
        if (validarRut(formatted)) {
            e.target.style.borderColor = ''; // restaurar estilo original
            if (errorMsg) errorMsg.style.display = 'none';
        } else {
            e.target.style.borderColor = '#ef4444'; // rojo
            if (errorMsg) errorMsg.style.display = 'block';
        }
    } else {
        e.target.style.borderColor = ''; // restaurar estilo original
        if (errorMsg) errorMsg.style.display = 'none';
    }
});

// función para validar RUT chileno
function validarRut(rut) {
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    if (rut.length < 2) return false;
    let cuerpo = rut.slice(0, -1);
    let dv = rut.slice(-1);

    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * multiplicador;
        multiplicador = multiplicador < 7 ? multiplicador + 1 : 2;
    }

    let resto = suma % 11;
    let dvEsperado = 11 - resto;
    let dvFinal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

    return dv.toUpperCase() === dvFinal;
}