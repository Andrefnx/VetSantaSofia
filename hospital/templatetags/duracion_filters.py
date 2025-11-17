from django import template

register = template.Library()

@register.filter
def formato_duracion(minutos):
    if minutos is None:
        return "-"
    try:
        minutos = int(minutos)
    except:
        return "-"

    if minutos < 60:
        return f"{minutos} min"

    horas = minutos // 60
    mins = minutos % 60

    if mins == 0:
        return f"{horas}h"

    return f"{horas}h {mins} min"
