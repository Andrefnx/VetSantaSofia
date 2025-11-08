from django.contrib.auth.backends import ModelBackend
from .models import CustomUser

class RUTAuthBackend(ModelBackend):
    def authenticate(self, request, rut=None, password=None, **kwargs):
        try:
            user = CustomUser.objects.get(rut=rut)
        except CustomUser.DoesNotExist:
            return None
        if user.check_password(password):
            return user
        return None
