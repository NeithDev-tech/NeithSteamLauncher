# Neith Web — Supabase Auth (fase de registro)

Esta build conecta el frontend público a Supabase con la Project URL y la Publishable Key.

## 1. Ejecutar el esquema
En Supabase → SQL Editor, ejecuta una sola vez `supabase/schema.sql`.

Esto crea `public.profiles`, activa RLS, crea la política para que cada usuario autenticado lea únicamente su propio perfil y crea el trigger `handle_new_user()` que genera el perfil al registrarse.

## 2. Authentication
- Site URL: `https://neithlauncher.com`
- Email/password: activado
- Confirm email: activado
- Custom SMTP: Brevo (configurado en Supabase; las credenciales SMTP NO pertenecen al ZIP)

## 3. Prueba
1. Publica esta build en Cloudflare.
2. Crea una cuenta desde la web.
3. Abre el correo de confirmación enviado por Brevo.
4. Confirma la cuenta.
5. Inicia sesión.
6. Entra al Dashboard y comprueba nombre, email y estado FREE.
7. Cierra sesión y verifica que `/dashboard/` vuelve a requerir login.

## Seguridad
La Publishable Key de Supabase es pública por diseño. Nunca añadas `sb_secret_*`, `service_role`, contraseñas SMTP ni futuros secretos de Lemon Squeezy al frontend.

Google/Discord, Lemon Squeezy y las licencias están intencionadamente fuera de esta fase.


## Recuperación de contraseña (V7)

En Supabase > Authentication > URL Configuration > Redirect URLs añade exactamente:

https://neithlauncher.com/reset-password/

Flujo:
1. El usuario pulsa `¿Olvidaste tu contraseña?` en el login.
2. La web llama a `resetPasswordForEmail` con `redirectTo=https://neithlauncher.com/reset-password/`.
3. Brevo entrega el correo de recuperación.
4. Supabase abre `/reset-password/` con una sesión temporal de recuperación.
5. `js/reset-password.js` valida la sesión y permite cambiar la contraseña mediante `updateUser`.
6. Tras actualizarla, se cierra la sesión temporal y se vuelve al login.

Los campos de contraseña incluyen un botón accesible para mostrar/ocultar el valor.
