# Neith V23 — correos PREMIUM de Supabase

Esta carpeta incluye plantillas HTML listas para pegar en Supabase. El ZIP de la web no puede aplicar estas plantillas automáticamente: los correos se renderizan desde Supabase Auth.

## 1. Dónde configurarlas

En el panel de Supabase abre tu proyecto y entra en **Authentication → Email Templates**.

En `supabase/email-templates/` tienes estas plantillas:

- `confirmation.html` → Confirm signup
- `invite.html` → Invite user
- `magic_link.html` → Magic Link
- `email_change.html` → Change Email Address
- `recovery.html` → Reset Password
- `reauthentication.html` → Reauthentication

En el mismo apartado de Auth, activa y personaliza las **Security notification emails** cuando estén disponibles para tu proyecto:

- `password_changed_notification.html` → Password Changed
- `email_changed_notification.html` → Email Address Changed
- `phone_changed_notification.html` → Phone Number Changed
- `identity_linked_notification.html` → Sign-in Method Linked
- `identity_unlinked_notification.html` → Sign-in Method Removed
- `verification_method_added_notification.html` → Verification Method Added
- `verification_method_removed_notification.html` → Verification Method Removed

Los asuntos recomendados están en `supabase/email-templates/SUBJECTS.txt`.

## 2. Cómo aplicarlas

Para cada tipo de correo:

1. Abre el archivo HTML correspondiente con un editor de texto.
2. Copia TODO su contenido.
3. Pégalo en el campo **Body / Message** de la plantilla correspondiente en Supabase.
4. Copia el asunto indicado en `SUBJECTS.txt`.
5. Guarda los cambios.
6. Envía una prueba real desde Neith antes de pasar a la siguiente plantilla.

No sustituyas las variables `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`, `{{ .NewEmail }}`, etc. Supabase las reemplaza al enviar el mensaje.

## 3. Recuperación de contraseña

La plantilla `recovery.html` utiliza `{{ .ConfirmationURL }}`. Neith V22+ solicita el correo con `redirectTo` hacia:

`https://neithlauncher.com/recuperar-password/`

En **Authentication → URL Configuration → Redirect URLs** debe seguir autorizada exactamente esa URL.

## 4. Nombre y remitente del correo

La plantilla controla el diseño y el contenido, pero el nombre/dominio del remitente depende del sistema SMTP de Supabase.

Para una experiencia realmente profesional, configura un **Custom SMTP** y usa un remitente del estilo:

- Nombre: `Neith Security`
- Dirección: `security@neithlauncher.com` o `no-reply@neithlauncher.com`

No uses una dirección que no esté autorizada por tu proveedor SMTP/dominio.

## 5. Seguridad

- Los botones de confirmación, invitación, Magic Link, cambio de correo y recuperación usan la URL segura generada por Supabase.
- Neith nunca solicita la contraseña dentro del correo.
- Las notificaciones sensibles incluyen un aviso para actuar si el usuario no reconoce el cambio.
- Las plantillas son bilingües ES/EN para que no dependan del idioma almacenado en el perfil del usuario.

## 6. Prueba recomendada

Después de pegarlas en Supabase, prueba al menos:

1. Crear una cuenta nueva y confirmar el correo.
2. Solicitar “Olvidaste tu contraseña”.
3. Completar el cambio de contraseña.
4. Comprobar que, si activas la notificación “Password Changed”, llega el aviso PREMIUM.
5. Probar Google/Discord si más adelante modificas métodos vinculados.

