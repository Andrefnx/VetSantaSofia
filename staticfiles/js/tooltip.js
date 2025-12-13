// Validación de contraseña en tiempo real
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('psw_input');
    const confirmPasswordInput = document.getElementById('confirm_psw');
    const passwordTooltip = document.getElementById('passwordTooltip');
    const passwordInfoIcon = document.getElementById('passwordInfo');
    const registerForm = document.getElementById('registerForm');
    
    if (!passwordInput || !passwordTooltip || !passwordInfoIcon) {
        console.error('Elementos de tooltip no encontrados');
        return;
    }
    
    // Requisitos
    const requirements = {
        length: /^.{8,}$/,
        uppercase: /[A-Z]/,
        lowercase: /[a-z]/,
        number: /[0-9]/,
        special: /[@$!%*?&]/
    };
    
    // Función para verificar si todos los requisitos se cumplen
    function validatePassword(password) {
        return Object.values(requirements).every(regex => regex.test(password));
    }
    
    // Mostrar tooltip al hacer hover en el ícono info
    passwordInfoIcon.addEventListener('mouseenter', function() {
        passwordTooltip.classList.add('active');
    });
    
    passwordInfoIcon.addEventListener('mouseleave', function() {
        if (!passwordInput.matches(':focus')) {
            passwordTooltip.classList.remove('active');
        }
    });
    
    // Mostrar tooltip al enfocar el input
    passwordInput.addEventListener('focus', function() {
        passwordTooltip.classList.add('active');
    });
    
    // Ocultar tooltip al perder el foco
    passwordInput.addEventListener('blur', function() {
        setTimeout(function() {
            passwordTooltip.classList.remove('active');
        }, 200);
    });
    
    // Validar en tiempo real mientras escribe
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        // Validar cada requisito
        Object.keys(requirements).forEach(key => {
            const requirement = document.getElementById(`req-${key}`);
            if (requirement) {
                if (requirements[key].test(password)) {
                    requirement.classList.add('valid');
                } else {
                    requirement.classList.remove('valid');
                }
            }
        });
        
        // Cambiar el borde según validación
        if (password.length > 0) {
            if (!validatePassword(password)) {
                passwordInput.style.borderColor = '#ef4444'; // Rojo
                passwordInput.setCustomValidity('La contraseña no cumple con todos los requisitos de seguridad');
            } else {
                passwordInput.style.borderColor = '#22c55e'; // Verde
                passwordInput.setCustomValidity('');
            }
        } else {
            passwordInput.style.borderColor = ''; // Borde normal
            passwordInput.setCustomValidity('');
        }
    });
    
    // Validar que las contraseñas coincidan
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            if (this.value.length > 0) {
                if (this.value !== passwordInput.value) {
                    this.style.borderColor = '#ef4444'; // Rojo
                    this.setCustomValidity('Las contraseñas no coinciden');
                } else {
                    this.style.borderColor = '#22c55e'; // Verde
                    this.setCustomValidity('');
                }
            } else {
                this.style.borderColor = ''; // Borde normal
                this.setCustomValidity('');
            }
        });
        
        passwordInput.addEventListener('input', function() {
            if (confirmPasswordInput.value && confirmPasswordInput.value !== this.value) {
                confirmPasswordInput.style.borderColor = '#ef4444'; // Rojo
                confirmPasswordInput.setCustomValidity('Las contraseñas no coinciden');
            } else if (confirmPasswordInput.value) {
                confirmPasswordInput.style.borderColor = '#22c55e'; // Verde
                confirmPasswordInput.setCustomValidity('');
            }
        });
    }
    
    // Validar antes de enviar el formulario
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const password = passwordInput.value;
            
            // Verificar requisitos de contraseña
            if (!validatePassword(password)) {
                e.preventDefault();
                passwordTooltip.classList.add('active');
                passwordInput.style.borderColor = '#ef4444';
                passwordInput.focus();
                alert('La contraseña debe cumplir con todos los requisitos de seguridad:\n\n' +
                      '• Mínimo 8 caracteres\n' +
                      '• Una letra mayúscula\n' +
                      '• Una letra minúscula\n' +
                      '• Un número\n' +
                      '• Un carácter especial (@$!%*?&)');
                return false;
            }
            
            // Verificar que las contraseñas coincidan
            if (confirmPasswordInput && password !== confirmPasswordInput.value) {
                e.preventDefault();
                confirmPasswordInput.style.borderColor = '#ef4444';
                confirmPasswordInput.focus();
                alert('Las contraseñas no coinciden');
                return false;
            }
        });
    }
});