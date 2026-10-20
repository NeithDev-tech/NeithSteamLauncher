# NEITH WEB — SHOUTBOX R209

## Cambios
- diseño más gaming/premium;
- ancho completo del bloque, alineado con el contenido superior;
- menos altura visual;
- todo en inglés por defecto;
- eliminados los botones de `SIGN IN` y `CREATE ACCOUNT` del shoutbox;
- scroll estable incluso con muchos mensajes;
- el shoutbox solo muestra y conserva los **50 mensajes más recientes**;
- los mensajes con más de **24 horas** se eliminan automáticamente;
- si hay más de 50 mensajes, los más antiguos se purgan automáticamente.

## Importante
Para que la limpieza automática quede exactamente como R209, ejecuta en Supabase:
- `supabase/V34_R209_HOME_SHOUTBOX_RETENTION.sql`

Si no aplicas ese SQL, el diseño nuevo funcionará, pero la política exacta de borrado automático puede no coincidir con R209.
