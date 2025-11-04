import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def fix_migrations():
    try:
        # Conectar a la base de datos
        conn = psycopg2.connect(
            dbname='db_santasofia',
            user='postgres',
            password='1234',
            host='localhost',
            port='5432'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("🔍 Verificando estado actual...")
        
        # Ver qué tablas existen
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print("\n📋 Tablas existentes:")
        for table in tables:
            print(f"   - {table[0]}")
        
        # Eliminar registros de migración de login y admin
        print("\n🗑️ Eliminando registros de migración de 'login' y 'admin'...")
        cursor.execute("DELETE FROM django_migrations WHERE app IN ('login', 'admin');")
        print("✅ Registros de migraciones eliminados")
        
        # Eliminar tablas antiguas de login_customuser
        print("\n🗑️ Eliminando tablas antiguas de login...")
        cursor.execute("DROP TABLE IF EXISTS login_customuser CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS login_customuser_groups CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS login_customuser_user_permissions CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS login_usuario CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS login_usuario_groups CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS login_usuario_user_permissions CASCADE;")
        print("✅ Tablas de login eliminadas")
        
        # Eliminar tablas de admin
        print("\n🗑️ Eliminando tablas de admin...")
        cursor.execute("DROP TABLE IF EXISTS django_admin_log CASCADE;")
        print("✅ Tablas de admin eliminadas")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*60)
        print("✅ Base de datos limpia y lista")
        print("="*60)
        print("\n📋 Ahora ejecuta estos comandos:")
        print("1. python manage.py makemigrations login")
        print("2. python manage.py migrate")
        print("3. python manage.py createsuperuser")
        
    except psycopg2.Error as e:
        print(f"❌ Error de PostgreSQL: {e}")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == "__main__":
    fix_migrations()