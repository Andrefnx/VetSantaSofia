# hospital/models.py
from django.db import models
from gestion.models import Mascota
from django.utils import timezone
from django.conf import settings
from datetime import date
from dateutil.relativedelta import relativedelta


