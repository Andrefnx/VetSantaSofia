from django.shortcuts import render
from django.contrib.auth.decorators import login_required


@login_required(login_url='login')
def dashboard(request):
    return render(request, 'dashboard.html', {'usuario': request.user})

# Components views
def avatars(request):
    return render(request, 'kaiadmin/components/avatars.html')

def buttons(request):
    return render(request, 'kaiadmin/components/buttons.html')

def gridsystem(request):
    return render(request, 'kaiadmin/components/gridsystem.html')

def panels(request):
    return render(request, 'kaiadmin/components/panels.html')

def notifications(request):
    return render(request, 'kaiadmin/components/notifications.html')

def typography(request):
    return render(request, 'kaiadmin/components/typography.html')

def font_awesome_icons(request):
    return render(request, 'kaiadmin/components/font-awesome-icons.html')

def simple_line_icons(request):
    return render(request, 'kaiadmin/components/simple-line-icons.html')

def sweetalert(request):
    return render(request, 'kaiadmin/components/sweetalert.html')

# Forms views
def forms(request):
    return render(request, 'kaiadmin/forms/forms.html')

# Tables views
def tables(request):
    return render(request, 'kaiadmin/tables/tables.html')

def datatables(request):
    return render(request, 'kaiadmin/tables/datatables.html')

# Charts views
def charts(request):
    return render(request, 'kaiadmin/charts/charts.html')

def sparkline(request):
    return render(request, 'kaiadmin/charts/sparkline.html')

# Maps views
def googlemaps(request):
    return render(request, 'kaiadmin/maps/googlemaps.html')

def jsvectormap(request):
    return render(request, 'kaiadmin/maps/jsvectormap.html')

# Widgets
def widgets(request):
    return render(request, 'kaiadmin/widgets.html')

# Layout
def icon_menu(request):
    return render(request, 'kaiadmin/icon-menu.html')

def sidebar_style_2(request):
    return render(request, 'kaiadmin/sidebar-style-2.html')