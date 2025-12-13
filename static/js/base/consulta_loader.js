(function() {
    let consultaLoader = null;
    let alwaysShow = false;

    function ensureConsultaLoader() {
        if (consultaLoader) return consultaLoader;

        const overlay = document.createElement('div');
        overlay.id = 'consultaLoader';
        overlay.className = 'consulta-loader-overlay';

        const card = document.createElement('div');
        card.className = 'consulta-loader-card';

        const spinner = document.createElement('div');
        spinner.className = 'loader loader-consulta';

        const text = document.createElement('div');
        text.className = 'consulta-loader-text';
        text.textContent = 'Cargando consulta...';

        card.appendChild(spinner);
        card.appendChild(text);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        consultaLoader = overlay;
        return consultaLoader;
    }

    function showConsultaLoader() {
        ensureConsultaLoader();
        consultaLoader.style.display = 'flex';
    }

    function hideConsultaLoader() {
        if (!alwaysShow && consultaLoader) {
            consultaLoader.style.display = 'none';
        }
    }

    function setConsultaLoaderAlways(value) {
        alwaysShow = !!value;
    }

    // Expose globally
    window.ensureConsultaLoader = ensureConsultaLoader;
    window.showConsultaLoader = showConsultaLoader;
    window.hideConsultaLoader = hideConsultaLoader;
    window.setConsultaLoaderAlways = setConsultaLoaderAlways;
})();
