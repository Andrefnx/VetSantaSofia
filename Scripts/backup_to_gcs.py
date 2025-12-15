import os
import json
import subprocess
from datetime import datetime
from google.cloud import storage
from google.oauth2 import service_account

# === Validación básica de entorno ===
required_envs = [
    "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON",
    "GCS_BUCKET_NAME"
]

for env in required_envs:
    if not os.getenv(env):
        raise RuntimeError(f"Falta variable de entorno: {env}")

# === Cargar credenciales desde variable de entorno ===
creds_info = json.loads(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"))
credentials = service_account.Credentials.from_service_account_info(creds_info)

client = storage.Client(credentials=credentials)
bucket = client.bucket(os.getenv("GCS_BUCKET_NAME"))

# === Nombre del archivo de respaldo ===
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_filename = f"postgres_backup_{timestamp}.sql"
backup_path = f"/tmp/{backup_filename}"

# === Ejecutar pg_dump ===
env = os.environ.copy()
env["PGPASSWORD"] = os.getenv("DB_PASSWORD")

subprocess.run(
    [
        "pg_dump",
        "-h", os.getenv("DB_HOST"),
        "-U", os.getenv("DB_USER"),
        "-d", os.getenv("DB_NAME"),
        "-F", "c",  # formato comprimido
        "-f", backup_path
    ],
    check=True,
    env=env
)

# === Subir a Google Cloud Storage ===
blob = bucket.blob(backup_filename)
blob.upload_from_filename(backup_path)

print(f"✅ Backup creado y subido correctamente: {backup_filename}")
