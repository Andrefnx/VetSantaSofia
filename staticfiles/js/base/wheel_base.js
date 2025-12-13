// static/js/base/wheel_base.js
export function initManageWheel(setCurrentRow) {
    let activeClone = null;

    function closeMenu() {
        if (activeClone) {
            activeClone.classList.add('fade-out');
            setTimeout(() => {
                if (activeClone && activeClone.parentNode) {
                    activeClone.parentNode.removeChild(activeClone);
                }
                activeClone = null;
            }, 180); // igual a la duración de la animación
        }
        document.querySelectorAll('.manage-wheel').forEach(w => w.classList.remove('active'));
        document.removeEventListener('click', outsideClick);
    }

    function outsideClick(e) {
        if (activeClone && !e.target.closest('.manage-options, .manage-wheel button')) {
            closeMenu();
        }
    }

    window.toggleWheel = button => {
        if (activeClone) {
            closeMenu();
            return;
        }

        const options = button.nextElementSibling;
        const rect = button.getBoundingClientRect();
        const clone = options.cloneNode(true);

        clone.classList.add('show');
        clone.style.cssText = `
            position: fixed;
            top: ${rect.bottom + 8}px;
            right: ${window.innerWidth - rect.right}px;
            z-index: 9999;
        `;

        document.body.appendChild(clone);
        activeClone = clone;
        button.closest('.manage-wheel').classList.add('active');

        const row = button.closest('tr');
        const originalButtons = options.querySelectorAll('button');
        clone.querySelectorAll('button').forEach((btn, i) => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                if (setCurrentRow) setCurrentRow(row);
                originalButtons[i].click();
                closeMenu();
            });
        });

        setTimeout(() => document.addEventListener('click', outsideClick), 0);
    };
}
