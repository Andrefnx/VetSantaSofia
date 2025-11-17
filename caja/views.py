from pyexpat.errors import messages
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
import openpyxl
from caja.forms import CajaForm, DetalleCajaFormSet
from caja.models import Caja
import xlsxwriter
from io import BytesIO
from datetime import date, datetime

#openpyxl y xlsxwriter son librerías para excel (que son confiables)
#pero xlswriter es usado para descargar en excel el cierre de caja diaria
#mientras openpyxl es más histórico, es necesario? to be discussed

@login_required
def caja(request):
    hoy = date.today()
    registros = Caja.objects.filter(fecha_caja=hoy)
    return render(request, 'cash_register.html', {
        'registros': registros,
        'fecha': hoy
    })

def anadir_cobro(request):
    if request.method == 'POST':
        form = CajaForm(request.POST)
        formset = DetalleCajaFormSet(request.POST)
        if form.is_valid() and formset.is_valid():
            caja_instance = form.save()
            formset.instance = caja_instance
            formset.save()
            return redirect('caja_diaria')
    else:
        form = CajaForm()
        formset = DetalleCajaFormSet()
    return render(request, 'anadir_cobro.html', {'form': form, 'formset': formset})


def editar_cobro(request, caja_id):
    cobro = get_object_or_404(Caja, id=caja_id)
    if request.method == 'POST':
        form = CajaForm(request.POST, instance=cobro)
        if form.is_valid():
            form.save()
            return redirect('caja_diaria.html')
    else:
        form = CajaForm(instance=cobro)
    return render(request, 'editar_cobro.html', {'form': form, 'cobro': cobro})

def crear_caja(request):
    if request.method == 'POST':
        form = CajaForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('caja_diaria')
    else:
        form = CajaForm()
    return render(request, 'caja_diaria', {'form': form})

def editar_caja(request, pk):
    registro = get_object_or_404(Caja, pk=pk)
    if request.method == 'POST':
        form = CajaForm(request.POST, instance=registro)
        if form.is_valid():
            form.save()
            return redirect('caja_diaria.html')
    else:
        form = CajaForm(instance=registro)
    return render(request, 'caja_diaria.html', {'form': form})

def eliminar_caja(request, pk):
    registro = get_object_or_404(Caja, pk=pk)
    if request.method == 'POST':
        registro.delete()
        return redirect('caja_diaria')
    return render(request, 'caja_confirm_delete.html', {'registro': registro})

def cerrar_caja(request):
    if request.method == 'POST':
        fecha = date.today()
        registros = Caja.objects.filter(fecha_caja=fecha)
        
        total_insumos = sum(reg.valor_ins for reg in registros)
        total_valor = sum(reg.valor_total for reg in registros)
        
        messages.success(request, f'Caja cerrada exitosamente. Total del día: ${total_valor}, Total insumos: ${total_insumos}')
        return redirect('caja_diaria')
    return redirect('caja_diaria')


# registro histórico
def export_billing_totals(request):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT fecha_caja, 
                   SUM(valor_total) AS total_valor, 
                   SUM(valor_ins) AS total_insumos, 
                   GROUP_CONCAT(DISTINCT metodo_pago) AS metodos_pago
            FROM Caja
            GROUP BY fecha_caja
            ORDER BY fecha_caja;
        """)
        results = cursor.fetchall()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Totales por Día"
    headers = ["Fecha", "Total Valor", "Total Insumos", "Veterinarios", "Métodos de Pago"]
    ws.append(headers)

    for row in results:
        ws.append(row)

    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename="totales_diarios.xlsx"'
    wb.save(response)
    return response

#export_caja_diaria utiliza xlswriter y su función es exportar la caja diaria en un archivo excel
# la hoja de excel está configurada para que aparezcan las cosas por separado, fecha y total
def export_caja_diaria(request):
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#F0F0F0',
        'border': 1
    })

    date_format = workbook.add_format({'num_format': 'dd/mm/yyyy'})
    money_format = workbook.add_format({'num_format': '$#,##0'})
    headers = ['Fecha', 'Descripción', 'Valor Insumos', 'Valor Total', 'Veterinario', 'Método de Pago']
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)
    fecha = date.today()
    registros = Caja.objects.filter(fecha_caja=fecha)

    for row, registro in enumerate(registros, start=1):
        worksheet.write(row, 0, registro.fecha_caja, date_format)
        worksheet.write(row, 1, registro.descripcion or '')
        worksheet.write(row, 2, float(registro.valor_ins), money_format)
        worksheet.write(row, 3, float(registro.valor_total), money_format)
        worksheet.write(row, 4, registro.veterinario)
        worksheet.write(row, 5, registro.metodo_pago)

    last_row = len(registros) + 2
    worksheet.write(last_row, 1, 'TOTALES', header_format)
    worksheet.write(last_row, 2, f'=SUM(C2:C{last_row})', money_format)
    worksheet.write(last_row, 3, f'=SUM(D2:D{last_row})', money_format)
    worksheet.set_column('A:A', 12)
    worksheet.set_column('B:B', 30)
    worksheet.set_column('C:D', 15)
    worksheet.set_column('E:F', 20)
    workbook.close()
    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) 
    response['Content-Disposition'] = f'attachment; filename=caja_diaria_{fecha}.xlsx'

@login_required
def reporte(request):
    #no sé si se refiere a lo de la caja diaria así que no me atreví a tocarlo
    return render(request, 'reporte.html')