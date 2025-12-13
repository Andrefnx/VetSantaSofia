# 🔧 GUÍA DE INTEGRACIÓN - AGREGAR RUTA EN urls.py

## Objetivo
Integrar la vista `ui_preview` en el sistema de URLs de Django para acceder a la página de vista previa de componentes UI.

---

## 📋 UBICACIÓN DEL ARCHIVO
```
veteriaria/urls.py
```

---

## 🚀 PASOS DE INTEGRACIÓN

### 1. Importar la vista
Agrega esta línea **al principio** de tu archivo `veteriaria/urls.py`:

```python
from veteriaria.views_ui import ui_preview
```

**Ubicación sugerida:** Junto con las otras importaciones de vistas

```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Importar vistas específicas
from veteriaria.views_ui import ui_preview  # ← AGREGAR AQUÍ
```

---

### 2. Agregar la ruta en urlpatterns
Agrega esta línea en la lista `urlpatterns` de `veteriaria/urls.py`:

```python
path('ui/preview/', ui_preview, name='ui_preview'),
```

**Ubicación sugerida:** Al final de las rutas principales (antes de los includes de apps)

```python
urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Rutas de apps
    path('', include('login.urls')),
    path('pacientes/', include('pacientes.urls')),
    path('caja/', include('caja.urls')),
    path('agenda/', include('agenda.urls')),
    path('servicios/', include('servicios.urls')),
    path('inventario/', include('inventario.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('clinica/', include('clinica.urls')),
    path('gestion/', include('gestion.urls')),
    path('hospital/', include('hospital.urls')),
    
    # ← AGREGAR AQUÍ
    path('ui/preview/', ui_preview, name='ui_preview'),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## ✅ VERIFICACIÓN

Después de agregar la ruta, verifica que funcione:

1. **Inicia el servidor Django:**
   ```bash
   python manage.py runserver
   ```

2. **Abre en tu navegador:**
   ```
   http://localhost:8000/ui/preview/
   ```

3. **Deberías ver:**
   - Página de vista previa de componentes UI
   - Botones de todos los tipos
   - Inputs y formularios
   - Tablas
   - Tarjetas
   - Modales (estructura)
   - Alertas
   - Badges
   - Paleta de colores

---

## 🔐 NOTA DE SEGURIDAD

La vista `ui_preview` tiene protección con `@login_required`:

```python
@login_required(login_url='login')
def ui_preview(request):
    # ...
```

**Esto significa:**
- ✅ Solo usuarios autenticados pueden ver la página
- ✅ Si no está autenticado, será redirigido a la página de login
- ✅ Perfect para un ambiente de desarrollo seguro

---

## 📝 CÓDIGO COMPLETO A AGREGAR

Si deseas ver el archivo completo, aquí está el fragmento exacto a insertar en `veteriaria/urls.py`:

```python
# En la sección de imports (arriba del archivo)
from veteriaria.views_ui import ui_preview

# En urlpatterns (en el lugar apropiado)
urlpatterns = [
    # ... otras rutas ...
    path('ui/preview/', ui_preview, name='ui_preview'),
    # ... otras rutas ...
]
```

---

## 🎯 ACCESO A LA PÁGINA

Una vez integrada, puedes acceder a la página de varias formas:

### En Python/Templates:
```python
# En una vista
reverse('ui_preview')  # Retorna: '/ui/preview/'

# En un template
<a href="{% url 'ui_preview' %}">Ver Estándares UI</a>
```

### URL directa:
```
/ui/preview/
```

---

## 📦 ARCHIVOS RELACIONADOS

- **Archivos CSS:**
  - `static/css/base/estilos_generales.css` (nuevo)
  
- **Archivos HTML:**
  - `templates/ui_preview/estandares.html` (nuevo)
  
- **Archivos Python:**
  - `veteriaria/views_ui.py` (nuevo)
  - `veteriaria/urls.py` (MODIFICAR)

---

## ⚡ CONCLUSIÓN

Después de estos dos pasos simples:
1. ✅ Importar la vista
2. ✅ Agregar la ruta

Tu sistema de diseño unificado estará completamente funcional y accesible desde:
```
http://tudominio.com/ui/preview/
```

---

## 🆘 TROUBLESHOOTING

### Error: "view is not callable"
**Causa:** La importación está mal
**Solución:** Verifica que:
- El archivo `veteriaria/views_ui.py` existe
- La función `ui_preview` está definida
- El path de importación es correcto: `from veteriaria.views_ui import ui_preview`

### Error: "404 Not Found"
**Causa:** La ruta no está registrada
**Solución:** Verifica que:
- Agregaste `path('ui/preview/', ui_preview, name='ui_preview')` en `urlpatterns`
- No hay espacios o caracteres especiales en el path
- La URL exacta es `/ui/preview/` (sin barras extra)

### Error: "Login Required"
**Causa:** No estás autenticado
**Solución:** Inicia sesión en tu cuenta antes de acceder a `/ui/preview/`

