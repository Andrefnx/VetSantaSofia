"""
Middleware para capturar el usuario actual en threadlocals.
Permite que los signals accedan al usuario que realiza la acción.
"""
from threading import local

_thread_locals = local()


def get_current_user():
    """
    Obtiene el usuario actual del thread local.
    
    Returns:
        User o None si no hay usuario en el contexto
    """
    return getattr(_thread_locals, 'user', None)


def set_current_user(user):
    """
    Establece el usuario actual en el thread local.
    
    Args:
        user: Instancia de User
    """
    _thread_locals.user = user


class CurrentUserMiddleware:
    """
    Middleware que captura el usuario actual del request
    y lo almacena en threadlocals para acceso global.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Almacenar usuario antes de procesar el request
        if hasattr(request, 'user') and request.user.is_authenticated:
            set_current_user(request.user)
        else:
            set_current_user(None)
        
        response = self.get_response(request)
        
        # Limpiar después de procesar
        set_current_user(None)
        
        return response
