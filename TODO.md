# TODO: Implement Filter Functionality for Pacientes by Especie and Sexo

## Tasks
- [x] Modify `hospital/views.py` `pacientes_view` to accept GET parameters for 'especie' and 'sexo', filter the Mascota queryset accordingly, and pass the current filter values to the template context.
- [x] Update `hospital/templates/pacientes/pacientes.html` to set the initial selected values in the filter dropdowns based on the passed filter values from the view.
- [x] Add JavaScript in `hospital/Static/js/pacientes/pacientes.js` to handle changes in the filter dropdowns: update the URL with query parameters and reload the page to apply filters.
- [ ] Test the filtering functionality by selecting different especie and sexo options and verifying the table updates correctly.
