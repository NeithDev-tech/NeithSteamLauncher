# Neith Admin Center V32 — activación segura

La V32 incluye el panel `/admin/`, pero **no se activa por confiar en el navegador**. Los permisos reales viven en Supabase.

## 1. Instalar backend Admin
En Supabase → SQL Editor, abre y ejecuta entero:

`supabase/admin-center-v32.sql`

## 2. Convertir tu cuenta en SUPERADMIN
Después, en SQL Editor, ejecuta una sola vez sustituyendo el correo por el correo exacto con el que inicias sesión en Neith:

```sql
select public.neith_bootstrap_superadmin('TU_CORREO_DE_NEITH');
```

La función de bootstrap está revocada para `anon` y `authenticated`, por lo que no puede usarse desde el navegador.

## 3. Abrir Admin Center
Cierra sesión y vuelve a entrar, o recarga. Abre el menú de tu cuenta. Si el backend está instalado y tu rol es `superadmin`, aparecerá **ADMIN CENTER**.

También puedes entrar directamente en:

`/admin/`

## Seguridad
- La interfaz oculta controles, pero **la seguridad no depende de eso**.
- Todas las mutaciones administrativas pasan por funciones SQL `SECURITY DEFINER` que verifican el rol del usuario autenticado.
- Las tablas administrativas tienen RLS activado y no poseen políticas públicas de escritura.
- El endpoint del launcher `neith_launcher_public_config()` solo devuelve configuración no secreta.
- Nunca pongas `service_role`, secretos de pagos ni tokens privados en JavaScript.

## Incluido en V32
- Roles: user / premium / staff / admin / superadmin.
- Dashboard Admin.
- Control de versión estable y mínima del launcher.
- Actualización obligatoria.
- Modo mantenimiento remoto.
- Aviso global del launcher.
- Feature flags por audiencia y porcentaje de despliegue.
- Avisos globales segmentados.
- Buscador de usuarios.
- Cambio manual de rol y plan (solo SUPERADMIN).
- Registro de auditoría de acciones administrativas.
- RPC público seguro para que el launcher consulte configuración global en una fase posterior.
