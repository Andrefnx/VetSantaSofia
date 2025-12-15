/**
 * Chilean Phone Number Validator Module
 * 
 * Validates and normalizes Chilean phone numbers to the format +569XXXXXXXX
 * Compatible with Bootstrap form validation classes
 * 
 * @author VetSantaSofia
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    /**
     * Normalize phone number by removing spaces, dashes, dots, and parentheses
     * @param {string} phone - Raw phone input
     * @returns {string} Normalized phone number
     */
    function normalizePhone(phone) {
        if (!phone) return '';
        // Remove all non-digit characters except the leading +
        return phone.toString().replace(/[^\d+]/g, '');
    }

    /**
     * Validate Chilean phone number format
     * Valid formats:
     * - +569XXXXXXXX (9 digits after +569)
     * - 9XXXXXXXX (auto-prepends +56)
     * 
     * @param {string} phone - Normalized phone number
     * @returns {boolean} True if valid Chilean mobile format
     */
    function isValidChileanPhone(phone) {
        // Pattern: +569 followed by exactly 8 digits (total 12 characters)
        const chileanMobilePattern = /^\+569\d{8}$/;
        return chileanMobilePattern.test(phone);
    }

    /**
     * Auto-prepend +56 to phone numbers that start with 9
     * @param {string} phone - Normalized phone number
     * @returns {string} Phone with country code
     */
    function addCountryCode(phone) {
        // If starts with 9 and has 9 digits total, prepend +56
        if (/^9\d{8}$/.test(phone)) {
            return '+56' + phone;
        }
        return phone;
    }

    /**
     * Show inline error message below input field
     * @param {HTMLElement} inputElement - The input field
     * @param {string} message - Error message to display
     */
    function showError(inputElement, message) {
        // Remove existing error messages
        clearError(inputElement);

        // Add Bootstrap invalid class
        inputElement.classList.add('is-invalid');
        inputElement.classList.remove('is-valid');

        // Create error feedback div
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        errorDiv.setAttribute('data-phone-error', 'true');

        // Insert after input field
        inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
    }

    /**
     * Show success state for valid input
     * @param {HTMLElement} inputElement - The input field
     */
    function showSuccess(inputElement) {
        clearError(inputElement);
        inputElement.classList.remove('is-invalid');
        inputElement.classList.add('is-valid');
    }

    /**
     * Clear error messages and validation classes
     * @param {HTMLElement} inputElement - The input field
     */
    function clearError(inputElement) {
        inputElement.classList.remove('is-invalid', 'is-valid');
        
        // Remove any existing error messages
        const existingErrors = inputElement.parentNode.querySelectorAll('[data-phone-error="true"]');
        existingErrors.forEach(error => error.remove());
    }

    /**
     * Main validation function - validates and normalizes phone number
     * @param {HTMLElement} inputElement - The phone input field to validate
     * @param {Object} options - Optional configuration
     * @param {boolean} options.showFeedback - Show visual feedback (default: true)
     * @param {boolean} options.autoFormat - Auto-format the input value (default: true)
     * @returns {Object} Validation result { isValid: boolean, phone: string, error: string }
     */
    function validatePhone(inputElement, options = {}) {
        const defaults = {
            showFeedback: true,
            autoFormat: true
        };
        const settings = { ...defaults, ...options };

        // Get raw input value
        const rawPhone = inputElement.value.trim();

        // Empty check
        if (!rawPhone) {
            if (settings.showFeedback && inputElement.hasAttribute('required')) {
                showError(inputElement, 'El número de teléfono es obligatorio.');
                return { isValid: false, phone: '', error: 'required' };
            }
            clearError(inputElement);
            return { isValid: true, phone: '', error: null };
        }

        // Normalize phone
        let normalizedPhone = normalizePhone(rawPhone);

        // Auto-prepend country code if needed
        normalizedPhone = addCountryCode(normalizedPhone);

        // Validate format
        const isValid = isValidChileanPhone(normalizedPhone);

        if (isValid) {
            // Update input value with normalized phone
            if (settings.autoFormat) {
                inputElement.value = normalizedPhone;
            }
            
            if (settings.showFeedback) {
                showSuccess(inputElement);
            }
            
            return { isValid: true, phone: normalizedPhone, error: null };
        } else {
            const errorMessage = 'Ingrese un número móvil chileno válido (ej: +56987654321 o 987654321)';
            
            if (settings.showFeedback) {
                showError(inputElement, errorMessage);
            }
            
            return { isValid: false, phone: normalizedPhone, error: 'invalid_format' };
        }
    }

    /**
     * Attach real-time validation to input field
     * @param {HTMLElement} inputElement - The phone input field
     * @param {Object} options - Validation options
     */
    function attachValidator(inputElement, options = {}) {
        // Validate on blur
        inputElement.addEventListener('blur', function() {
            validatePhone(this, options);
        });

        // Optional: Clear error on focus
        inputElement.addEventListener('focus', function() {
            if (this.classList.contains('is-invalid')) {
                clearError(this);
            }
        });

        // Optional: Validate on input (with debounce)
        let debounceTimer;
        inputElement.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                validatePhone(this, options);
            }, 500);
        });
    }

    /**
     * Initialize validation for all phone inputs with data-validate-phone attribute
     */
    function initAll() {
        const phoneInputs = document.querySelectorAll('[data-validate-phone]');
        phoneInputs.forEach(input => {
            attachValidator(input);
        });
    }

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    // Export to global scope
    window.PhoneValidator = {
        validatePhone: validatePhone,
        attachValidator: attachValidator,
        initAll: initAll,
        normalizePhone: normalizePhone,
        isValidChileanPhone: isValidChileanPhone
    };

})(window);
