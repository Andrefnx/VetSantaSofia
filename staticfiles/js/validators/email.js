/**
 * Email Validator Module
 * 
 * Validates and normalizes email addresses with RFC-compliant basic validation
 * Compatible with Bootstrap form validation classes
 * 
 * @author VetSantaSofia
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    /**
     * Normalize email by trimming whitespace and converting to lowercase
     * @param {string} email - Raw email input
     * @returns {string} Normalized email address
     */
    function normalizeEmail(email) {
        if (!email) return '';
        return email.toString().trim().toLowerCase();
    }

    /**
     * Validate email format (basic RFC-compliant validation)
     * Accepts common email patterns without being overly restrictive
     * 
     * @param {string} email - Email address to validate
     * @returns {boolean} True if valid email format
     */
    function isValidEmail(email) {
        // Basic RFC-compliant email pattern
        // Allows: letters, numbers, dots, hyphens, underscores, plus signs
        // Format: localpart@domain.tld
        const emailPattern = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        // Additional checks
        if (!emailPattern.test(email)) {
            return false;
        }
        
        // Prevent consecutive dots
        if (email.includes('..')) {
            return false;
        }
        
        // Prevent starting/ending with dot in local part
        const localPart = email.split('@')[0];
        if (localPart.startsWith('.') || localPart.endsWith('.')) {
            return false;
        }
        
        return true;
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
        errorDiv.setAttribute('data-email-error', 'true');

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
        const existingErrors = inputElement.parentNode.querySelectorAll('[data-email-error="true"]');
        existingErrors.forEach(error => error.remove());
    }

    /**
     * Main validation function - validates and normalizes email address
     * @param {HTMLElement} inputElement - The email input field to validate
     * @param {Object} options - Optional configuration
     * @param {boolean} options.showFeedback - Show visual feedback (default: true)
     * @param {boolean} options.autoFormat - Auto-format the input value (default: true)
     * @returns {Object} Validation result { isValid: boolean, email: string, error: string }
     */
    function validateEmail(inputElement, options = {}) {
        const defaults = {
            showFeedback: true,
            autoFormat: true
        };
        const settings = { ...defaults, ...options };

        // Get raw input value
        const rawEmail = inputElement.value.trim();

        // Empty check
        if (!rawEmail) {
            if (settings.showFeedback && inputElement.hasAttribute('required')) {
                showError(inputElement, 'El correo electrónico es obligatorio.');
                return { isValid: false, email: '', error: 'required' };
            }
            clearError(inputElement);
            return { isValid: true, email: '', error: null };
        }

        // Normalize email
        const normalizedEmail = normalizeEmail(rawEmail);

        // Check for basic issues
        if (!normalizedEmail.includes('@')) {
            const errorMessage = 'El correo debe contener un símbolo @';
            if (settings.showFeedback) {
                showError(inputElement, errorMessage);
            }
            return { isValid: false, email: normalizedEmail, error: 'missing_at' };
        }

        // Split email to check parts
        const parts = normalizedEmail.split('@');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            const errorMessage = 'El correo electrónico no tiene un formato válido.';
            if (settings.showFeedback) {
                showError(inputElement, errorMessage);
            }
            return { isValid: false, email: normalizedEmail, error: 'invalid_structure' };
        }

        // Check domain has TLD
        if (!parts[1].includes('.')) {
            const errorMessage = 'El dominio del correo debe incluir una extensión (ej: .com, .cl)';
            if (settings.showFeedback) {
                showError(inputElement, errorMessage);
            }
            return { isValid: false, email: normalizedEmail, error: 'missing_tld' };
        }

        // Validate full format
        const isValid = isValidEmail(normalizedEmail);

        if (isValid) {
            // Update input value with normalized email
            if (settings.autoFormat) {
                inputElement.value = normalizedEmail;
            }
            
            if (settings.showFeedback) {
                showSuccess(inputElement);
            }
            
            return { isValid: true, email: normalizedEmail, error: null };
        } else {
            const errorMessage = 'Ingrese un correo electrónico válido (ej: usuario@dominio.cl)';
            
            if (settings.showFeedback) {
                showError(inputElement, errorMessage);
            }
            
            return { isValid: false, email: normalizedEmail, error: 'invalid_format' };
        }
    }

    /**
     * Attach real-time validation to input field
     * @param {HTMLElement} inputElement - The email input field
     * @param {Object} options - Validation options
     */
    function attachValidator(inputElement, options = {}) {
        // Validate on blur
        inputElement.addEventListener('blur', function() {
            validateEmail(this, options);
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
                validateEmail(this, options);
            }, 500);
        });
    }

    /**
     * Initialize validation for all email inputs with data-validate-email attribute
     */
    function initAll() {
        const emailInputs = document.querySelectorAll('[data-validate-email]');
        emailInputs.forEach(input => {
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
    window.EmailValidator = {
        validateEmail: validateEmail,
        attachValidator: attachValidator,
        initAll: initAll,
        normalizeEmail: normalizeEmail,
        isValidEmail: isValidEmail
    };

})(window);
