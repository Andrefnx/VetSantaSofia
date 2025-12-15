import os
import json
import subprocess
from datetime import datetime
from google.cloud import storage
from google.oauth2 import service_account

# ===============================
# Validación de entorno
# ===============================
required_envs = [
    "DATABASE_URL",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON",
    "GCS_BUCKET_NAME",
]

for env in required_envs:
    if not os.getenv(env):
        raise RuntimeError(f"Falta variable de entorno: {env}")

DATABASE_URL = os.getenv("DATABASE_URL")

# ===============================
# Credenciales Google Cloud
# ===============================
creds_info = json.loads(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"))
credentials = service_account.Credentials.from_service_account_info(creds_info)

client = storage.Client(credentials=credentials)
bucket = client.bucket(os.getenv("GCS_BUCKET_NAME"))

# ===============================
# Nombre del backup
# ===============================
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_filename = f"postgres_backup_{timestamp}.sql"
backup_path = f"/tmp/{backup_filename}"

# ===============================
# Ejecutar pg_dump (USANDO DATABASE_URL)
# ===============================
subprocess.run(
    [
        "pg_dump",
        os.getenv("DATABASE_URL"),
        "-F", "c",
        "-f", backup_path
    ],
    check=True
)

# ===============================
# Subir a GCS
# ===============================
blob = bucket.blob(backup_filename)
blob.upload_from_filename(backup_path)

print(f"✅ Backup creado y subido correctamente: {backup_filename}")
