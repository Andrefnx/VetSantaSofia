document.addEventListener('DOMContentLoaded', function () {
    const alerts = document.querySelectorAll('.alert');
    const inputs = document.querySelectorAll('input');

    if (alerts.length > 0) {
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                alerts.forEach(alert => alert.remove());
            });
        });
    }
});