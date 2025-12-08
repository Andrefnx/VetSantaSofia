from django.core.management.base import BaseCommand
from cuentas.models import CustomUser

class Command(BaseCommand):
    help = 'Genera usernames para usuarios existentes'

    def handle(self, *args, **kwargs):
        usuarios = CustomUser.objects.all()
        
        for usuario in usuarios:
            if not usuario.username or usuario.username == '':
                username = usuario.rut.replace('.', '').replace('-', '').replace(' ', '')
                usuario.username = username
                usuario.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Username generado para {usuario.nombre}: {username}')
                )
                