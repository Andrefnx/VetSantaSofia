from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class RutBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            return None
        
        # Normalizar el RUT ingresado
        rut = username.strip().replace('.', '').replace(' ', '').upper()
        
        # Si no tiene guión, agregarlo
        if '-' not in rut and len(rut) >= 2:
            rut = f"{rut[:-1]}-{rut[-1]}"
        
        try:
            user = User.objects.get(rut=rut)
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            return None
        
        return None