from django.shortcuts import render

def dashboard(request):
    return render(request, 'index.html')


# Páginas generales
def widgets(request):
    return render(request, 'widgets.html')

def sidebar_style_2(request):
    return render(request, 'sidebar-style-2.html')

def starter_template(request):
    return render(request, 'starter-template.html')

# Sección: Charts
def charts(request):
    return render(request, 'charts/charts.html')

def sparkline(request):
    return render(request, 'charts/sparkline.html')

# Sección: Components
def avatars(request):
    return render(request, 'components/avatars.html')

def buttons(request):
    return render(request, 'components/buttons.html')

def gridsystem(request):
    return render(request, 'components/gridsystem.html')

def panels(request):
    return render(request, 'components/panels.html')

def notifications(request):
    return render(request, 'components/notifications.html')

def sweetalert(request):
    return render(request, 'components/sweetalert.html')

def font_awesome_icons(request):
    return render(request, 'components/font-awesome-icons.html')

def simple_line_icons(request):
    return render(request, 'components/simple-line-icons.html')

def typography(request):
    return render(request, 'components/typography.html')

# Sección: Forms
def forms(request):
    return render(request, 'forms/forms.html')

# Sección: Maps
def googlemaps(request):
    return render(request, 'maps/googlemaps.html')

def jsvectormap(request):
    return render(request, 'maps/jsvectormap.html')

# Sección: Tables
def datatables(request):
    return render(request, 'tables/datatables.html')

def tables(request):
    return render(request, 'tables/tables.html')

def icon_menu(request):
    return render(request, 'tables/icon-menu.html')
