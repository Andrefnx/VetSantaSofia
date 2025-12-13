// Reusable validators for email and Chile phone (+56)
// Email: flexible, not overly restrictive
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Chile phone: optional +56, must start with 9 followed by 8 digits; spaces allowed
const CHILE_PHONE_REGEX = /^(?:\+?56)?\s*9\s*\d{8}$/;

function isValidEmail(value) {
    if (!value) return true; // allow empty optional
    return EMAIL_REGEX.test(value.trim());
}

function isValidChilePhone(value) {
    if (!value) return false; // required in our form
    const v = value.toString().trim().replace(/\s+/g, ' ');
    return CHILE_PHONE_REGEX.test(v);
}

// Normalize phone to canonical +569XXXXXXXX
function normalizeChilePhone(value) {
    if (!value) return '';
    const digits = value.replace(/[^0-9]/g, '');
    // Remove leading 56 if present
    let normalized = digits;
    if (normalized.startsWith('56')) {
        normalized = normalized.slice(2);
    }
    // Ensure leading 9 for mobile
    if (!normalized.startsWith('9')) {
        // Do not auto-add 9 if missing, keep as is; validation will fail
        return `+56${normalized}`;
    }
    const core = normalized.slice(0, 9); // 9 + 8 digits total = 9 length
    return `+56${core}`;
}

// Attach validation handlers to inputs
function attachEmailPhoneValidation(emailSelector, phoneSelector) {
    const emailInput = document.querySelector(emailSelector);
    const phoneInput = document.querySelector(phoneSelector);

    if (emailInput) {
        emailInput.addEventListener('input', () => {
            const v = emailInput.value;
            // Disallow spaces
            if (/\s/.test(v)) {
                emailInput.value = v.replace(/\s+/g, '');
            }
            emailInput.setCustomValidity('');
            if (emailInput.value && !isValidEmail(emailInput.value)) {
                emailInput.setCustomValidity('Correo inválido');
            }
        });
        emailInput.addEventListener('blur', () => {
            emailInput.setCustomValidity('');
            if (emailInput.value && !isValidEmail(emailInput.value)) {
                emailInput.setCustomValidity('Correo inválido');
            }
        });
    }

    if (phoneInput) {
        // Filter to digits, +, and spaces; and normalize on blur
        phoneInput.addEventListener('input', () => {
            const allowed = phoneInput.value.replace(/[^0-9+\s]/g, '');
            if (allowed !== phoneInput.value) phoneInput.value = allowed;
            phoneInput.setCustomValidity('');
        });
        phoneInput.addEventListener('blur', () => {
            const norm = normalizeChilePhone(phoneInput.value);
            phoneInput.value = norm;
            phoneInput.setCustomValidity('');
            if (!isValidChilePhone(phoneInput.value)) {
                phoneInput.setCustomValidity('Teléfono chileno inválido');
            }
        });
    }
}
